import { Navigate } from "react-router-dom";
import { getRoleFromToken } from "../utils/authTokenUtils";

function ProtectedRoute({ children, allowedRoles, loginPath = "/" }) {

    const token = localStorage.getItem("token");
    const role = getRoleFromToken(token);

    if (!token) {
        return <Navigate to={loginPath} />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to={role === "ROLE_CUSTOMER" ? "/shop" : "/dashboard"} />;
    }

    return children;
}

export default ProtectedRoute;
