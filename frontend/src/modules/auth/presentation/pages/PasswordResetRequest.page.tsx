import { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Link,
    Chip,
} from '@mui/material';
import { ArrowBack, EmailOutlined, SecurityOutlined } from '@mui/icons-material';
import {
    passwordResetRequestSchema,
    type PasswordResetRequestFormValues,
} from '../../domain/schemas/password-reset.schemas';
import { sendOtp } from '../../infrastructure/services/password-reset.service';
import { useAuthStore } from '../../../../core/store/authStore';

export const PasswordResetRequestPage = () => {
    const [serverError, setServerError] = useState<string | null>(null);
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        document.title = 'Reset Password | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');
    }, []);

    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<PasswordResetRequestFormValues>({
        resolver: zodResolver(passwordResetRequestSchema),
        defaultValues: {
            email: currentUser?.email || '',
        },
    });

    useEffect(() => {
        if (currentUser?.email) {
            setValue('email', currentUser.email);
        }
    }, [currentUser, setValue]);

    const onSubmit: SubmitHandler<PasswordResetRequestFormValues> = async (values) => {
        setServerError(null);
        try {
            const response = await sendOtp({ email: values.email, type: 'PASSWORD_RESET' });
            navigate('/auth/change-password/verify', {
                state: {
                    email: values.email,
                    expiresAt: response.expiresAt,
                    fromProfile: Boolean(currentUser),
                },
            });
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'No se pudo enviar el código de verificación. Por favor verifique el correo e intente de nuevo.';
            setServerError(message);
        }
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
                {/* Brand header */}
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
                        <SecurityOutlined sx={{ fontSize: 28 }} />
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
                        {currentUser ? 'Cambiar contraseña' : 'Reset your password'}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: '#476788', textAlign: 'center', maxWidth: 360, fontSize: '13px' }}
                    >
                        {currentUser
                            ? 'Enviaremos un código de seguridad de 6 dígitos a tu correo para verificar tu identidad.'
                            : 'Enter the email address associated with your account and we will send you a 6-digit verification code.'}
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
                                sx={{ mb: 3, borderRadius: 2 }}
                                onClose={() => setServerError(null)}
                            >
                                {serverError}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} noValidate>
                            <Stack sx={{ gap: 2.5 }}>
                                {currentUser ? (
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: '10px',
                                            bgcolor: '#f1f5f9',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                            Cuenta activa
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <EmailOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                                            <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'text.primary' }}>
                                                {currentUser.email}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label="Email verificado de sesión"
                                            size="small"
                                            sx={{ mt: 1, fontSize: '10px', height: 20, bgcolor: 'rgba(0,107,255,0.08)', color: 'primary.main' }}
                                        />
                                    </Box>
                                ) : (
                                    <Controller
                                        name="email"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                id="reset-email"
                                                label="Email address"
                                                type="email"
                                                autoComplete="email"
                                                autoFocus
                                                fullWidth
                                                error={!!errors.email}
                                                helperText={errors.email?.message}
                                            />
                                        )}
                                    />
                                )}

                                <Button
                                    id="reset-request-submit"
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    disabled={isSubmitting}
                                    startIcon={
                                        isSubmitting ? (
                                            <CircularProgress size={18} thickness={3} sx={{ color: '#ffffff' }} />
                                        ) : null
                                    }
                                    sx={{ mt: 0.5 }}
                                >
                                    {isSubmitting
                                        ? 'Enviando código...'
                                        : currentUser
                                            ? 'Enviar código de verificación'
                                            : 'Send verification code'}
                                </Button>
                            </Stack>
                        </form>

                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Link
                                component={RouterLink}
                                to={currentUser ? '/profile' : '/auth/login'}
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
                                {currentUser ? 'Volver a mi perfil' : 'Back to sign in'}
                            </Link>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default PasswordResetRequestPage;
