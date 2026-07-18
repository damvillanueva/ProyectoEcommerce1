import { Navigate } from "react-router-dom";
import { clearLogin } from "../services/authService";
import { getRoleFromToken, isAuthTokenExpired } from "../utils/authTokenUtils";

function ProtectedRoute({ children, allowedRoles, loginPath = "/" }) {

    const token = localStorage.getItem("token");
    const role = getRoleFromToken(token);

    if (!token || isAuthTokenExpired(token)) {
        clearLogin();
        return <Navigate to={loginPath} />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to={role === "ROLE_CUSTOMER" ? "/shop" : "/dashboard"} />;
    }

    return children;
}

export default ProtectedRoute;
