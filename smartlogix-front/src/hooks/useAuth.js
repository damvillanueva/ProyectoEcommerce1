import { useMemo } from "react";
import { getRoleFromToken, getUsernameFromToken } from "../utils/authTokenUtils";

export function useAuth() {
    const token = localStorage.getItem("token");
    const role = getRoleFromToken(token);
    const username = getUsernameFromToken(token) || localStorage.getItem("username");

    return useMemo(() => ({
        token,
        role,
        username
    }), [token, role, username]);
}
