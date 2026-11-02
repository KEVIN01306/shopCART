import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Stack } from '@mui/material';
import { LockOutlined, HomeOutlined } from '@mui/icons-material';

const AccessDeniedPage = () => {
    const navigate = useNavigate();

    return (
        <Box
            id="access-denied-page"
            sx={{
                minHeight: '70vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafaf9',
                p: 3,
            }}
        >
            <Stack
                sx={{
                    alignItems: 'center',
                    gap: 2.5,
                    maxWidth: 480,
                    textAlign: 'center',
                    p: 4,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8e6e5',
                    borderRadius: '10px',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 16px 0px',
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: '#fafaf9',
                        border: '1px solid #e8e6e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <LockOutlined sx={{ fontSize: 28, color: '#0c0a09' }} />
                </Box>

                <Typography
                    variant="overline"
                    sx={{ color: '#78716c', letterSpacing: '0.1em', fontSize: '11px' }}
                >
                    Error 403 · Acceso Restringido
                </Typography>

                <Typography
                    component="h1"
                    sx={{
                        fontFamily: 'var(--font-roobert), Inter, sans-serif',
                        color: '#0c0a09',
                        fontSize: '32px',
                        fontWeight: 400,
                        letterSpacing: '-0.8px',
                    }}
                >
                    Acceso{' '}
                    <Box component="span" className="seline-highlight">
                        denegado
                    </Box>
                </Typography>

                <Typography
                    sx={{ color: '#78716c', fontSize: '14px', lineHeight: 1.64, maxWidth: 400 }}
                >
                    Tu rol actual no cuenta con los privilegios necesarios para acceder a esta sección. Puedes volver al catálogo público de productos.
                </Typography>

                <Button
                    id="access-denied-go-home"
                    startIcon={<HomeOutlined sx={{ fontSize: 18 }} />}
                    onClick={() => navigate('/', { replace: true })}
                    sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#3ba6f1',
                        border: '1px solid #3398e1',
                        color: '#ffffff',
                        fontWeight: 500,
                        fontSize: '14px',
                        px: 2.5,
                        py: 1,
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: '#3398e1',
                        },
                    }}
                >
                    Ir al Catálogo
                </Button>
            </Stack>
        </Box>
    );
};

export default AccessDeniedPage;
