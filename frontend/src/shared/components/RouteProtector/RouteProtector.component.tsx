import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/store/authStore';
import { hasRole, hasSomeRole } from '../../../core/utils/permissions';

interface RouteProtectorProps {
    requiredRole?: string | string[];
    children: ReactNode;
}

/**
 * RouteProtector — role-level guard for individual routes within FullLayout.
 *
 * ProtectedRoute handles authentication (token existence + session validity) for private routes.
 * RouteProtector handles role-based authorization ('Cliente' | 'Operador' | 'Administrador').
 */
const RouteProtector = ({ requiredRole, children }: RouteProtectorProps) => {
    const user = useAuthStore((state) => state.user);

    if (!requiredRole || (Array.isArray(requiredRole) && requiredRole.length === 0)) {
        return <>{children}</>;
    }

    const isAuthorized = Array.isArray(requiredRole)
        ? hasSomeRole(user, requiredRole)
        : hasRole(user, requiredRole);

    if (!isAuthorized) {
        return <Navigate to="/access-denied" replace />;
    }

    return <>{children}</>;
};

export default RouteProtector;
