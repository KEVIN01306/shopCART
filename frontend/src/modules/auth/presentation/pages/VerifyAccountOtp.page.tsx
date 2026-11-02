import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Link,
} from '@mui/material';
import { ArrowBack, MarkEmailReadOutlined, RefreshOutlined } from '@mui/icons-material';
import { OtpInput } from '../components/OtpInput.component';
import { sendOtp, verifyOtp } from '../../infrastructure/services/password-reset.service';
import { useAuthStore } from '../../../../core/store/authStore';

export const VerifyAccountOtpPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const email = (location.state as { email?: string })?.email || currentUser?.email || '';

    const [otpCode, setOtpCode] = useState('');
    const [serverError, setServerError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(60);

    useEffect(() => {
        document.title = 'Verificar Código OTP | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');
    }, []);

    // Redirect if no email is available
    useEffect(() => {
        if (!email) {
            navigate('/auth/verify-account', { replace: true });
        }
    }, [email, navigate]);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const interval = setInterval(() => {
            setCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleVerifyOtp = useCallback(
        async (codeToVerify?: string) => {
            const code = codeToVerify || otpCode;
            if (!code || code.length !== 6) {
                setServerError('Por favor, ingresa los 6 dígitos del código.');
                return;
            }

            setServerError(null);
            setInfoMessage(null);
            setIsVerifying(true);

            try {
                const response = await verifyOtp({ email, code, type: 'OTP' });

                if (response.verified && response.resetToken) {
                    navigate('/auth/verify-account/password', {
                        state: {
                            resetToken: response.resetToken,
                            email,
                        },
                        replace: true,
                    });
                } else {
                    setServerError('Código incorrecto o no verificado. Intenta nuevamente.');
                }
            } catch (err: any) {
                const message =
                    err.response?.data?.message ||
                    'El código ingresado es incorrecto o ha expirado. Verifica el código e intenta nuevamente.';
                setServerError(message);
            } finally {
                setIsVerifying(false);
            }
        },
        [email, otpCode, navigate]
    );

    const handleResendOtp = async () => {
        if (cooldown > 0 || isResending) return;

        setServerError(null);
        setInfoMessage(null);
        setIsResending(true);

        try {
            await sendOtp({ email, type: 'OTP' });
            setInfoMessage('Se ha enviado un nuevo código a tu correo electrónico.');
            setCooldown(60);
            setOtpCode('');
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                'No fue posible reenviar el código. Espera un momento antes de reintentar.';
            setServerError(message);
        } finally {
            setIsResending(false);
        }
    };

    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
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
                        {/* Mail Icon */}
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
                            <MarkEmailReadOutlined sx={{ fontSize: 28 }} />
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
                            Verifica tu Correo
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: '#718096',
                                mb: 3,
                                lineHeight: 1.6,
                            }}
                        >
                            Hemos enviado un código de seguridad de 6 dígitos a{' '}
                            <Box component="strong" sx={{ color: '#1a202c' }}>
                                {maskedEmail}
                            </Box>
                            . Ingrésalo a continuación para continuar con la activación.
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

                        {infoMessage && (
                            <Alert
                                severity="success"
                                sx={{
                                    mb: 3,
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                }}
                                onClose={() => setInfoMessage(null)}
                            >
                                {infoMessage}
                            </Alert>
                        )}

                        {/* OTP 6-Box Input Component */}
                        <Box sx={{ my: 3.5 }}>
                            <OtpInput
                                length={6}
                                value={otpCode}
                                onChange={(val) => {
                                    setOtpCode(val);
                                    if (serverError) setServerError(null);
                                    if (val.length === 6) {
                                        handleVerifyOtp(val);
                                    }
                                }}
                                disabled={isVerifying}
                                error={Boolean(serverError)}
                            />
                        </Box>

                        {/* Verify Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={() => handleVerifyOtp()}
                            disabled={isVerifying || otpCode.length !== 6}
                            startIcon={
                                isVerifying ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : undefined
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
                            {isVerifying ? 'Verificando código...' : 'Verificar código'}
                        </Button>

                        {/* Resend OTP Section */}
                        <Box
                            sx={{
                                mt: 3,
                                pt: 2.5,
                                borderTop: '1px solid #edf2f7',
                                textAlign: 'center',
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#718096',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                }}
                            >
                                ¿No recibiste el código?{' '}
                                {cooldown > 0 ? (
                                    <Typography
                                        component="span"
                                        variant="body2"
                                        sx={{
                                            color: '#a0aec0',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Reenviar en {cooldown}s
                                    </Typography>
                                ) : (
                                    <Link
                                        component="button"
                                        type="button"
                                        variant="body2"
                                        underline="hover"
                                        onClick={handleResendOtp}
                                        disabled={isResending}
                                        sx={{
                                            fontWeight: 600,
                                            color: '#0a6ef5',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                        }}
                                    >
                                        {isResending ? (
                                            <CircularProgress size={12} color="inherit" />
                                        ) : (
                                            <RefreshOutlined sx={{ fontSize: 14 }} />
                                        )}
                                        Reenviar código
                                    </Link>
                                )}
                            </Typography>
                        </Box>

                        {/* Back link */}
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Button
                                size="small"
                                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                                onClick={() => navigate('/auth/verify-account')}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    color: '#718096',
                                    fontWeight: 500,
                                }}
                            >
                                Volver al paso anterior
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default VerifyAccountOtpPage;
