import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.SMARTLOGIX_AUDIT_URL || "http://127.0.0.1:5174";
const browserChannel = process.env.SMARTLOGIX_BROWSER_CHANNEL || "msedge";
const browserExecutable = process.env.SMARTLOGIX_BROWSER_EXECUTABLE;
const launchOptions = browserExecutable
  ? { executablePath: browserExecutable, headless: true }
  : { channel: browserChannel, headless: true };

const defaultPreferences = {
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

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
const page = await context.newPage();

await page.addInitScript(() => {
  window.__speechAudit = { cancelled: 0, spoken: false, language: "" };
  class TestUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.onend = null;
      this.onerror = null;
    }
  }
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: TestUtterance,
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel() {
        window.__speechAudit.cancelled += 1;
      },
      speak(utterance) {
        window.__speechAudit.spoken = Boolean(utterance.text);
        window.__speechAudit.language = utterance.lang;
      },
    },
  });
});

function assertWithinViewport(box, width, height, label) {
  assert(box, `${label} no tiene dimensiones visibles.`);
  assert(box.x >= 0, `${label} sale por el borde izquierdo.`);
  assert(box.x + box.width <= width, `${label} sale por el borde derecho.`);
  assert(box.y >= 0, `${label} sale por el borde superior.`);
  assert(box.y + box.height <= height, `${label} sale por el borde inferior.`);
}

