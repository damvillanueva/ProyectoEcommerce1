export function getAuthToken() {
  return localStorage.getItem("token");
}

export function decodeAuthToken(token = getAuthToken()) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(paddedPayload));
  } catch (error) {
    console.error("Token invalido:", error);
    return null;
  }
}

export function getRoleFromToken(token = getAuthToken()) {
  const decoded = decodeAuthToken(token);

  return (
    decoded?.role ||
    decoded?.authority ||
    decoded?.roles?.[0] ||
    decoded?.authorities?.[0] ||
    null
  );
}

export function isAuthTokenExpired(token = getAuthToken()) {
  const decoded = decodeAuthToken(token);

  if (!decoded?.exp) return true;

  return decoded.exp * 1000 <= Date.now();
}

export function getUsernameFromToken(token = getAuthToken()) {
  const decoded = decodeAuthToken(token);

  return decoded?.sub || decoded?.username || null;
}
