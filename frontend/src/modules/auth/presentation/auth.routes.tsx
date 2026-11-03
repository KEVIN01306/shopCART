import type { RouteObject } from 'react-router-dom';
// import { Navigate } from 'react-router-dom';
import {
    LoginPage,
    // PasswordResetRequestPage,
    // PasswordResetVerifyPage,
    // PasswordResetNewPage,
    // PasswordResetSuccessPage,
    // VerifyAccountRequestPage,
    // VerifyAccountOtpPage,
    // VerifyAccountPasswordPage,
    // VerifyAccountSuccessPage,
} from './auth.lazy';

export const authRoutes: RouteObject[] = [
    {
        path: 'login',
        element: <LoginPage />,
    },
    {
        path: 'register',
        element: <LoginPage />,
    },
    // ── Rutas de verificación y recuperación de contraseña vía OTP deshabilitadas temporalmente ──
    // {
    //     path: 'verify-account',
    //     children: [
    //         {
    //             index: true,
    //             element: <VerifyAccountRequestPage />,
    //         },
    //         {
    //             path: 'otp',
    //             element: <VerifyAccountOtpPage />,
    //         },
    //         {
    //             path: 'password',
    //             element: <VerifyAccountPasswordPage />,
    //         },
    //         {
    //             path: 'success',
    //             element: <VerifyAccountSuccessPage />,
    //         },
    //     ],
    // },
    // {
    //     path: 'change-password',
    //     children: [
    //         {
    //             index: true,
    //             element: <PasswordResetRequestPage />,
    //         },
    //         {
    //             path: 'verify',
    //             element: <PasswordResetVerifyPage />,
    //         },
    //         {
    //             path: 'new',
    //             element: <PasswordResetNewPage />,
    //         },
    //         {
    //             path: 'success',
    //             element: <PasswordResetSuccessPage />,
    //         },
    //     ],
    // },
    // // Aliases for convenience
    // {
    //     path: 'reset-password',
    //     element: <Navigate to="/auth/change-password" replace />,
    // },
    // {
    //     path: 'forgot-password',
    //     element: <Navigate to="/auth/change-password" replace />,
    // },
];

