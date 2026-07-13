export function getRoleLabel(role) {
    if (role === "ROLE_ADMIN") return "Administrador";
    if (role === "ROLE_WAREHOUSE_MANAGER") return "Bodeguero";
    if (role === "ROLE_USER") return "Usuario";

    return "Usuario";
}