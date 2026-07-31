import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuAccessibility,
  LuActivity,
  LuAlignLeft,
  LuBookOpen,
  LuBrain,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCirclePause,
  LuContrast,
  LuEye,
  LuFocus,
  LuHeading,
  LuImageOff,
  LuLink,
  LuListTree,
  LuMaximize2,
  LuMinus,
  LuMousePointer2,
  LuMoveHorizontal,
  LuPalette,
  LuPanelLeftClose,
  LuPanelRightClose,
  LuPersonStanding,
  LuPlus,
  LuRotateCcw,
  LuRows3,
  LuScanEye,
  LuSettings,
  LuType,
  LuVolume2,
  LuVolumeX,
  LuX,
} from "react-icons/lu";
import { useLocation } from "react-router-dom";
import "../styles/accessibility.css";

const STORAGE_KEY = "smartlogix-accessibility-preferences";
const TEXT_SCALES = [90, 100, 112.5, 125, 150];
const SATURATION_LEVELS = ["normal", "low", "high"];
const BOOLEAN_KEYS = [
  "highContrast",
  "grayscale",
  "underlineLinks",
  "readableFont",
  "reduceMotion",
  "largeCursor",
  "enhancedFocus",
  "textSpacing",
  "increasedLineHeight",
  "hideImages",
  "leftAlign",
  "highlightHeadings",
  "readingGuide",
  "largeTargets",
  "largeWidget",
  "widgetHidden",
];
const DEFAULT_PREFERENCES = {
  textScale: 100,
  highContrast: false,
  grayscale: false,
  underlineLinks: false,
  readableFont: false,
  reduceMotion: false,
  largeCursor: false,
  enhancedFocus: false,
  textSpacing: false,
  increasedLineHeight: false,
  hideImages: false,
  leftAlign: false,
  highlightHeadings: false,
  readingGuide: false,
  largeTargets: false,
  saturation: "normal",
  largeWidget: false,
  widgetPosition: "left",
  widgetHidden: false,
  activeProfile: "",
};

const ACCESSIBILITY_PROFILES = [
  {
    key: "low-vision",
    label: "Vision baja",
    Icon: LuScanEye,
    preferences: {
      textScale: 150,
      highContrast: true,
      underlineLinks: true,
      largeCursor: true,
      enhancedFocus: true,
    },
  },
  {
    key: "clear-reading",
    label: "Lectura clara",
    Icon: LuBookOpen,
    preferences: {
      textScale: 125,
      readableFont: true,
      textSpacing: true,
      increasedLineHeight: true,
      leftAlign: true,
    },
  },
  {
    key: "reduced-mobility",
    label: "Movilidad reducida",
    Icon: LuPersonStanding,
    preferences: {
      largeCursor: true,
      enhancedFocus: true,
      largeTargets: true,
      reduceMotion: true,
    },
  },
  {
    key: "cognitive-support",
    label: "Apoyo cognitivo",
    Icon: LuBrain,
    preferences: {
      textScale: 125,
      readableFont: true,
      underlineLinks: true,
      increasedLineHeight: true,
      highlightHeadings: true,
    },
  },
  {
    key: "reduced-stimulus",
    label: "Reducir estimulos",
    Icon: LuActivity,
    preferences: {
      reduceMotion: true,
      grayscale: true,
      hideImages: true,
    },
  },
  {
    key: "attention",
    label: "Atencion y enfoque",
    Icon: LuFocus,
    preferences: {
      reduceMotion: true,
      readingGuide: true,
      highlightHeadings: true,
      enhancedFocus: true,
    },
  },
];

const TOOL_OPTIONS = [
  { key: "highContrast", label: "Contraste +", Icon: LuContrast },
  { key: "grayscale", label: "Escala de grises", Icon: LuEye },
  { key: "underlineLinks", label: "Resaltar enlaces", Icon: LuLink },
  { key: "readableFont", label: "Fuente legible", Icon: LuType },
  { key: "textSpacing", label: "Espaciado de texto", Icon: LuMoveHorizontal },
  { key: "increasedLineHeight", label: "Altura de linea", Icon: LuRows3 },
  { key: "reduceMotion", label: "Detener animaciones", Icon: LuCirclePause },
  { key: "hideImages", label: "Ocultar imagenes", Icon: LuImageOff },
  { key: "largeCursor", label: "Cursor grande", Icon: LuMousePointer2 },
  { key: "enhancedFocus", label: "Foco reforzado", Icon: LuFocus },
  { key: "largeTargets", label: "Controles grandes", Icon: LuMaximize2 },
  { key: "leftAlign", label: "Texto alineado", Icon: LuAlignLeft },
  { key: "highlightHeadings", label: "Resaltar titulos", Icon: LuHeading },
  { key: "readingGuide", label: "Guia de lectura", Icon: LuScanEye },
];

function normalizePreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const requestedScale = Number(source.textScale);
  const requestedSaturation = String(source.saturation || "normal");
  const requestedPosition = String(source.widgetPosition || "left");
  const requestedProfile = String(source.activeProfile || "");

  return {
    ...DEFAULT_PREFERENCES,
    ...Object.fromEntries(BOOLEAN_KEYS.map((key) => [key, source[key] === true])),
    textScale: TEXT_SCALES.includes(requestedScale) ? requestedScale : 100,
    saturation: SATURATION_LEVELS.includes(requestedSaturation)
      ? requestedSaturation
      : "normal",
    widgetPosition: requestedPosition === "right" ? "right" : "left",
    activeProfile: ACCESSIBILITY_PROFILES.some(({ key }) => key === requestedProfile)
      ? requestedProfile
      : "",
  };
}

function loadPreferences() {
  try {
    return normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function AccessibilityWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [announcement, setAnnouncement] = useState("");
  const [profilesExpanded, setProfilesExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [panelView, setPanelView] = useState("main");
  const [structureItems, setStructureItems] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const guideRef = useRef(null);

  const activeCount = useMemo(() => {
    const activeTools = TOOL_OPTIONS.filter(({ key }) => preferences[key]).length;
    return activeTools
      + (preferences.textScale === 100 ? 0 : 1)
      + (preferences.saturation === "normal" ? 0 : 1)
      + (preferences.largeWidget ? 1 : 0)
      + (preferences.widgetPosition === "right" ? 1 : 0);
  }, [preferences]);

  useEffect(() => {
    const root = document.documentElement;
    const saturation = preferences.saturation === "low"
      ? "0.55"
      : preferences.saturation === "high"
        ? "1.7"
        : "1";
    root.style.fontSize = `${preferences.textScale}%`;
    root.style.setProperty("--a11y-contrast-filter", preferences.highContrast ? "1.45" : "1");
    root.style.setProperty("--a11y-grayscale-filter", preferences.grayscale ? "1" : "0");
    root.style.setProperty("--a11y-saturation-filter", saturation);
    root.dataset.a11yFilter = String(
      preferences.highContrast
      || preferences.grayscale
      || preferences.saturation !== "normal",
    );
    root.dataset.a11yLinks = String(preferences.underlineLinks);
    root.dataset.a11yFont = String(preferences.readableFont);
    root.dataset.a11yMotion = String(preferences.reduceMotion);
    root.dataset.a11yCursor = String(preferences.largeCursor);
    root.dataset.a11yFocus = String(preferences.enhancedFocus);
    root.dataset.a11ySpacing = String(preferences.textSpacing);
    root.dataset.a11yLineHeight = String(preferences.increasedLineHeight);
    root.dataset.a11yImages = String(preferences.hideImages);
    root.dataset.a11yAlign = String(preferences.leftAlign);
    root.dataset.a11yHeadings = String(preferences.highlightHeadings);
    root.dataset.a11yTargets = String(preferences.largeTargets);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Settings remain active for the current session when storage is unavailable.
    }
  }, [preferences]);

  useEffect(() => {
    function syncPreferences(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setPreferences(normalizePreferences(JSON.parse(event.newValue)));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }

    window.addEventListener("storage", syncPreferences);
    return () => window.removeEventListener("storage", syncPreferences);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setPanelView("main");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    window.requestAnimationFrame(() => closeRef.current?.focus());

    function closeOnEscape(event) {
      if (event.key === "Escape") closePanel();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closePanel, open]);

  useEffect(() => {
    function toggleWithShortcut(event) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "u") return;
      event.preventDefault();
      if (open) {
        closePanel();
        return;
      }
      setPreferences((current) => ({ ...current, widgetHidden: false }));
      setOpen(true);
    }

    window.addEventListener("keydown", toggleWithShortcut);
    return () => window.removeEventListener("keydown", toggleWithShortcut);
  }, [closePanel, open]);

  useEffect(() => {
    if (!preferences.readingGuide) return undefined;

    function moveGuide(clientY) {
      if (!guideRef.current) return;
      const halfHeight = 60;
      const nextY = Math.max(halfHeight, Math.min(window.innerHeight - halfHeight, clientY));
      guideRef.current.style.transform = `translateY(${nextY - halfHeight}px)`;
    }

    function followPointer(event) {
      moveGuide(event.clientY);
    }

    function followFocus(event) {
      const rect = event.target?.getBoundingClientRect?.();
      if (rect) moveGuide(rect.top + rect.height / 2);
    }

    window.addEventListener("pointermove", followPointer);
    document.addEventListener("focusin", followFocus);
    return () => {
      window.removeEventListener("pointermove", followPointer);
      document.removeEventListener("focusin", followFocus);
    };
  }, [preferences.readingGuide]);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPanelView("main");
    setStructureItems([]);
  }, [location.pathname]);

  useEffect(
    () => () => window.speechSynthesis?.cancel(),
    [],
  );

  function updateTextScale(direction) {
    const currentIndex = TEXT_SCALES.indexOf(preferences.textScale);
    const nextIndex = Math.min(
      TEXT_SCALES.length - 1,
      Math.max(0, currentIndex + direction),
    );
    const nextScale = TEXT_SCALES[nextIndex];
    setPreferences((current) => ({
      ...current,
      activeProfile: "",
      textScale: nextScale,
    }));
    setAnnouncement(`Tamaño de texto ${nextScale} por ciento`);
  }

  function togglePreference(key, label) {
    const enabled = !preferences[key];
    setPreferences((current) => ({
      ...current,
      activeProfile: "",
      [key]: enabled,
    }));
    setAnnouncement(`${label} ${enabled ? "activado" : "desactivado"}`);
  }

  function applyProfile(profile) {
    setPreferences((current) => ({
      ...DEFAULT_PREFERENCES,
      ...profile.preferences,
      activeProfile: profile.key,
      largeWidget: current.largeWidget,
      widgetPosition: current.widgetPosition,
    }));
    setAnnouncement(`Perfil ${profile.label} activado`);
  }

  function cycleSaturation() {
    const currentIndex = SATURATION_LEVELS.indexOf(preferences.saturation);
    const nextValue = SATURATION_LEVELS[(currentIndex + 1) % SATURATION_LEVELS.length];
    const labels = { normal: "normal", low: "reducida", high: "alta" };
    setPreferences((current) => ({
      ...current,
      activeProfile: "",
      saturation: nextValue,
    }));
    setAnnouncement(`Saturacion ${labels[nextValue]}`);
  }

  function resetPreferences() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPreferences(DEFAULT_PREFERENCES);
    setAnnouncement("Preferencias de accesibilidad restablecidas");
  }

  function togglePageReading() {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      setAnnouncement("Lectura detenida");
      return;
    }

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setAnnouncement("La lectura por voz no esta disponible en este navegador");
      return;
    }

    const main = document.querySelector("main");
    const text = main?.innerText?.trim();
    if (!text) {
      setAnnouncement("No se encontro contenido para leer");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 20000));
    utterance.lang = "es-CL";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setAnnouncement("Lectura de pagina iniciada");
  }

  function showPageStructure() {
    const main = document.querySelector("main");
    if (!main) {
      setAnnouncement("No se encontro la estructura principal");
      return;
    }

    const candidates = [...main.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, nav, form, [role='navigation'], [role='search']",
    )];
    const items = candidates
      .filter((element, index) => candidates.indexOf(element) === index)
      .map((element, index) => {
        const headingMatch = element.tagName.match(/^H([1-6])$/);
        const type = headingMatch
          ? `H${headingMatch[1]}`
          : element.matches("form, [role='search']")
            ? "Formulario"
            : "Navegacion";
        const label = element.getAttribute("aria-label")
          || element.querySelector("h1, h2, h3")?.textContent
          || element.textContent
          || type;
        const id = `structure-${index}`;
        element.dataset.a11yStructureId = id;
        return {
          id,
          label: label.trim().replace(/\s+/g, " ").slice(0, 100),
          type,
        };
      })
      .filter(({ label }) => label)
      .slice(0, 60);

    setStructureItems(items);
    setPanelView("structure");
    setAnnouncement(`${items.length} elementos de estructura encontrados`);
  }

  function focusStructureItem(id) {
    const target = document.querySelector(`[data-a11y-structure-id="${id}"]`);
    if (!target) return;
    setOpen(false);
    setPanelView("main");
    window.requestAnimationFrame(() => {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.scrollIntoView({ behavior: preferences.reduceMotion ? "auto" : "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  }

  function focusMainContent(event) {
    event.preventDefault();
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.id) main.id = "main-content";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.scrollIntoView({ block: "start" });
    main.focus({ preventScroll: true });
  }

  const widgetClasses = [
    "a11y-widget",
    preferences.largeWidget ? "is-large" : "",
    preferences.widgetPosition === "right" ? "is-right" : "is-left",
    preferences.widgetHidden ? "is-hidden" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <a className="a11y-skip-link" href="#main-content" onClick={focusMainContent}>
        Saltar al contenido principal
      </a>

      {preferences.readingGuide && (
        <div ref={guideRef} className="a11y-reading-guide" aria-hidden="true" />
      )}

      <div className={widgetClasses}>
        {open && (
          <section
            id="accessibility-panel"
            className="a11y-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="accessibility-panel-title"
          >
            <header className="a11y-panel__header">
              {panelView === "structure" ? (
                <button
                  type="button"
                  className="a11y-panel__heading-icon a11y-panel__back"
                  aria-label="Volver a herramientas"
                  onClick={() => setPanelView("main")}
                >
                  <LuChevronRight aria-hidden="true" />
                </button>
              ) : (
                <span className="a11y-panel__heading-icon" aria-hidden="true">
                  <LuAccessibility />
                </span>
              )}
              <div>
                <p className="a11y-panel__eyebrow">
                  {panelView === "structure" ? "Navegacion rapida" : "Preferencias visuales"}
                </p>
                <h2 id="accessibility-panel-title">
                  {panelView === "structure" ? "Estructura de la pagina" : "Accesibilidad"}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="a11y-icon-button"
                title="Cerrar"
                aria-label="Cerrar herramientas de accesibilidad"
                onClick={closePanel}
              >
                <LuX aria-hidden="true" />
              </button>
            </header>

            {panelView === "structure" ? (
              <div className="a11y-structure-list">
                {structureItems.length === 0 ? (
                  <p className="a11y-empty-state">No se encontraron encabezados o regiones.</p>
                ) : (
                  structureItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => focusStructureItem(item.id)}
                    >
                      <span>{item.type}</span>
                      <strong>{item.label}</strong>
                      <LuChevronRight aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="a11y-panel__body">
                  <button
                    type="button"
                    className="a11y-section-toggle"
                    aria-expanded={profilesExpanded}
                    aria-controls="accessibility-profiles"
                    onClick={() => setProfilesExpanded((current) => !current)}
                  >
                    <span>
                      <LuAccessibility aria-hidden="true" />
                      Perfiles de accesibilidad
                    </span>
                    {profilesExpanded
                      ? <LuChevronDown aria-hidden="true" />
                      : <LuChevronRight aria-hidden="true" />}
                  </button>

                  {profilesExpanded && (
                    <div id="accessibility-profiles" className="a11y-profiles">
                      {ACCESSIBILITY_PROFILES.map((profile) => (
                        <button
                          key={profile.key}
                          type="button"
                          className={preferences.activeProfile === profile.key ? "is-active" : ""}
                          aria-pressed={preferences.activeProfile === profile.key}
                          onClick={() => applyProfile(profile)}
                        >
                          <profile.Icon aria-hidden="true" />
                          <span>{profile.label}</span>
                          <LuCheck className="a11y-profile-check" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="a11y-text-control">
                    <div>
                      <span className="a11y-control-label">Tamaño del texto</span>
                      <output aria-live="polite">{preferences.textScale}%</output>
                    </div>
                    <div className="a11y-stepper">
                      <button
                        type="button"
                        aria-label="Disminuir tamaño del texto"
                        disabled={preferences.textScale === TEXT_SCALES[0]}
                        onClick={() => updateTextScale(-1)}
                      >
                        <LuMinus aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Aumentar tamaño del texto"
                        disabled={preferences.textScale === TEXT_SCALES.at(-1)}
                        onClick={() => updateTextScale(1)}
                      >
                        <LuPlus aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="a11y-options">
                    <ToolButton
                      active={speaking}
                      Icon={speaking ? LuVolumeX : LuVolume2}
                      label={speaking ? "Detener lectura" : "Leer pagina"}
                      onClick={togglePageReading}
                    />
                    {TOOL_OPTIONS.map(({ key, label, Icon }) => (
                      <ToolButton
                        key={key}
                        active={preferences[key]}
                        Icon={Icon}
                        label={label}
                        onClick={() => togglePreference(key, label)}
                      />
                    ))}
                    <ToolButton
                      active={preferences.saturation !== "normal"}
                      Icon={LuPalette}
                      label="Saturacion"
                      secondary={{
                        normal: "Normal",
                        low: "Reducida",
                        high: "Alta",
                      }[preferences.saturation]}
                      onClick={cycleSaturation}
                    />
                    <ToolButton
                      Icon={LuListTree}
                      label="Estructura"
                      onClick={showPageStructure}
                    />
                  </div>

                  <button
                    type="button"
                    className="a11y-section-toggle a11y-settings-toggle"
                    aria-expanded={settingsExpanded}
                    aria-controls="accessibility-widget-settings"
                    onClick={() => setSettingsExpanded((current) => !current)}
                  >
                    <span>
                      <LuSettings aria-hidden="true" />
                      Posicion y tamaño del widget
                    </span>
                    {settingsExpanded
                      ? <LuChevronDown aria-hidden="true" />
                      : <LuChevronRight aria-hidden="true" />}
                  </button>

                  {settingsExpanded && (
                    <div id="accessibility-widget-settings" className="a11y-widget-settings">
                      <button
                        type="button"
                        aria-pressed={preferences.largeWidget}
                        className={preferences.largeWidget ? "is-active" : ""}
                        onClick={() => {
                          const enabled = !preferences.largeWidget;
                          setPreferences((current) => ({
                            ...current,
                            largeWidget: enabled,
                          }));
                          setAnnouncement(`Widget grande ${enabled ? "activado" : "desactivado"}`);
                        }}
                      >
                        <LuMaximize2 aria-hidden="true" />
                        Widget grande
                      </button>
                      <button
                        type="button"
                        aria-pressed={preferences.widgetPosition === "left"}
                        className={preferences.widgetPosition === "left" ? "is-active" : ""}
                        onClick={() => setPreferences((current) => ({
                          ...current,
                          widgetPosition: "left",
                        }))}
                      >
                        <LuPanelLeftClose aria-hidden="true" />
                        Izquierda
                      </button>
                      <button
                        type="button"
                        aria-pressed={preferences.widgetPosition === "right"}
                        className={preferences.widgetPosition === "right" ? "is-active" : ""}
                        onClick={() => setPreferences((current) => ({
                          ...current,
                          widgetPosition: "right",
                        }))}
                      >
                        <LuPanelRightClose aria-hidden="true" />
                        Derecha
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreferences((current) => ({ ...current, widgetHidden: true }));
                          setOpen(false);
                        }}
                      >
                        <LuX aria-hidden="true" />
                        Ocultar
                      </button>
                    </div>
                  )}
                </div>

                <footer className="a11y-panel__footer">
                  <span>{activeCount} ajustes activos</span>
                  <button
                    type="button"
                    className="a11y-reset-button"
                    onClick={resetPreferences}
                    disabled={activeCount === 0}
                  >
                    <LuRotateCcw aria-hidden="true" />
                    Restablecer todo
                  </button>
                </footer>
              </>
            )}
          </section>
        )}

        <button
          ref={triggerRef}
          type="button"
          className="a11y-launcher"
          aria-expanded={open}
          aria-controls="accessibility-panel"
          aria-label={open
            ? "Cerrar herramientas de accesibilidad"
            : "Abrir herramientas de accesibilidad"}
          title="Accesibilidad"
          onClick={() => (open ? closePanel() : setOpen(true))}
        >
          <LuAccessibility aria-hidden="true" />
          {activeCount > 0 && (
            <span className="a11y-launcher__badge" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

function ToolButton({ active = false, Icon, label, onClick, secondary = "" }) {
  return (
    <button
      type="button"
      className={`a11y-option${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="a11y-option__icon" aria-hidden="true" />
      <span>{label}</span>
      {secondary && <small>{secondary}</small>}
      <LuCheck className="a11y-option__check" aria-hidden="true" />
    </button>
  );
}

export default AccessibilityWidget;
