import { useMemo } from "react";

export function useAuth() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username");

    return useMemo(() => ({
        token,
        role,
        username
    }), [token, role, username]);
}