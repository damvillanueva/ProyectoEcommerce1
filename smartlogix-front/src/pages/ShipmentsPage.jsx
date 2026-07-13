import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ShipmentTrackingMap from "../components/ShipmentTrackingMap";
import PageContainer from "../layout/PageContainer";
import { geocodeAddress } from "../services/geocodingService";
import {
  editShipment,
  loadShipmentService,
  removeShipment,
  saveShipment,
} from "../services/shipmentService";
import {
  TRACKING_ORIGIN,
  buildRouteCoordinates,
  buildShipmentTimeline,
  formatShipmentDate,
  getOpenStreetMapDirectionsUrl,
  getOpenStreetMapSearchUrl,
  getShipmentProgress,
  getShipmentStatusMeta,
  isShipmentDelayed,
} from "../utils/shipmentTrackingUtils";

const DEFAULT_ORDER_NUMBER = "ORD-DEMO-001";
const DEFAULT_DESTINATION_STREET = "Musa 2099";
const DEFAULT_DESTINATION_COMMUNE = "Puente Alto";
const DEFAULT_TOTAL_UNITS = 1;

function composeDestinationAddress(street, commune) {
  const cleanStreet = (street || "").trim();
  const cleanCommune = (commune || "").trim();

  if (!cleanStreet) {
    return cleanCommune;
  }

  if (!cleanCommune) {
    return cleanStreet;
  }

  return `${cleanStreet}, ${cleanCommune}`;
}

function splitDestinationAddress(address) {
  const cleanAddress = (address || "").trim();

  if (!cleanAddress) {
    return {
      street: DEFAULT_DESTINATION_STREET,
      commune: DEFAULT_DESTINATION_COMMUNE,
    };
  }

  const [street, ...rest] = cleanAddress.split(",");

  return {
    street: street?.trim() || DEFAULT_DESTINATION_STREET,
    commune: rest.join(",").trim() || "",
  };
}

