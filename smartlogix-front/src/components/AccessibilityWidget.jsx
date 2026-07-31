import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuAccessibility,
  LuCheck,
  LuCirclePause,
  LuContrast,
  LuEye,
  LuFocus,
  LuLink,
  LuMinus,
  LuMousePointer2,
  LuPlus,
  LuRotateCcw,
  LuType,
  LuX,
} from "react-icons/lu";
import "../styles/accessibility.css";

const STORAGE_KEY = "smartlogix-accessibility-preferences";
const TEXT_SCALES = [90, 100, 112.5, 125, 150];
const DEFAULT_PREFERENCES = {
  textScale: 100,
  highContrast: false,
  grayscale: false,
  underlineLinks: false,
  readableFont: false,
  reduceMotion: false,
  largeCursor: false,
  enhancedFocus: false,
};

const TOGGLE_OPTIONS = [
  { key: "highContrast", label: "Alto contraste", Icon: LuContrast },
  { key: "grayscale", label: "Escala de grises", Icon: LuEye },
  { key: "underlineLinks", label: "Subrayar enlaces", Icon: LuLink },
  { key: "readableFont", label: "Fuente legible", Icon: LuType },
  { key: "reduceMotion", label: "Reducir animaciones", Icon: LuCirclePause },
  { key: "largeCursor", label: "Cursor grande", Icon: LuMousePointer2 },
  { key: "enhancedFocus", label: "Foco reforzado", Icon: LuFocus },
];

function normalizePreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const requestedScale = Number(source.textScale);

  return {
    ...DEFAULT_PREFERENCES,
    ...Object.fromEntries(
      Object.keys(DEFAULT_PREFERENCES)
        .filter((key) => key !== "textScale")
        .map((key) => [key, source[key] === true]),
    ),
    textScale: TEXT_SCALES.includes(requestedScale) ? requestedScale : 100,
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
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  const activeCount = useMemo(
    () =>
      TOGGLE_OPTIONS.filter(({ key }) => preferences[key]).length
      + (preferences.textScale === 100 ? 0 : 1),
    [preferences],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${preferences.textScale}%`;
    root.dataset.a11yContrast = String(preferences.highContrast);
    root.dataset.a11yGrayscale = String(preferences.grayscale);
    root.dataset.a11yLinks = String(preferences.underlineLinks);
    root.dataset.a11yFont = String(preferences.readableFont);
    root.dataset.a11yMotion = String(preferences.reduceMotion);
    root.dataset.a11yCursor = String(preferences.largeCursor);
    root.dataset.a11yFocus = String(preferences.enhancedFocus);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The preferences still work for the current session when storage is unavailable.
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

  function updateTextScale(direction) {
    const currentIndex = TEXT_SCALES.indexOf(preferences.textScale);
    const nextIndex = Math.min(
      TEXT_SCALES.length - 1,
      Math.max(0, currentIndex + direction),
    );
    const nextScale = TEXT_SCALES[nextIndex];
    setPreferences((current) => ({ ...current, textScale: nextScale }));
    setAnnouncement(`Tamaño de texto ${nextScale} por ciento`);
  }

  function togglePreference(key, label) {
    const enabled = !preferences[key];
    setPreferences((current) => ({ ...current, [key]: enabled }));
    setAnnouncement(`${label} ${enabled ? "activado" : "desactivado"}`);
  }

  function resetPreferences() {
    setPreferences(DEFAULT_PREFERENCES);
    setAnnouncement("Preferencias de accesibilidad restablecidas");
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

  return (
    <>
      <a className="a11y-skip-link" href="#main-content" onClick={focusMainContent}>
        Saltar al contenido principal
      </a>

      <div className="a11y-widget">
        {open && (
          <section
            id="accessibility-panel"
            className="a11y-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="accessibility-panel-title"
          >
            <header className="a11y-panel__header">
              <span className="a11y-panel__heading-icon" aria-hidden="true">
                <LuAccessibility />
              </span>
              <div>
                <p className="a11y-panel__eyebrow">Preferencias visuales</p>
                <h2 id="accessibility-panel-title">Accesibilidad</h2>
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

            <div className="a11y-panel__body">
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
                {TOGGLE_OPTIONS.map(({ key, label, Icon }) => {
                  const enabled = preferences[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`a11y-option${enabled ? " is-active" : ""}`}
                      aria-pressed={enabled}
                      onClick={() => togglePreference(key, label)}
                    >
                      <Icon className="a11y-option__icon" aria-hidden="true" />
                      <span>{label}</span>
                      <LuCheck className="a11y-option__check" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
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
                Restablecer
              </button>
            </footer>
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
            <span className="a11y-launcher__badge" aria-label={`${activeCount} ajustes activos`}>
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

export default AccessibilityWidget;