try {
  await page.goto(`${baseUrl}/shop`);
  await page.waitForLoadState("networkidle");

  const trigger = page.locator('button[aria-controls="accessibility-panel"]');
  await assert.doesNotReject(() => trigger.waitFor({ state: "visible" }));
  await trigger.click();

  let panel = page.getByRole("dialog", { name: "Accesibilidad" });
  await assert.doesNotReject(() => panel.waitFor({ state: "visible" }));
  assertWithinViewport(await panel.boundingBox(), 320, 720, "El panel");

  const profileButtons = page.locator("#accessibility-profiles button");
  assert.equal(await profileButtons.count(), 6, "No se mostraron los seis perfiles.");
  await page.getByRole("button", { name: "Vision baja" }).click();
  await page.waitForTimeout(100);

  const profileState = await page.evaluate(() => ({
    filter: document.documentElement.dataset.a11yFilter,
    fontSize: document.documentElement.style.fontSize,
    overflow: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    },
    saved: JSON.parse(
      localStorage.getItem("smartlogix-accessibility-preferences"),
    ),
  }));
  assert.equal(profileState.fontSize, "150%");
  assert.equal(profileState.filter, "true");
  assert.equal(profileState.saved.activeProfile, "low-vision");
  assert.equal(profileState.saved.largeCursor, true);
  assert.equal(
    profileState.overflow.scrollWidth > profileState.overflow.clientWidth + 1,
    false,
    `El perfil de vision baja genera desbordamiento: ${JSON.stringify(profileState.overflow)}`,
  );
  assertWithinViewport(await panel.boundingBox(), 320, 720, "El panel al 150%");

  await page.getByRole("button", { name: "Estructura" }).click();
  const structureDialog = page.getByRole("dialog", {
    name: "Estructura de la pagina",
  });
  await assert.doesNotReject(() => structureDialog.waitFor({ state: "visible" }));
  assert(
    await page.locator(".a11y-structure-list button").count() > 0,
    "No se detectaron encabezados o regiones navegables.",
  );
  await page.getByRole("button", { name: "Volver a herramientas" }).click();
  panel = page.getByRole("dialog", { name: "Accesibilidad" });

  await page.getByRole("button", { name: "Espaciado de texto" }).click();
  await page.getByRole("button", { name: "Ocultar imagenes" }).click();
  await page.getByRole("button", { name: /^Saturacion/ }).click();
  await page.getByRole("button", { name: "Guia de lectura" }).click();
  assert.equal(
    await page.locator(".a11y-reading-guide").isVisible(),
    true,
    "La guia de lectura no se activo.",
  );
  await page.getByRole("button", { name: "Guia de lectura" }).click();

  const advancedState = await page.evaluate(() => ({
    filter: document.documentElement.dataset.a11yFilter,
    images: document.documentElement.dataset.a11yImages,
    saturation: document.documentElement.style.getPropertyValue("--a11y-saturation-filter"),
    spacing: document.documentElement.dataset.a11ySpacing,
  }));
  assert.equal(advancedState.filter, "true");
  assert.equal(advancedState.images, "true");
  assert.equal(advancedState.saturation, "0.55");
  assert.equal(advancedState.spacing, "true");
  const readPage = page.getByRole("button", { name: "Leer pagina" });
  assert.equal(await readPage.isVisible(), true, "No se encontro la lectura por voz.");
  await readPage.click();
  const speechState = await page.evaluate(() => window.__speechAudit);
  assert.equal(speechState.spoken, true, "No se envio el contenido al lector.");
  assert.equal(speechState.language, "es-CL");
  await page.getByRole("button", { name: "Detener lectura" }).click();
  assert(
    await page.evaluate(() => window.__speechAudit.cancelled) > 0,
    "No se detuvo la lectura por voz.",
  );

  await page.getByRole("button", {
    name: /Posicion y tamaño del widget/,
  }).click();
  await page.getByRole("button", { name: "Widget grande" }).click();
  await page.getByRole("button", { name: "Derecha" }).click();
  await page.waitForTimeout(100);

  const movedWidget = await page.locator(".a11y-widget").evaluate((element) => ({
    classes: element.className,
    rect: element.getBoundingClientRect().toJSON(),
  }));
  assert.match(movedWidget.classes, /is-large/);
  assert.match(movedWidget.classes, /is-right/);
  assert(movedWidget.rect.right <= 320, "El widget movido sale por la derecha.");
  assertWithinViewport(await panel.boundingBox(), 320, 720, "El panel grande");

  await page.getByRole("button", { name: "Ocultar", exact: true }).click();
  assert.equal(
    await page.locator(".a11y-widget").evaluate(
      (element) => getComputedStyle(element).display,
    ),
    "none",
    "El widget no se oculto.",
  );

  await page.keyboard.press("Control+u");
  panel = page.getByRole("dialog", { name: "Accesibilidad" });
  await assert.doesNotReject(() => panel.waitFor({ state: "visible" }));
  assert.equal(
    await page.locator(".a11y-widget").evaluate(
      (element) => getComputedStyle(element).display,
    ),
    "block",
    "El atajo no recupero el widget oculto.",
  );

  await page.keyboard.press("Escape");
  await assert.doesNotReject(() => panel.waitFor({ state: "hidden" }));
  assert.equal(
    await trigger.evaluate((element) => element === document.activeElement),
    true,
    "El foco no regreso al boton al cerrar con Escape.",
  );

  await page.reload();
  await page.waitForLoadState("networkidle");
  const persistedState = await page.evaluate(() => ({
    images: document.documentElement.dataset.a11yImages,
    position: JSON.parse(
      localStorage.getItem("smartlogix-accessibility-preferences"),
    ).widgetPosition,
    saturation: document.documentElement.style.getPropertyValue("--a11y-saturation-filter"),
  }));
  assert.equal(persistedState.images, "true");
  assert.equal(persistedState.position, "right");
  assert.equal(persistedState.saturation, "0.55");

  await page.locator('button[aria-controls="accessibility-panel"]').click();
  await page.getByRole("button", { name: "Restablecer todo" }).click();
  const resetState = await page.evaluate(() => ({
    filter: document.documentElement.dataset.a11yFilter,
    fontSize: document.documentElement.style.fontSize,
    saved: JSON.parse(
      localStorage.getItem("smartlogix-accessibility-preferences"),
    ),
  }));
  assert.equal(resetState.fontSize, "100%");
  assert.equal(resetState.filter, "false");
  assert.deepEqual(resetState.saved, defaultPreferences);

  await page.locator('button[aria-controls="accessibility-panel"]').click();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", {
    name: "Saltar al contenido principal",
  });
  assert.equal(
    await skipLink.evaluate((element) => element === document.activeElement),
    true,
    "El enlace para saltar contenido no es el primer control del teclado.",
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "MAIN",
    "El salto no llevo el foco al contenido principal.",
  );

  console.log(JSON.stringify({
    viewport: "320x720",
    profilesAvailable: 6,
    panelWithinViewport: true,
    maximumTextReflow: true,
    pageStructureWorks: true,
    pageReadingWorks: true,
    advancedToolsPersisted: true,
    widgetMoveHideShortcutWorks: true,
    escapeReturnsFocus: true,
    skipLinkWorks: true,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
