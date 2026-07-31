import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.SMARTLOGIX_AUDIT_URL || "http://127.0.0.1:5174";
const browserChannel = process.env.SMARTLOGIX_BROWSER_CHANNEL || "msedge";
const browserExecutable = process.env.SMARTLOGIX_BROWSER_EXECUTABLE;
const launchOptions = browserExecutable
  ? { executablePath: browserExecutable, headless: true }
  : { channel: browserChannel, headless: true };

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/shop`);
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", {
    name: "Abrir herramientas de accesibilidad",
  });
  await assert.doesNotReject(() => trigger.waitFor({ state: "visible" }));

  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Accesibilidad" });
  await assert.doesNotReject(() => panel.waitFor({ state: "visible" }));

  const panelBox = await panel.boundingBox();
  assert(panelBox, "El panel no tiene dimensiones visibles.");
  assert(panelBox.x >= 0, "El panel sale por el borde izquierdo.");
  assert(panelBox.x + panelBox.width <= 320, "El panel sale por el borde derecho.");
  assert(panelBox.y >= 0, "El panel sale por el borde superior.");
  assert(panelBox.y + panelBox.height <= 720, "El panel sale por el borde inferior.");

  const increaseText = page.getByRole("button", {
    name: "Aumentar tamaño del texto",
  });
  await increaseText.click();
  await increaseText.click();
  await increaseText.click();
  await page.getByRole("button", { name: "Alto contraste" }).click();
  await page.getByRole("button", { name: "Subrayar enlaces" }).click();
  await page.getByRole("button", { name: "Reducir animaciones" }).click();
  await page.getByRole("button", { name: "Foco reforzado" }).click();

  const enabledState = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.a11yContrast,
    focus: document.documentElement.dataset.a11yFocus,
    fontSize: document.documentElement.style.fontSize,
    links: document.documentElement.dataset.a11yLinks,
    motion: document.documentElement.dataset.a11yMotion,
    overflow: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const intentionallyScrollable = element.closest(
            '[class*="overflow-x-auto"], [class*="overflow-x-scroll"]',
          );
          return (
            style.display !== "none"
            && style.visibility !== "hidden"
            && rect.width > 1
            && !intentionallyScrollable
            && (rect.right > window.innerWidth + 2 || rect.left < -2)
          );
        })
        .slice(0, 8)
        .map((element) => ({
          className: String(element.className).slice(0, 140),
          rect: {
            left: Math.round(element.getBoundingClientRect().left),
            right: Math.round(element.getBoundingClientRect().right),
            width: Math.round(element.getBoundingClientRect().width),
          },
          tag: element.tagName.toLowerCase(),
          text: String(element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        })),
      roots: ["html", "body", "#root", "header", "main", ".a11y-widget", ".a11y-panel"]
        .map((selector) => document.querySelector(selector))
        .filter(Boolean)
        .map((element) => ({
          className: String(element.className).slice(0, 100),
          clientWidth: element.clientWidth,
          rect: {
            left: Math.round(element.getBoundingClientRect().left),
            right: Math.round(element.getBoundingClientRect().right),
            width: Math.round(element.getBoundingClientRect().width),
          },
          scrollWidth: element.scrollWidth,
          tag: element.tagName.toLowerCase(),
        })),
    },
    saved: JSON.parse(
      localStorage.getItem("smartlogix-accessibility-preferences"),
    ),
  }));

  assert.equal(enabledState.fontSize, "150%");
  assert.equal(
    enabledState.overflow.scrollWidth > enabledState.overflow.clientWidth + 1,
    false,
    `El texto al 150% genera desbordamiento: ${JSON.stringify(enabledState.overflow)}`,
  );
  assert.equal(enabledState.contrast, "true");
  assert.equal(enabledState.links, "true");
  assert.equal(enabledState.motion, "true");
  assert.equal(enabledState.focus, "true");
  assert.equal(enabledState.saved.highContrast, true);

  await page.reload();
  await page.waitForLoadState("networkidle");
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.a11yContrast),
    "true",
    "Las preferencias no persistieron al recargar.",
  );

  const persistedTrigger = page.getByRole("button", {
    name: "Abrir herramientas de accesibilidad",
  });
  await persistedTrigger.click();
  await page.keyboard.press("Escape");
  await assert.doesNotReject(() =>
    page
      .getByRole("dialog", { name: "Accesibilidad" })
      .waitFor({ state: "hidden" }),
  );
  assert.equal(
    await persistedTrigger.evaluate((element) => element === document.activeElement),
    true,
    "El foco no regreso al boton al cerrar con Escape.",
  );

  await persistedTrigger.click();
  await page.getByRole("button", { name: "Restablecer" }).click();
  const resetState = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.a11yContrast,
    fontSize: document.documentElement.style.fontSize,
    saved: JSON.parse(
      localStorage.getItem("smartlogix-accessibility-preferences"),
    ),
  }));
  assert.equal(resetState.fontSize, "100%");
  assert.equal(resetState.contrast, "false");
  assert.deepEqual(resetState.saved, {
    textScale: 100,
    highContrast: false,
    grayscale: false,
    underlineLinks: false,
    readableFont: false,
    reduceMotion: false,
    largeCursor: false,
    enhancedFocus: false,
  });

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
    panelWithinViewport: true,
    preferencesPersisted: true,
    escapeReturnsFocus: true,
    skipLinkWorks: true,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
