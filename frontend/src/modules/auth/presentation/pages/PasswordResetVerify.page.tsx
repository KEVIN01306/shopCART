import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
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

export const PasswordResetVerifyPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const email = (location.state as { email?: string })?.email || currentUser?.email || '';
    const fromProfile = (location.state as { fromProfile?: boolean })?.fromProfile ?? Boolean(currentUser);

    const [otpCode, setOtpCode] = useState('');
    const [serverError, setServerError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(60);

    useEffect(() => {
        document.title = 'Verify Security Code | Asyncronix';
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
            navigate('/auth/change-password', { replace: true });
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

    const maskEmail = (val: string) => {
        if (!val) return '';
        const [userPart, domainPart] = val.split('@');
        if (!domainPart) return val;
        const visible = userPart.slice(0, 2);
        return `${visible}***@${domainPart}`;
    };

    const handleVerify = async (codeToVerify?: string) => {
        const code = (codeToVerify || otpCode).trim();
        if (code.length !== 6) {
            setServerError('Por favor ingresa el código completo de 6 dígitos');
            return;
        }

        setServerError(null);
        setInfoMessage(null);
        setIsVerifying(true);

        try {
            const response = await verifyOtp({
                email,
                code,
                type: 'PASSWORD_RESET',
            });

            if (response.verified && response.resetToken) {
                navigate('/auth/change-password/new', {
                    state: {
                        email,
                        resetToken: response.resetToken,
                        fromProfile,
                    },
                });
            } else {
                setServerError('Código de verificación inválido');
            }
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Código incorrecto o expirado. Por favor intente nuevamente.';
            setServerError(message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleOtpChange = (newVal: string) => {
        setOtpCode(newVal);
        if (serverError) setServerError(null);
        if (newVal.length === 6) {
            handleVerify(newVal);
        }
    };

    const handleResend = useCallback(async () => {
        if (cooldown > 0 || isResending) return;
        setIsResending(true);
        setServerError(null);
        setInfoMessage(null);

        try {
            await sendOtp({ email, type: 'PASSWORD_RESET' });
            setCooldown(60);
            setInfoMessage('Nuevo código de verificación enviado a tu correo.');
            setOtpCode('');
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Error al reenviar el código. Por favor intente más tarde.';
            setServerError(message);
        } finally {
            setIsResending(false);
        }
    }, [cooldown, isResending, email]);

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
                {/* Header */}
                <Stack sx={{ alignItems: 'center', mb: 3.5, gap: 1 }}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '14px',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(0, 107, 255, 0.25)',
                            mb: 0.5,
                        }}
                    >
                        <MarkEmailReadOutlined sx={{ fontSize: 28 }} />
                    </Box>
                    <Typography
                        variant="h2"
                        sx={{
                            fontSize: '1.65rem',
                            fontWeight: 700,
                            color: '#0b3558',
                            textAlign: 'center',
                        }}
                    >
                        Verifica tu identidad
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: '#476788', textAlign: 'center', maxWidth: 360, fontSize: '13px' }}
                    >
                        Hemos enviado un código de 6 dígitos a{' '}
                        <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            {maskEmail(email)}
                        </Box>
                        . Ingresa el código para continuar.
                    </Typography>
                </Stack>

                {/* Card */}
                <Card
                    sx={{
                        borderRadius: '16px',
                        border: '1px solid #d4e0ed',
                        boxShadow:
                            'rgba(71,103,136,0.04) 0px 4px 5px 0px, rgba(71,103,136,0.03) 0px 8px 15px 0px, rgba(71,103,136,0.08) 0px 30px 50px 0px',
                        backgroundColor: '#ffffff',
                    }}
                >
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        {serverError && (
                            <Alert
                                severity="error"
                                sx={{ mb: 2.5, borderRadius: 2 }}
                                onClose={() => setServerError(null)}
                            >
                                {serverError}
                            </Alert>
                        )}

                        {infoMessage && (
                            <Alert
                                severity="success"
                                sx={{ mb: 2.5, borderRadius: 2 }}
                                onClose={() => setInfoMessage(null)}
                            >
                                {infoMessage}
                            </Alert>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleVerify();
                            }}
                            noValidate
                        >
                            <Stack sx={{ gap: 2.5, alignItems: 'center' }}>
                                <OtpInput
                                    value={otpCode}
                                    onChange={handleOtpChange}
                                    length={6}
                                    disabled={isVerifying}
                                    error={Boolean(serverError)}
                                    autoFocus
                                />

                                <Button
                                    id="verify-otp-submit"
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    disabled={isVerifying || otpCode.length !== 6}
                                    startIcon={
                                        isVerifying ? (
                                            <CircularProgress size={18} thickness={3} sx={{ color: '#ffffff' }} />
                                        ) : null
                                    }
                                >
                                    {isVerifying ? 'Verificando código...' : 'Verificar código'}
                                </Button>
                            </Stack>
                        </form>

                        {/* Cooldown and Resend */}
                        <Box
                            sx={{
                                mt: 3,
                                pt: 2.5,
                                borderTop: '1px solid #eef2f6',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Typography variant="body2" sx={{ fontSize: '13px', color: 'text.secondary' }}>
                                ¿No recibiste el código?
                            </Typography>

                            {cooldown > 0 ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#476788',
                                        bgcolor: '#f1f5f9',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                    }}
                                >
                                    Puedes solicitar un nuevo código en {cooldown}s
                                </Typography>
                            ) : (
                                <Button
                                    id="resend-otp-btn"
                                    variant="text"
                                    size="small"
                                    onClick={handleResend}
                                    disabled={isResending}
                                    startIcon={
                                        isResending ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : (
                                            <RefreshOutlined fontSize="small" />
                                        )
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                    }}
                                >
                                    Reenviar código
                                </Button>
                            )}
                        </Box>

                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Link
                                component={RouterLink}
                                to="/auth/change-password"
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        color: 'primary.main',
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                <ArrowBack sx={{ fontSize: 16 }} />
                                Cambiar correo
                            </Link>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default PasswordResetVerifyPage;
