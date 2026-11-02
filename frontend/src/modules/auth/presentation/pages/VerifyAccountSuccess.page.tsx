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

export const VerifyAccountSuccessPage = () => {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((state) => state.clearAuth);

    useEffect(() => {
        document.title = 'Cuenta Activada | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');

        // Clear existing session store so user logs in cleanly with activated account
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
            <Box sx={{ width: '100%', maxWidth: 460 }}>
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
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '2px solid rgba(34, 197, 94, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                                color: '#16a34a',
                            }}
                        >
                            <CheckCircleOutlined sx={{ fontSize: 40 }} />
                        </Box>

                        <Typography
                            variant="h5"
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                color: '#1a202c',
                                letterSpacing: '-0.4px',
                                mb: 1.5,
                            }}
                        >
                            ¡Cuenta Activada con Éxito!
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: '#718096',
                                mb: 4,
                                lineHeight: 1.6,
                            }}
                        >
                            Tu correo ha sido verificado y tu nueva contraseña ha sido configurada correctamente. Ya puedes acceder al sistema con tus nuevas credenciales.
                        </Typography>

                        <Stack spacing={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleGoToLogin}
                                startIcon={<LoginOutlined />}
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
                                Iniciar Sesión
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default VerifyAccountSuccessPage;
