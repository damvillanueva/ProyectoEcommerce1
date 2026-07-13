const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_PREFIX = "smartlogix:geocode:";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(value, word) {
  const normalizedWord = word
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");

  return new RegExp(`\\b${normalizedWord}\\b`, "i").test(value);
}

function normalizeAddress(address) {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildSearchQuery(address, options = {}) {
  const {
    defaultCity = "Puente Alto",
    defaultRegion = "Region Metropolitana",
    defaultCountry = "Chile",
  } = options;

  let query = address
    .trim()
    .replace(/\bcomuna\b/gi, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,+/g, ",")
    .replace(/^,\s*|\s*,\s*$/g, "");

  if (defaultCity && !hasWord(query, defaultCity)) {
    query = `${query}, ${defaultCity}`;
  }

  if (defaultRegion && !hasWord(query, defaultRegion)) {
    query = `${query}, ${defaultRegion}`;
  }

  if (defaultCountry && !hasWord(query, defaultCountry)) {
    query = `${query}, ${defaultCountry}`;
  }

  return query;
}

function readCache(cacheKey) {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeCache(cacheKey, value) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(value));
  } catch {
    // Si el almacenamiento falla, el geocoding sigue funcionando sin cache.
  }
}

export async function geocodeAddress(address, options = {}) {
  const cleanAddress = address?.trim();

  if (!cleanAddress) {
    return null;
  }

  const searchQuery = buildSearchQuery(cleanAddress, options);
  const cacheKey = normalizeAddress(searchQuery);
  const cachedLocation = readCache(cacheKey);

  if (cachedLocation) {
    return cachedLocation;
  }

  const requestUrl = new URL(NOMINATIM_URL);
  requestUrl.searchParams.set("q", searchQuery);
  requestUrl.searchParams.set("format", "jsonv2");
  requestUrl.searchParams.set("limit", "1");
  requestUrl.searchParams.set("accept-language", "es");

  const response = await fetch(requestUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el mapa");
  }

  const results = await response.json();

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const location = {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    label: results[0].display_name,
  };

  writeCache(cacheKey, location);
  return location;
}
