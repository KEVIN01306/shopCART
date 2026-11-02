import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Chip,
} from '@mui/material';
import { SecurityOutlined, SendOutlined, LogoutOutlined } from '@mui/icons-material';
import { sendOtp } from '../../infrastructure/services/password-reset.service';
import { useAuthStore } from '../../../../core/store/authStore';

export const VerifyAccountRequestPage = () => {
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { user: currentUser, clearAuth } = useAuthStore();

    useEffect(() => {
        document.title = 'Activación de Cuenta | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');
    }, []);

    const userEmail = currentUser?.email || '';

    const handleSendOtp = async () => {
        if (!userEmail) {
            setServerError('No se encontró el correo del usuario en sesión. Inicie sesión nuevamente.');
            return;
        }

        setServerError(null);
        setIsSubmitting(true);
        try {
            await sendOtp({ email: userEmail, type: 'OTP' });
            navigate('/auth/verify-account/otp', {
                state: { email: userEmail },
            });
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                'No fue posible enviar el código de verificación. Inténtalo nuevamente.';
            setServerError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = () => {
        clearAuth();
        navigate('/auth/login', { replace: true });
    };

    const maskedEmail = userEmail
        ? userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : 'tu correo electrónico';

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 460 }}>
                {/* Brand header */}
                <Stack sx={{ alignItems: 'center', mb: 3.5, gap: 1 }}>
                    <Box
                        component="img"
                        src="/logo.png"
                        alt="Logo"
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '12px',
                            objectFit: 'contain',
                        }}
                    />
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 700,
                            color: '#1a202c',
                            letterSpacing: '-0.3px',
                        }}
                    >
                        Asyncronix CAD
                    </Typography>
                </Stack>

                <Card
                    sx={{
                        borderRadius: '16px',
                        border: '1px solid #d4e0ed',
                        boxShadow:
                            'rgba(71,103,136,0.04) 0px 4px 5px 0px, rgba(71,103,136,0.03) 0px 8px 15px 0px, rgba(71,103,136,0.08) 0px 30px 50px 0px',
                        backgroundColor: '#ffffff',
                    }}
                >
                    <CardContent sx={{ p: { xs: 3.5, sm: 4.5 } }}>
                        {/* Security Icon */}
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '14px',
                                backgroundColor: 'rgba(10, 110, 245, 0.08)',
                                border: '1px solid rgba(10, 110, 245, 0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2.5,
                                color: '#0a6ef5',
                            }}
                        >
                            <SecurityOutlined sx={{ fontSize: 28 }} />
                        </Box>

                        <Typography
                            variant="h5"
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                color: '#1a202c',
                                letterSpacing: '-0.4px',
                                mb: 1,
                            }}
                        >
                            Activación de Cuenta
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: '#718096',
                                mb: 3,
                                lineHeight: 1.6,
                            }}
                        >
                            Por motivos de seguridad, para comenzar a utilizar tu cuenta debes verificar tu correo electrónico y crear una contraseña definitiva.
                        </Typography>

                        {serverError && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 3,
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                }}
                                onClose={() => setServerError(null)}
                            >
                                {serverError}
                            </Alert>
                        )}

                        {/* Email display pill */}
                        <Box
                            sx={{
                                p: 2,
                                mb: 3,
                                borderRadius: '12px',
                                backgroundColor: '#f0f4f8',
                                border: '1px solid #dce4ec',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    fontWeight: 600,
                                    color: '#4a5568',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    mb: 0.5,
                                }}
                            >
                                Cuenta a activar
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1a202c',
                                    }}
                                >
                                    {maskedEmail}
                                </Typography>
                                <Chip
                                    label="Pendiente de verificación"
                                    size="small"
                                    color="warning"
                                    sx={{
                                        height: 20,
                                        fontSize: '11px',
                                        fontWeight: 600,
                                    }}
                                />
                            </Stack>
                        </Box>

                        <Stack spacing={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleSendOtp}
                                disabled={isSubmitting}
                                startIcon={
                                    isSubmitting ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : (
                                        <SendOutlined />
                                    )
                                }
                                sx={{
                                    py: 1.4,
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    backgroundColor: '#0a6ef5',
                                    boxShadow: '0 4px 12px rgba(10, 110, 245, 0.28)',
                                    '&:hover': {
                                        backgroundColor: '#0858c7',
                                    },
                                }}
                            >
                                {isSubmitting ? 'Enviando código...' : 'Enviar código de verificación'}
                            </Button>

                            <Button
                                fullWidth
                                variant="outlined"
                                size="medium"
                                onClick={handleLogout}
                                startIcon={<LogoutOutlined />}
                                sx={{
                                    py: 1,
                                    borderRadius: '10px',
                                    fontWeight: 500,
                                    fontSize: '13px',
                                    textTransform: 'none',
                                    color: '#718096',
                                    borderColor: '#d4e0ed',
                                    '&:hover': {
                                        borderColor: '#cbd5e0',
                                        backgroundColor: '#f7fafc',
                                    },
                                }}
                            >
                                Cerrar sesión / Cambiar de cuenta
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default VerifyAccountRequestPage;
