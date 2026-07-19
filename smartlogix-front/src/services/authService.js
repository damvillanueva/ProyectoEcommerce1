import {
  loginRequest,
  logoutRequest,
  registerRequest,
  requestPasswordResetRequest,
  resendVerificationRequest,
} from "../api/authApi";

export async function login({ credential, password }) {
  const cleanCredential = credential.trim();
  const cleanPassword = password.trim();
  if (!cleanCredential || !cleanPassword) {
    throw new Error("Ingresa usuario y contrasena");
  }
  return loginRequest({ credential: cleanCredential, password: cleanPassword });
}

export function saveLoginSession(loginResponse) {
  if (!loginResponse?.token) {
    throw new Error("El backend no entrego un token");
  }
  localStorage.setItem("token", loginResponse.token);
  localStorage.setItem("username", loginResponse.username);
  localStorage.removeItem("role");
  localStorage.setItem("user", JSON.stringify({
    username: loginResponse.username,
    role: loginResponse.role,
    expiresInMs: loginResponse.expiresInMs,
  }));
}

export function getSaveToken() {
  return localStorage.getItem("token");
}

export function getSaveUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function getAuthorizationHeader() {
  const token = getSaveToken();
  return token ? `Bearer ${token}` : null;
}

export function getRequiredAuthorizationHeader() {
  const authorizationHeader = getAuthorizationHeader();
  if (!authorizationHeader) {
    throw new Error("No hay token guardado");
  }
  return authorizationHeader;
}

export function clearLogin() {
  logoutRequest().catch(() => undefined);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
}

export async function registerCustomer({ username, email, password }) {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    throw new Error("Completa usuario, correo y contrasena");
  }
  return registerRequest({
    username: cleanUsername,
    email: cleanEmail,
    password: cleanPassword,
  });
}

export function requestPasswordReset(email) {
  return requestPasswordResetRequest(email.trim().toLowerCase());
}

export function resendVerification(email) {
  return resendVerificationRequest(email.trim().toLowerCase());
}
