import { loginRequest } from "../api/authApi"

export async function login({ credential, password }) {
    const cleanCredential = credential.trim()
    const cleanPassword = password.trim()

    if(!cleanCredential || !cleanPassword){
        throw new Error("Ingrese usuario y password")
    }

    // El service aplica reglas de negocio y delega la solicitud HTTP al API.
    return loginRequest({
        credential: cleanCredential,
        password: cleanPassword
    })
}

export function saveLoginSession(loginResponse){
    if(!loginResponse?.token){
        throw new Error("El backend no entregó token")
    }

    localStorage.setItem("token", loginResponse.token)
    localStorage.setItem("role", loginResponse.role)
    localStorage.setItem("username", loginResponse.username)

    localStorage.setItem("user",
        JSON.stringify({
            username: loginResponse.username,
            role: loginResponse.role,
            tokenType: loginResponse.tokenType,
            expiresInMs: loginResponse.expiresInMs
        })
    )
}

export function getSaveToken() {
    return localStorage.getItem("token")
}

export function getSaveUser() {
    try {
        return JSON.parse(localStorage.getItem("user"))
    } catch {
        return null
    }
}

export function getAuthorizationHeader() {
    const token = getSaveToken()
    const user = getSaveUser()

    if(!token){
        return null
    }

    const tokenType = user?.tokenType || "Bearer"
    return `${tokenType} ${token}`
}

export function getRequiredAuthorizationHeader() {
    const authorizationHeader = getAuthorizationHeader()

    if(!authorizationHeader){
        throw new Error("No hay token guardado")
    }

    return authorizationHeader
}

export function clearLogin() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
}
