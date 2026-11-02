import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    Stack,
} from '@mui/material';
import { CheckCircleOutlined, LoginOutlined } from '@mui/icons-material';
import { useAuthStore } from '../../../../core/store/authStore';

export const PasswordResetSuccessPage = () => {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((state) => state.clearAuth);

    useEffect(() => {
        document.title = 'Password Updated | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');

        // Clear existing session store because session in backend was invalidated
        clearAuth();
    }, [clearAuth]);

    const handleGoToLogin = () => {
        navigate('/auth/login', { replace: true });
    };

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
            <Box sx={{ width: '100%', maxWidth: 440 }}>
                <Card
                    sx={{
                        borderRadius: '16px',
                        border: '1px solid #d4e0ed',
                        boxShadow:
                            'rgba(71,103,136,0.04) 0px 4px 5px 0px, rgba(71,103,136,0.03) 0px 8px 15px 0px, rgba(71,103,136,0.08) 0px 30px 50px 0px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                    }}
                >
                    <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
                        {/* Success Icon */}
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                bgcolor: 'rgba(34, 197, 94, 0.1)',
                                color: 'success.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                            }}
                        >
                            <CheckCircleOutlined sx={{ fontSize: 44 }} />
                        </Box>

                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: '1.65rem',
                                fontWeight: 700,
                                color: '#0b3558',
                                mb: 1,
                            }}
                        >
                            ¡Contraseña actualizada!
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: '#476788',
                                fontSize: '13.5px',
                                lineHeight: 1.6,
                                mb: 4,
                            }}
                        >
                            Tu contraseña se cambió correctamente. Por motivos de seguridad, las sesiones activas han sido finalizadas. Puedes iniciar sesión ahora con tus nuevas credenciales.
                        </Typography>

                        <Stack spacing={2}>
                            <Button
                                id="go-to-login-btn"
                                variant="contained"
                                size="large"
                                fullWidth
                                onClick={handleGoToLogin}
                                startIcon={<LoginOutlined />}
                                sx={{
                                    py: 1.25,
                                    fontWeight: 600,
                                }}
                            >
                                Iniciar sesión
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default PasswordResetSuccessPage;
