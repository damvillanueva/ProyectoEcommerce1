import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.SMARTLOGIX_AUDIT_URL || "http://127.0.0.1:5174";
const outputDir = resolve(
  process.env.SMARTLOGIX_AUDIT_OUTPUT || "artifacts/responsive-audit",
);
const adminPassword = process.env.SMARTLOGIX_TEST_ADMIN_PASSWORD;
const customerPassword = process.env.SMARTLOGIX_TEST_CUSTOMER_PASSWORD;
const browserChannel = process.env.SMARTLOGIX_BROWSER_CHANNEL || "msedge";
const browserExecutable = process.env.SMARTLOGIX_BROWSER_EXECUTABLE;

const availableViewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];
const requestedWidths = new Set(
  (process.env.SMARTLOGIX_AUDIT_WIDTHS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean),
);
const viewports = requestedWidths.size
  ? availableViewports.filter(({ width }) => requestedWidths.has(width))
  : availableViewports;
const fullPageScreenshots = process.env.SMARTLOGIX_AUDIT_FULL_PAGE === "true";

const publicRoutes = [
  { label: "shop", path: "/shop" },
  { label: "product", path: "/shop/product/SKU-1001" },
  { label: "cart", path: "/shop/cart", withCart: true },
];

const adminRoutes = [
  { label: "dashboard", path: "/dashboard" },
  { label: "inventory", path: "/inventory" },
  { label: "movements", path: "/inventory/movements" },
  { label: "orders", path: "/orders" },
  { label: "shipments", path: "/shipments" },
  { label: "users", path: "/users" },
  { label: "discounts", path: "/discounts" },
];

if (!adminPassword || !customerPassword) {
  throw new Error(
    "Define SMARTLOGIX_TEST_ADMIN_PASSWORD y SMARTLOGIX_TEST_CUSTOMER_PASSWORD antes de ejecutar la auditoria.",
  );
}

await mkdir(outputDir, { recursive: true });

const launchOptions = browserExecutable
  ? { executablePath: browserExecutable, headless: true }
  : { channel: browserChannel, headless: true };
const browser = await chromium.launch(launchOptions);
const results = [];

function slug(value) {
  return value.toLowerCase().replaceAll(" ", "-");
}

async function setDemoCart(page) {
  await page.evaluate(() => {
    localStorage.setItem(
      "smartlogix-store-cart",
      JSON.stringify([{ sku: "SKU-1001", quantity: 2 }]),
    );
  });
}

async function inspect(page, label, viewport) {
  await page.waitForLoadState("networkidle");

  const layout = await page.evaluate(() => {
    const intentionallyScrollable = (element) =>
      Boolean(
        element.closest(
          '[class*="overflow-x-auto"], [class*="overflow-x-scroll"]',
        ),
      );

    const offenders = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 1 &&
          !intentionallyScrollable(element) &&
          (rect.right > window.innerWidth + 2 || rect.left < -2)
        );
      })
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className).slice(0, 180),
        text: String(element.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 100),
      }));

    const smallTargets = [
      ...document.querySelectorAll("button, a, input, select, textarea"),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.width < 40 || rect.height < 40)
        );
      })
      .slice(0, 20)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
        text: String(
          element.textContent ||
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            "",
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80),
      }));

    return {
      clientWidth: document.body.clientWidth,
      scrollWidth: document.body.scrollWidth,
      offenders,
      smallTargets,
    };
  });

  await page.screenshot({
    path: resolve(outputDir, `${viewport.width}-${slug(label)}.png`),
    fullPage: fullPageScreenshots,
  });

  results.push({
    viewport: viewport.width,
    page: label,
    horizontalScroll: layout.scrollWidth > layout.clientWidth + 1,
    offenders: layout.offenders,
    smallTargets: layout.smallTargets,
  });
}

async function login(page, path, username, password, destination) {
  await page.goto(`${baseUrl}${path}`);
  const credential =
    path === "/"
      ? page.getByPlaceholder("Ingrese su usuario")
      : page.locator('input[name="username"]');
  await credential.fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`**${destination}`);
}

async function auditRoute(page, route, viewport) {
  if (route.withCart) {
    await page.goto(`${baseUrl}/shop`);
    await setDemoCart(page);
  }
  await page.goto(`${baseUrl}${route.path}`);
  await inspect(page, route.label, viewport);
}

try {
  for (const viewport of viewports) {
    const publicContext = await browser.newContext({ viewport });
    const publicPage = await publicContext.newPage();
    const publicErrors = [];
    publicPage.on("console", (message) => {
      if (message.type() === "error") publicErrors.push(message.text());
    });
    for (const route of publicRoutes) {
      await auditRoute(publicPage, route, viewport);
    }
    results.push({
      viewport: viewport.width,
      page: "public-console",
      consoleErrors: [...new Set(publicErrors)],
    });
    await publicContext.close();

    const customerContext = await browser.newContext({ viewport });
    const customerPage = await customerContext.newPage();
    const customerErrors = [];
    customerPage.on("console", (message) => {
      if (message.type() === "error") customerErrors.push(message.text());
    });
    await login(
      customerPage,
      "/shop/login",
      "cliente",
      customerPassword,
      "/shop",
    );
    await setDemoCart(customerPage);
    await customerPage.goto(`${baseUrl}/shop/checkout`);
    await inspect(customerPage, "checkout", viewport);
    await customerPage.goto(`${baseUrl}/shop/account`);
    await inspect(customerPage, "account", viewport);
    for (const accountView of [
      "Mis compras",
      "Favoritos",
      "Direcciones",
      "Mi perfil",
    ]) {
      await customerPage
        .getByRole("button", { name: accountView, exact: true })
        .click();
      await inspect(customerPage, `account-${slug(accountView)}`, viewport);
    }
    results.push({
      viewport: viewport.width,
      page: "customer-console",
      consoleErrors: [...new Set(customerErrors)],
    });
    await customerContext.close();

    const adminContext = await browser.newContext({ viewport });
    const adminPage = await adminContext.newPage();
    const adminErrors = [];
    adminPage.on("console", (message) => {
      if (message.type() === "error") adminErrors.push(message.text());
    });
    await login(adminPage, "/", "admin", adminPassword, "/dashboard");
    for (const route of adminRoutes) {
      await auditRoute(adminPage, route, viewport);
    }
    results.push({
      viewport: viewport.width,
      page: "admin-console",
      consoleErrors: [...new Set(adminErrors)],
    });
    await adminContext.close();
  }
} finally {
  await browser.close();
}

const summary = {
  auditedPages: results.filter((result) => "horizontalScroll" in result).length,
  horizontalScroll: results
    .filter((result) => result.horizontalScroll)
    .map(({ page, viewport }) => `${viewport}:${page}`),
  offenders: results
    .filter((result) => result.offenders?.length)
    .map(({ offenders, page, viewport }) => ({
      page,
      viewport,
      count: offenders.length,
      first: offenders[0],
    })),
  consoleErrors: results
    .filter((result) => result.consoleErrors?.length)
    .map(({ consoleErrors, page, viewport }) => ({
      page,
      viewport,
      consoleErrors,
    })),
  smallTargets: results
    .filter((result) => result.smallTargets?.length)
    .map(({ page, smallTargets, viewport }) => ({
      page,
      viewport,
      count: smallTargets.length,
    })),
};

await writeFile(
  resolve(outputDir, "results.json"),
  JSON.stringify({ summary, results }, null, 2),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));

if (
  summary.horizontalScroll.length ||
  summary.offenders.length ||
  summary.consoleErrors.length
) {
  process.exitCode = 1;
}
