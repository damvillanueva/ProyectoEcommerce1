import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {getAvailableUnits, getProductStorageLocation, productMatchesSearch,} from "../utils/inventoryLocationUtils";

const AISLES = ["A", "B", "C", "D", "E", "F"];
const RACKS = [1, 2, 3, 4, 5, 6];
const LEVELS = [1, 2, 3, 4];

function getStatus(item) {
  const available = getAvailableUnits(item);

  if (available <= 0) return "empty";
  if (available <= item.reorderLevel) return "low";
  return "ok";
}

function getStatusClasses(status) {
  if (status === "empty") return "bg-red-500 text-red-50";
  if (status === "low") return "bg-amber-400 text-slate-950";
  return "bg-emerald-400 text-slate-950";
}

function getStatusLabel(status) {
  if (status === "empty") return "Sin stock";
  if (status === "low") return "Stock bajo";
  return "En stock";
}

function matchWarehouse(items, selectedWarehouse, warehouseOptions) {
  if (selectedWarehouse) return selectedWarehouse;

  const firstWarehouseWithProducts = warehouseOptions.find((warehouse) =>
    items.some((item) => item.warehouseCode === warehouse.code)
  );

  return firstWarehouseWithProducts?.code || warehouseOptions[0]?.code || "";
}

function makeCanvasLabel(text, options = {}) {
  const {
    background = "rgba(15, 23, 42, 0.82)",
    color = "#ffffff",
    font = "700 34px Arial",
    paddingX = 26,
    paddingY = 16,
  } = options;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  context.font = font;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + paddingX * 2);
  canvas.height = 72;

  context.font = font;
  context.fillStyle = background;
  context.beginPath();
  drawRoundedRect(context, 0, 0, canvas.width, canvas.height, 14);
  context.fill();
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + paddingY / 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 95, canvas.height / 95, 1);
  return sprite;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, radius);
    return;
  }

  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
}

function addBox(scene, geometry, material, position, userData = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  if (userData) mesh.userData = userData;
  scene.add(mesh);
  return mesh;
}