function toTitleCase(value) {
  return (value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildShipmentUpdatePayload(shipment, nextStatus) {
  return {
    orderNumber: shipment.orderNumber || DEFAULT_ORDER_NUMBER,
    destinationAddress:
      shipment.destinationAddress ||
      composeDestinationAddress(
        DEFAULT_DESTINATION_STREET,
        DEFAULT_DESTINATION_COMMUNE
      ),
    totalUnits: shipment.totalUnits ?? DEFAULT_TOTAL_UNITS,
    status: nextStatus,
  };
}

function ShipmentPage() {
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState(DEFAULT_ORDER_NUMBER);
  const [destinationStreet, setDestinationStreet] = useState(
    DEFAULT_DESTINATION_STREET
  );
  const [destinationCommune, setDestinationCommune] = useState(
    DEFAULT_DESTINATION_COMMUNE
  );
  const [totalUnits, setTotalUnits] = useState(DEFAULT_TOTAL_UNITS);
  const [editingTrackingCode, setEditingTrackingCode] = useState(null);
  const [editingShipmentStatus, setEditingShipmentStatus] = useState(null);
  const [selectedTrackingCode, setSelectedTrackingCode] = useState(null);
  const [trackingOrigin, setTrackingOrigin] = useState(TRACKING_ORIGIN);
  const [statusUpdatingTrackingCode, setStatusUpdatingTrackingCode] = useState(null);
  const [trackingMapState, setTrackingMapState] = useState({
    loading: false,
    destination: null,
    error: "",
  });

  async function loadShipments() {
    try {
      setLoading(true);
      const data = await loadShipmentService();
      setShipments(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los envios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    if (!shipments.length) {
      setSelectedTrackingCode(null);
      return;
    }

    const shipmentStillExists = shipments.some(
      (shipment) => shipment.trackingCode === selectedTrackingCode
    );

    if (!selectedTrackingCode || !shipmentStillExists) {
      setSelectedTrackingCode(shipments[0].trackingCode);
    }
  }, [shipments, selectedTrackingCode]);

  useEffect(() => {
    let ignore = false;

    async function loadTrackingOrigin() {
      try {
        const origin = await geocodeAddress(TRACKING_ORIGIN.query, {
          defaultCity: "",
          defaultRegion: "Region Metropolitana",
        });

        if (ignore || !origin) {
          return;
        }

        setTrackingOrigin({
          ...TRACKING_ORIGIN,
          lat: origin.lat,
          lng: origin.lng,
        });
      } catch (originError) {
        console.error(originError);
      }
    }

    loadTrackingOrigin();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedShipment =
    shipments.find((shipment) => shipment.trackingCode === selectedTrackingCode) ||
    null;
  const selectedDestinationInfo = splitDestinationAddress(
    selectedShipment?.destinationAddress
  );
  const selectedDestinationBadge =
    toTitleCase(selectedDestinationInfo.commune) || "Comuna del cliente";
  const selectedShipmentStatus = getShipmentStatusMeta(selectedShipment?.status);
  const selectedShipmentTimeline = buildShipmentTimeline(selectedShipment?.status);
  const routeCoordinates = buildRouteCoordinates(
    trackingOrigin,
    trackingMapState.destination
  );
  const trackingProgress = getShipmentProgress(selectedShipment?.status);
  const canMarkInTransit = selectedShipment?.status === "PLANNED";
  const canMarkDelivered = selectedShipment?.status === "IN_TRANSIT";
  const isUpdatingSelectedStatus =
    statusUpdatingTrackingCode === selectedShipment?.trackingCode;
  const trackingMapLink = trackingMapState.destination
    ? getOpenStreetMapDirectionsUrl(trackingOrigin, trackingMapState.destination)
    : getOpenStreetMapSearchUrl(selectedShipment?.destinationAddress);

  useEffect(() => {
    let ignore = false;

    async function loadTrackingMap() {
      if (!selectedShipment?.destinationAddress) {
        setTrackingMapState({
          loading: false,
          destination: null,
          error: "",
        });
        return;
      }

      setTrackingMapState({
        loading: true,
        destination: null,
        error: "",
      });

      try {
        const usesCommuneHint = selectedShipment.destinationAddress.includes(",");
        const destination = await geocodeAddress(selectedShipment.destinationAddress, {
          defaultCity: "",
          defaultRegion: usesCommuneHint ? "" : "Region Metropolitana",
          defaultCountry: "Chile",
        });

        if (ignore) {
          return;
        }

        if (!destination) {
          setTrackingMapState({
            loading: false,
            destination: null,
            error: "No se pudo ubicar la direccion de destino en el mapa.",
          });
          return;
        }

        setTrackingMapState({
          loading: false,
          destination,
          error: "",
        });
      } catch (mapError) {
        console.error(mapError);

        if (ignore) {
          return;
        }

        setTrackingMapState({
          loading: false,
          destination: null,
          error: "No se pudo cargar el mapa del envio en este momento.",
        });
      }
    }

    loadTrackingMap();

    return () => {
      ignore = true;
    };
  }, [selectedShipment?.trackingCode, selectedShipment?.destinationAddress]);

  async function handleCreateShipment(event) {
    event.preventDefault();

    const cleanOrderNumber = orderNumber.trim();
    const cleanStreet = destinationStreet.trim();
    const cleanCommune = destinationCommune.trim();
    const parsedTotalUnits = Number(totalUnits);

    if (!cleanOrderNumber) {
      setError("Ingresa un numero de pedido.");
      return;
    }

    if (!cleanStreet) {
      setError("Ingresa la calle de destino.");
      return;
    }

    if (!cleanCommune) {
      setError("Ingresa la comuna de destino.");
      return;
    }

    if (!Number.isFinite(parsedTotalUnits) || parsedTotalUnits <= 0) {
      setError("Ingresa una cantidad valida de unidades.");
      return;
    }

    const shipmentData = {
      orderNumber: cleanOrderNumber,
      destinationAddress: composeDestinationAddress(cleanStreet, cleanCommune),
      totalUnits: parsedTotalUnits,
      ...(editingTrackingCode && editingShipmentStatus
        ? { status: editingShipmentStatus }
        : {}),
    };

    try {
      if (editingTrackingCode) {
        await editShipment(editingTrackingCode, shipmentData);
      } else {
        await saveShipment(shipmentData);
      }

      await loadShipments();
      resetForm();
      setError("");
    } catch (err) {
      console.error(err);
      setError(
        editingTrackingCode
          ? "No se pudo actualizar el envio."
          : "No se pudo crear el envio. Revisa JWT o servicios activos."
      );
    }
  }

  function handleEdit(shipment) {
    const parsedAddress = splitDestinationAddress(shipment.destinationAddress);

    setEditingTrackingCode(shipment.trackingCode);
    setEditingShipmentStatus(shipment.status);
    setOrderNumber(shipment.orderNumber);
    setDestinationStreet(parsedAddress.street);
    setDestinationCommune(parsedAddress.commune);
    setTotalUnits(shipment.totalUnits || DEFAULT_TOTAL_UNITS);
  }

  function resetForm() {
    setEditingTrackingCode(null);
    setEditingShipmentStatus(null);
    setOrderNumber(DEFAULT_ORDER_NUMBER);
    setDestinationStreet(DEFAULT_DESTINATION_STREET);
    setDestinationCommune(DEFAULT_DESTINATION_COMMUNE);
    setTotalUnits(DEFAULT_TOTAL_UNITS);
  }

  async function handleShipmentStatusChange(shipment, nextStatus) {
    if (!shipment?.trackingCode) {
      return;
    }

    try {
      setStatusUpdatingTrackingCode(shipment.trackingCode);
      setError("");

      await editShipment(
        shipment.trackingCode,
        buildShipmentUpdatePayload(shipment, nextStatus)
      );

      if (editingTrackingCode === shipment.trackingCode) {
        setEditingShipmentStatus(nextStatus);
      }

      await loadShipments();
    } catch (statusError) {
      console.error(statusError);
      setError("No se pudo actualizar el estado del envio.");
    } finally {
      setStatusUpdatingTrackingCode(null);
    }
  }

  async function handleDelete(trackingCode) {
    if (!window.confirm(`Eliminar envio ${trackingCode}?`)) return;

    try {
      await removeShipment(trackingCode);
      if (editingTrackingCode === trackingCode) {
        resetForm();
      }
      await loadShipments();
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el envio.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <PageContainer>
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <Navbar />

          <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">Envios</h1>

              <p className="text-slate-300">
                Seguimiento visual y trazabilidad de despachos desde la bodega central.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-2xl p-5 mb-6">
                <p className="text-red-200 font-semibold">{error}</p>
              </div>
            )}

            <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6 mb-8">
              <h2 className="text-2xl font-black mb-2">
                {editingTrackingCode ? "Actualizar envio" : "Crear envio"}
              </h2>

              <p className="text-slate-400 mb-3">
                Ruta estimada desde la bodega central hasta el destino.
              </p>

              <p className="text-xs text-sky-300 mb-6">
                Origen fijo del despacho: Bodega Central SmartLogix.
              </p>

              <form
                onSubmit={handleCreateShipment}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Numero de pedido"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={destinationStreet}
                  onChange={(event) => setDestinationStreet(event.target.value)}
                  placeholder="Ej: Musa 2099"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={destinationCommune}
                  onChange={(event) => setDestinationCommune(event.target.value)}
                  placeholder="Comuna destino"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  min="1"
                  type="number"
                  value={totalUnits}
                  onChange={(event) => setTotalUnits(event.target.value)}
                  placeholder="Total unidades"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-indigo-500 transition"
                >
                  {editingTrackingCode ? "Actualizar envio" : "Crear envio"}
                </button>

                {editingTrackingCode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl bg-white/10 px-6 py-3 text-white font-bold hover:bg-white/20 transition"
                  >
                    Cancelar edicion
                  </button>
                )}
              </form>
            </div>

            {loading && (
              <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5">
                <p className="text-slate-300 animate-pulse">Cargando envios...</p>
              </div>
            )}

            {!loading && (
              <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-black mb-6">Listado de envios</h2>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-300 uppercase text-sm">
                        <th className="p-4 text-left rounded-l-xl">Tracking</th>
                        <th className="p-4 text-left">Pedido</th>
                        <th className="p-4 text-left">Transportista</th>
                        <th className="p-4 text-left">Direccion</th>
                        <th className="p-4 text-left">Entrega estimada</th>
                        <th className="p-4 text-left">Estado</th>
                        <th className="p-4 text-left rounded-r-xl">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {shipments.length === 0 && (
                        <tr>
                          <td colSpan="7" className="p-6 text-center text-slate-400">
                            No hay envios registrados todavia.
                          </td>
                        </tr>
                      )}

                      {shipments.map((shipment) => {
                        const shipmentStatus = getShipmentStatusMeta(shipment.status);

                        return (
                          <tr
                            key={shipment.trackingCode}
                            className="border-b border-white/10 hover:bg-white/5 transition"
                          >
                            <td className="p-4 font-bold">{shipment.trackingCode}</td>
                            <td className="p-4">{shipment.orderNumber}</td>
                            <td className="p-4">{shipment.carrier}</td>
                            <td className="p-4">{shipment.destinationAddress}</td>
                            <td className="p-4">
                              {formatShipmentDate(shipment.estimatedDeliveryDate)}
                            </td>
                            <td className="p-4">
                              <span
                                className={`rounded-full px-3 py-1 font-bold ${shipmentStatus.classes}`}
                              >
                                {shipmentStatus.label}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    setSelectedTrackingCode(shipment.trackingCode)
                                  }
                                  className={`rounded-xl px-4 py-2 text-white font-bold transition ${
                                    selectedTrackingCode === shipment.trackingCode
                                      ? "bg-sky-500 hover:bg-sky-400"
                                      : "bg-slate-700 hover:bg-slate-600"
                                  }`}
                                >
                                  Rastrear
                                </button>

                                <button
                                  onClick={() => handleEdit(shipment)}
                                  className="rounded-xl bg-amber-500 px-4 py-2 text-white font-bold hover:bg-amber-400 transition"
                                >
                                  Editar
                                </button>

                                <button
                                  onClick={() => handleDelete(shipment.trackingCode)}
                                  className="rounded-xl bg-red-500 px-4 py-2 text-white font-bold hover:bg-red-400 transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedShipment && (
                  <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6">
                    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                        <div>
                          <p className="text-sm uppercase tracking-[0.28em] text-sky-300 mb-2">
                            Seguimiento visual del envio
                          </p>
                          <h3 className="text-3xl font-black">
                            {selectedShipment.trackingCode}
                          </h3>
                          <p className="text-slate-400 mt-2">
                            Mapa, estado actual y alerta por atraso del despacho.
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-4 py-2 font-bold self-start ${selectedShipmentStatus.classes}`}
                        >
                          {selectedShipmentStatus.label}
                        </span>
                      </div>

                      <div className="mb-6 flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 font-semibold text-sky-100">
                          Origen: {trackingOrigin.label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-slate-100">
                          Destino: {selectedDestinationBadge}
                        </span>
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-100">
                          Estado: {selectedShipmentStatus.label}
                        </span>
                      </div>

                      <div className="mb-6 flex flex-wrap gap-3">
                        {canMarkInTransit && (
                          <button
                            type="button"
                            onClick={() =>
                              handleShipmentStatusChange(selectedShipment, "IN_TRANSIT")
                            }
                            disabled={isUpdatingSelectedStatus}
                            className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUpdatingSelectedStatus
                              ? "Actualizando..."
                              : "Marcar en ruta"}
                          </button>
                        )}

                        {canMarkDelivered && (
                          <button
                            type="button"
                            onClick={() =>
                              handleShipmentStatusChange(selectedShipment, "DELIVERED")
                            }
                            disabled={isUpdatingSelectedStatus}
                            className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUpdatingSelectedStatus
                              ? "Actualizando..."
                              : "Marcar entregado"}
                          </button>
                        )}

                        {selectedShipment?.status === "DELIVERED" && (
                          <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-semibold text-emerald-100">
                            Entrega final registrada.
                          </span>
                        )}
                      </div>

                      {trackingMapState.error && (
                        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
                          {trackingMapState.error}
                        </div>
                      )}

                      {trackingMapState.loading ? (
                        <div className="h-[360px] rounded-3xl border border-white/10 bg-slate-950/60 animate-pulse" />
                      ) : (
                        <ShipmentTrackingMap
                          origin={trackingOrigin}
                          destination={trackingMapState.destination}
                          routeCoordinates={routeCoordinates}
                        />
                      )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={trackingMapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-sky-500 px-5 py-3 font-bold text-white hover:bg-sky-400 transition"
                        >
                          Abrir ruta en OpenStreetMap
                        </a>

                        <a
                          href={getOpenStreetMapSearchUrl(
                            selectedShipment.destinationAddress
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/20 transition"
                        >
                          Ver destino en mapa
                        </a>
                      </div>
                    </section>

                    <div className="space-y-6">
                      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                        <div className="flex items-center justify-between gap-4 mb-5">
                          <div>
                            <h3 className="text-2xl font-black">Resumen del envio</h3>
                            <p className="text-slate-400 mt-1">
                              Estado operativo y avance estimado.
                            </p>
                          </div>

                          <strong className="text-4xl font-black text-sky-300">
                            {trackingProgress}%
                          </strong>
                        </div>

                        <div className="h-3 rounded-full bg-slate-800 overflow-hidden mb-6">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400"
                            style={{ width: `${trackingProgress}%` }}
                          />
                        </div>

                        <div className="space-y-4 text-sm">
                          <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                            <p className="text-slate-400 mb-1">Origen</p>
                            <strong>{trackingOrigin.label}</strong>
                          </div>

                          <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                            <p className="text-slate-400 mb-1">Destino</p>
                            <strong>{selectedShipment.destinationAddress}</strong>
                          </div>

                          <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                            <p className="text-slate-400 mb-1">Entrega estimada</p>
                            <strong>
                              {formatShipmentDate(selectedShipment.estimatedDeliveryDate)}
                            </strong>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                        <h3 className="text-2xl font-black mb-5">
                          Timeline del despacho
                        </h3>

                        <div className="space-y-4">
                          {selectedShipmentTimeline.map((step) => (
                            <div key={step.key} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`w-4 h-4 rounded-full mt-1 ${
                                    step.state === "complete"
                                      ? "bg-emerald-400"
                                      : step.state === "current"
                                        ? "bg-sky-400"
                                        : "bg-slate-600"
                                  }`}
                                />
                                <span className="w-px flex-1 bg-white/10 mt-2" />
                              </div>

                              <div className="pb-4">
                                <p className="font-bold text-white">{step.label}</p>
                                <p className="text-slate-400 text-sm mt-1">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section
                        className={`rounded-3xl border p-6 ${
                          isShipmentDelayed(selectedShipment)
                            ? "border-red-500/40 bg-red-950/40"
                            : "border-emerald-500/30 bg-emerald-500/10"
                        }`}
                      >
                        <h3 className="text-xl font-black mb-2">
                          {isShipmentDelayed(selectedShipment)
                            ? "Alerta por atraso"
                            : "Entrega dentro del plazo"}
                        </h3>

                        <p
                          className={
                            isShipmentDelayed(selectedShipment)
                              ? "text-red-100"
                              : "text-emerald-100"
                          }
                        >
                          {isShipmentDelayed(selectedShipment)
                            ? `La entrega estimada era el ${formatShipmentDate(selectedShipment.estimatedDeliveryDate)} y el envio todavia no figura como entregado.`
                            : "No se detectan incidencias de tiempo para este despacho por ahora."}
                        </p>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

export default ShipmentPage;
