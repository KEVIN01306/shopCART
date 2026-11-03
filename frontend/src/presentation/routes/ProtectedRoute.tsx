import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/store/authStore';
import { FullPageLoader } from '../../shared/components/loaders';
import { refreshSession } from '../../modules/auth/infrastructure/services/auth.service';

/**
 * ProtectedRoute — authentication guard for private routes (/profile, /users).
 *
 * Responsibilities:
 * 1. If accessToken exists but user is null (page reload), restores session via refreshSession().
 * 2. Shows FullPageLoader while session is being restored.
 * 3. If no token or refresh fails, redirects to /auth/login preserving location state.
 * 4. Redirects to /auth/verify-account if user.isVerify === false.
 * 5. Once authenticated, renders child routes.
 */
const ProtectedRoute = () => {
    const location = useLocation();
    const {
        accessToken,
        user,
        isRestoringSession,
        setAuth,
        setIsRestoringSession,
        clearAuth,
    } = useAuthStore();

    useEffect(() => {
        const restoreSession = async () => {
            if (accessToken && !user && !isRestoringSession) {
                setIsRestoringSession(true);
                try {
                    const session = await refreshSession();
                    setAuth(session.accessToken, session.user);
                } catch {
                    clearAuth();
                } finally {
                    setIsRestoringSession(false);
                }
            }
        };

        restoreSession();
    }, [accessToken, user, isRestoringSession, setAuth, setIsRestoringSession, clearAuth]);

    if (isRestoringSession || (accessToken && !user)) {
        return <FullPageLoader message="Restaurando sesión..." />;
    }

    if (!accessToken) {
        return (
            <Navigate
                to="/auth/login"
                replace
                state={{ from: location }}
            />
        );
    }

    // Nota: El flujo de verificación obligatoria por OTP está temporalmente deshabilitado
    // if (user && user.isVerify === false) {
    //     return (
    //         <Navigate
    //             to="/auth/verify-account"
    //             replace
    //             state={{ from: location }}
    //         />
    //     );
    // }

    return <Outlet />;
};

export default ProtectedRoute;