function Warehouse3DExplorer({
  items,
  onOpenDetail,
  onSelectWarehouse,
  selectedWarehouse,
  warehouseOptions,
}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [aisleFilter, setAisleFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [showLegend, setShowLegend] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const cleanQuery = query.trim();

  const allEnrichedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        availableVisual: getAvailableUnits(item),
        location: getProductStorageLocation(item),
        status: getStatus(item),
      })),
    [items]
  );

  const globalSearchMatch = useMemo(() => {
    if (cleanQuery.length < 2) return null;
    return allEnrichedItems.find((item) => productMatchesSearch(item, cleanQuery)) || null;
  }, [allEnrichedItems, cleanQuery]);

  const activeWarehouseCode =
    globalSearchMatch?.warehouseCode ||
    matchWarehouse(items, selectedWarehouse, warehouseOptions);

  const enrichedItems = useMemo(
    () => allEnrichedItems.filter((item) => item.warehouseCode === activeWarehouseCode),
    [activeWarehouseCode, allEnrichedItems]
  );

  const activeWarehouseMeta = useMemo(
    () =>
      warehouseOptions.find((warehouse) => warehouse.code === activeWarehouseCode) || {
        code: activeWarehouseCode,
        name: activeWarehouseCode || "Bodega",
      },
    [activeWarehouseCode, warehouseOptions]
  );

  const zones = useMemo(
    () =>
      Array.from(new Set(enrichedItems.map((item) => item.location.zone)))
        .filter(Boolean)
        .sort(),
    [enrichedItems]
  );

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      const matchesQuery = !cleanQuery || productMatchesSearch(item, cleanQuery);
      const matchesZone = !zoneFilter || item.location.zone === zoneFilter;
      const matchesAisle = !aisleFilter || item.location.aisle === aisleFilter;
      const matchesLevel =
        !levelFilter || String(item.location.level) === String(levelFilter);

      return matchesQuery && matchesZone && matchesAisle && matchesLevel;
    });
  }, [aisleFilter, cleanQuery, enrichedItems, levelFilter, zoneFilter]);

  const hasActiveFilters = Boolean(cleanQuery || zoneFilter || aisleFilter || levelFilter);
  const selectedPool = hasActiveFilters ? filteredItems : enrichedItems;
  const selectedItem =
    selectedPool.find((item) => item.sku === selectedSku) || selectedPool[0] || null;

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07111f");
    scene.fog = new THREE.Fog("#07111f", 13, 28);
    container.__scene = scene;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(8.5, 7.2, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 7;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.4, 0);
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight("#b7c7e8", 1.25);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#ffffff", 2.4);
    keyLight.position.set(5, 9, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const blueLight = new THREE.PointLight("#38bdf8", 1.6, 16);
    blueLight.position.set(-5.5, 3.6, -3.8);
    scene.add(blueLight);

    const greenLight = new THREE.PointLight("#22c55e", 1.2, 10);
    greenLight.position.set(4.2, 2.8, 2.5);
    scene.add(greenLight);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#263241",
      metalness: 0.12,
      roughness: 0.78,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 9.6), floorMaterial);
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    scene.add(floor);

    const lineMaterial = new THREE.LineBasicMaterial({ color: "#d8a34b", transparent: true, opacity: 0.6 });
    for (let index = 0; index < AISLES.length; index += 1) {
      const x = -5.2 + index * 2.08;
      const points = [
        new THREE.Vector3(x - 0.58, 0.02, -4.25),
        new THREE.Vector3(x - 0.58, 0.02, 4.25),
        new THREE.Vector3(x + 0.58, 0.02, 4.25),
        new THREE.Vector3(x + 0.58, 0.02, -4.25),
        new THREE.Vector3(x - 0.58, 0.02, -4.25),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geometry, lineMaterial));
    }

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#111827",
      roughness: 0.86,
      metalness: 0.2,
      transparent: true,
      opacity: showWalls ? 1 : 0,
    });
    addBox(scene, new THREE.BoxGeometry(14.2, 2.7, 0.28), wallMaterial, { x: 0, y: 1.28, z: -4.88 });
    addBox(scene, new THREE.BoxGeometry(0.28, 2.35, 9.8), wallMaterial, { x: -7.25, y: 1.1, z: 0 });
    addBox(scene, new THREE.BoxGeometry(0.28, 2.35, 9.8), wallMaterial, { x: 7.25, y: 1.1, z: 0 });

    const doorMaterial = new THREE.MeshStandardMaterial({ color: "#030712", roughness: 0.75 });
    [-4.4, -1.2, 2.1, 5.1].forEach((x) => {
      addBox(scene, new THREE.BoxGeometry(0.5, 1.5, 0.08), doorMaterial, { x, y: 0.74, z: -4.72 });
    });

    const postMaterial = new THREE.MeshStandardMaterial({ color: "#1e3a5f", metalness: 0.45, roughness: 0.35 });
    const beamMaterial = new THREE.MeshStandardMaterial({ color: "#d97706", metalness: 0.22, roughness: 0.5 });
    const boxMaterials = [
      new THREE.MeshStandardMaterial({ color: "#b88d4b", roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: "#d7dce5", roughness: 0.62 }),
      new THREE.MeshStandardMaterial({ color: "#8a5f37", roughness: 0.8 }),
    ];
    const itemMaterial = new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#052e16", roughness: 0.5 });
    const lowMaterial = new THREE.MeshStandardMaterial({ color: "#facc15", emissive: "#422006", roughness: 0.55 });
    const emptyMaterial = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#450a0a", roughness: 0.55 });
    const mutedMaterial = new THREE.MeshStandardMaterial({ color: "#475569", transparent: true, opacity: 0.45, roughness: 0.7 });
    const selectedMaterial = new THREE.MeshStandardMaterial({
      color: "#34d399",
      emissive: "#16a34a",
      emissiveIntensity: 0.75,
      roughness: 0.38,
    });
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: "#22c55e",
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });

    const itemBySlot = new Map();
    enrichedItems.forEach((item) => {
      const key = `${item.location.aisle}-${item.location.rack}`;
      if (!itemBySlot.has(key)) itemBySlot.set(key, []);
      itemBySlot.get(key).push(item);
    });
    const filteredSkuSet = new Set(filteredItems.map((item) => item.sku));
    const clickable = [];

    AISLES.forEach((aisle, aisleIndex) => {
      const x = -5.2 + aisleIndex * 2.08;

      const aisleLabel = makeCanvasLabel(aisle, {
        background: "rgba(45, 39, 130, 0.9)",
        color: "#dbeafe",
        font: "800 42px Arial",
      });
      aisleLabel.position.set(x, 2.1, -4.25);
      scene.add(aisleLabel);

      RACKS.forEach((rack) => {
        const z = -3.25 + (rack - 1) * 1.3;
        const rackGroup = new THREE.Group();
        rackGroup.position.set(x, 0, z);
        scene.add(rackGroup);

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.96), beamMaterial);
        base.position.y = 0.08;
        base.castShadow = true;
        rackGroup.add(base);

        for (let px of [-0.38, 0.38]) {
          for (let pz of [-0.43, 0.43]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.5, 0.055), postMaterial);
            post.position.set(px, 0.78, pz);
            post.castShadow = true;
            rackGroup.add(post);
          }
        }

        for (let level = 1; level <= 4; level += 1) {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.98), beamMaterial);
          shelf.position.y = level * 0.34;
          shelf.castShadow = true;
          rackGroup.add(shelf);
        }

        for (let level = 1; level <= 3; level += 1) {
          for (let column = 0; column < 3; column += 1) {
            const filler = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.24), boxMaterials[(rack + level + column) % boxMaterials.length]);
            filler.position.set(-0.24 + column * 0.24, 0.14 + level * 0.34, -0.15 + ((column + rack) % 2) * 0.28);
            filler.castShadow = true;
            rackGroup.add(filler);
          }
        }

        const slotItems = itemBySlot.get(`${aisle}-${rack}`) || [];
        slotItems.forEach((item, itemIndex) => {
          const isSelected = item.sku === selectedItem?.sku;
          const isFilteredOut = hasActiveFilters && !filteredSkuSet.has(item.sku);
          let material = itemMaterial;

          if (isSelected) material = selectedMaterial;
          else if (isFilteredOut) material = mutedMaterial;
          else if (item.status === "low") material = lowMaterial;
          else if (item.status === "empty") material = emptyMaterial;

          const offsetX = (item.location.position % 3 - 1) * 0.23;
          const offsetZ = Math.floor((item.location.position - 1) / 3) * 0.12 - 0.18;
          const y = Math.min(1.42, 0.18 + item.location.level * 0.32 + itemIndex * 0.035);
          const productMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.38), material);
          productMesh.position.set(offsetX, y, offsetZ);
          productMesh.castShadow = true;
          productMesh.userData = { sku: item.sku };
          rackGroup.add(productMesh);
          clickable.push(productMesh);

          if (isSelected) {
            const highlight = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.5, 0.62), highlightMaterial);
            highlight.position.copy(productMesh.position);
            rackGroup.add(highlight);

            const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.68, 0.5, 0.62));
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: "#86efac", linewidth: 2 })
            );
            line.position.copy(productMesh.position);
            rackGroup.add(line);

            const selectedLabel = makeCanvasLabel(item.location.code, {
              background: "rgba(22, 163, 74, 0.88)",
              color: "#dcfce7",
              font: "800 28px Arial",
            });
            selectedLabel.position.set(0, 2.05, 0);
            rackGroup.add(selectedLabel);
          }
        });
      });

      const floorLabel = makeCanvasLabel(String(aisleIndex + 1).padStart(2, "0"), {
        background: "rgba(49, 46, 129, 0.86)",
        color: "#dbeafe",
        font: "800 30px Arial",
      });
      floorLabel.position.set(x, 0.14, 4.65);
      floorLabel.rotation.x = -Math.PI / 2;
      scene.add(floorLabel);
    });

    const zoneLabelA = makeCanvasLabel("ZONA A", {
      background: "rgba(30, 41, 59, 0.9)",
      color: "#bfdbfe",
      font: "800 26px Arial",
    });
    zoneLabelA.position.set(-6.25, 1.1, -2.6);
    scene.add(zoneLabelA);

    const zoneLabelB = makeCanvasLabel("ZONA B", {
      background: "rgba(30, 41, 59, 0.9)",
      color: "#bfdbfe",
      font: "800 26px Arial",
    });
    zoneLabelB.position.set(-6.25, 1.1, 1.9);
    scene.add(zoneLabelB);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function handlePointerDown(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickable, false)[0];

      if (hit?.object?.userData?.sku) {
        setSelectedSku(hit.object.userData.sku);
      }
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    function resize() {
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 900;
      const height = rect.height || container.clientHeight || 560;

      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(resize);
    });
    observer.observe(container);

    requestAnimationFrame(resize);
    setTimeout(resize, 100);

    let animationFrame = 0;
    function animate() {
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      container.innerHTML = "";
    };
  }, [aisleFilter, enrichedItems, filteredItems, hasActiveFilters, levelFilter, selectedItem, zoneFilter]);

  // Efecto para ocultar/mostrar paredes sin recargar toda la escena
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = container.__scene;
    if (!scene) return;

    scene.traverse((object) => {
      if (object.isMesh && object.material) {
        // Identificar paredes por su color (0x111827)
        const colorHex = object.material.color?.getHex();
        if (colorHex === 0x111827 && object.geometry) {
          // Verificar que sea una de las paredes grandes (no las puertas)
          const width = object.geometry.parameters?.width || 0;
          const height = object.geometry.parameters?.height || 0;
          const depth = object.geometry.parameters?.depth || 0;

          // Solo las paredes grandes (14.2, 0.28, 2.7 etc.)
          if (width > 10 || height > 2 || depth > 8) {
            object.material.transparent = true;
            object.material.opacity = showWalls ? 1 : 0;
            object.material.needsUpdate = true;
          }
        }
      }
    });
  }, [showWalls]);

  function resetCamera() {
    cameraRef.current?.position.set(8.5, 7.2, 10);
    controlsRef.current?.target.set(0, 0.4, 0);
    controlsRef.current?.update();
  }

  function topView() {
    cameraRef.current?.position.set(0, 12, 0.05);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }

  function handleWarehouseChange(value) {
    setSelectedSku("");
    onSelectWarehouse(value);
  }

  function handleQueryChange(value) {
    setQuery(value);

    const match =
      value.trim().length >= 2
        ? allEnrichedItems.find((item) => productMatchesSearch(item, value))
        : null;

    setSelectedSku(match?.sku || "");
    if (match && match.warehouseCode !== selectedWarehouse) {
      onSelectWarehouse(match.warehouseCode);
    }
  }

  const selectedStatus = selectedItem ? getStatus(selectedItem) : "empty";
  const selectedAvailable = selectedItem ? getAvailableUnits(selectedItem) : 0;
  const searchFeedback =
    cleanQuery && globalSearchMatch
      ? `${globalSearchMatch.productName} ubicado en ${globalSearchMatch.location.code}. Vista actual: ${activeWarehouseMeta.name}.`
      : cleanQuery
      ? "No hay coincidencias para esa busqueda en el inventario."
      : "";

  return (
    <section className="mb-8 w-full">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-sky-300">Vista 3D de Bodega</p>
          <h2 className="mt-1 text-3xl font-black text-white">Ubicacion exacta de productos</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-400">
            Busca por nombre, SKU o ubicacion fisica y selecciona un rack para ver stock, zona, pasillo, nivel y posicion.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowLegend((current) => !current)}
            className="rounded-xl border border-indigo-300/30 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-500/20"
          >
            Leyenda
          </button>
          <button
            type="button"
            onClick={() => setShowWalls((current) => !current)}
            className="rounded-xl border border-indigo-300/30 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-500/20"
          >
            {showWalls ? "Ocultar paredes" : "Mostrar paredes"}
          </button>
          <button
            type="button"
            onClick={topView}
            className="rounded-xl border border-indigo-300/30 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-500/20"
          >
            Plano superior
          </button>
          <button
            type="button"
            onClick={resetCamera}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            Reset camara
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Buscar por codigo o nombre de producto..."
          className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-400"
        />
        <select
          value={activeWarehouseCode}
          onChange={(event) => handleWarehouseChange(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"
        >
          {warehouseOptions.map((warehouse) => (
            <option key={warehouse.code} value={warehouse.code}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(event) => setZoneFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Todas las zonas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              Zona {zone}
            </option>
          ))}
        </select>
        <select
          value={aisleFilter}
          onChange={(event) => setAisleFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Todos los pasillos</option>
          {AISLES.map((aisle) => (
            <option key={aisle} value={aisle}>
              Pasillo {aisle}
            </option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Todos los niveles</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              Nivel {level}
            </option>
          ))}
        </select>
      </div>

      {searchFeedback && (
        <div className="mb-4 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm font-black text-sky-100">
          {searchFeedback}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4 w-full">
        {/* Contenedor 3D - ocupa todo el espacio disponible */}
        <div className="flex-1 min-h-[500px]">
          <div className="relative w-full h-[calc(100vh-480px)] min-h-[500px] rounded-2xl border border-white/10 bg-slate-950 overflow-hidden">
            <div ref={mountRef} className="w-full h-full" />
            <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur">
              <p className="text-xs font-black uppercase text-slate-400">Controles</p>
              <p className="mt-1 text-xs font-semibold text-slate-300">
                Arrastra para rotar, rueda para zoom, clic para seleccionar.
              </p>
            </div>
            {showLegend && (
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-300">
                  <LegendDot className="bg-emerald-400" label="En stock" />
                  <LegendDot className="bg-amber-400" label="Stock bajo" />
                  <LegendDot className="bg-red-500" label="Sin stock" />
                  <LegendDot className="bg-slate-500" label="Fuera de filtro" />
                  <LegendDot className="bg-violet-500" label="Seleccionado" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral - ancho fijo */}
        <aside className="xl:w-[340px] w-full rounded-2xl border border-white/10 bg-slate-900/90 p-5 text-white h-[calc(100vh-480px)] min-h-[500px] overflow-y-auto">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-300">Detalle de ubicacion</p>
              <h3 className="mt-2 text-3xl font-black text-emerald-300">
                {selectedItem?.location.code || "Sin seleccion"}
              </h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClasses(selectedStatus)}`}>
              {getStatusLabel(selectedStatus)}
            </span>
          </div>

          {selectedItem ? (
            <>
              <div className="grid grid-cols-2 gap-3 border-b border-white/10 pb-5 text-sm">
                <DetailLine label="Zona" value={`Zona ${selectedItem.location.zone}`} />
                <DetailLine label="Pasillo" value={selectedItem.location.aisle} />
                <DetailLine label="Rack" value={selectedItem.location.rack} />
                <DetailLine label="Nivel" value={selectedItem.location.level} />
                <DetailLine label="Posicion" value={selectedItem.location.position} />
                <DetailLine label="Bodega" value={selectedItem.location.warehouse.city} />
              </div>

              <div className="border-b border-white/10 py-5">
                <p className="mb-3 text-sm font-black text-slate-300">Producto</p>
                <div className="flex items-center gap-4">
                  <ProductImage imageUrl={selectedItem.imageUrl} name={selectedItem.productName} />
                  <div className="min-w-0">
                    <p className="truncate font-black">{selectedItem.productName}</p>
                    <p className="mt-1 text-sm font-bold text-slate-400">SKU: {selectedItem.sku}</p>
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      Categoria: {selectedItem.category || "General"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 py-5">
                <p className="text-sm font-black text-slate-300">Stock disponible</p>
                <p className="mt-2 text-5xl font-black text-emerald-300">
                  {selectedAvailable}
                  <span className="ml-2 text-base font-bold text-slate-400">unidades</span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <DetailLine label="Stock minimo" value={selectedItem.reorderLevel} />
                  <DetailLine label="Reservado" value={selectedItem.reservedQuantity} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenDetail(selectedItem)}
                className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
              >
                Ver detalle del producto
              </button>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-slate-950/60 p-4 text-sm font-bold text-slate-400">
              No hay productos para mostrar en esta bodega.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function DetailLine({ label, value }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-100">{value}</p>
    </div>
  );
}

function ProductImage({ imageUrl, name }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-2xl font-black text-slate-300">
      {String(name || "P").charAt(0).toUpperCase()}
    </div>
  );
}

export default Warehouse3DExplorer;
