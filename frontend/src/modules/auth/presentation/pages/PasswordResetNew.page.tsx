import { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
    Stack,
    Link,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockResetOutlined,
    ArrowBack,
} from '@mui/icons-material';
import {
    passwordResetNewSchema,
    type PasswordResetNewFormValues,
} from '../../domain/schemas/password-reset.schemas';
import { resetPassword } from '../../infrastructure/services/password-reset.service';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.component';
import { useAuthStore } from '../../../../core/store/authStore';

export const PasswordResetNewPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const resetToken = (location.state as { resetToken?: string })?.resetToken || '';
    const email = (location.state as { email?: string })?.email || currentUser?.email || '';
    const fromProfile = (location.state as { fromProfile?: boolean })?.fromProfile ?? Boolean(currentUser);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Set New Password | Asyncronix';
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');
    }, []);

    // Redirect if reset token is missing
    useEffect(() => {
        if (!resetToken) {
            navigate('/auth/change-password', { replace: true });
        }
    }, [resetToken, navigate]);

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<PasswordResetNewFormValues>({
        resolver: zodResolver(passwordResetNewSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const watchedNewPassword = watch('newPassword', '');

    const onSubmit: SubmitHandler<PasswordResetNewFormValues> = async (values) => {
        setServerError(null);
        try {
            await resetPassword({
                resetToken,
                currentPassword: values.currentPassword || undefined,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword,
            });

            navigate('/auth/change-password/success', {
                state: {
                    fromProfile,
                    email,
                },
            });
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Error al actualizar la contraseña. Por favor verifique los datos e intente nuevamente.';
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
            <Box sx={{ width: '100%', maxWidth: 460 }}>
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
                        <LockResetOutlined sx={{ fontSize: 28 }} />
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
                        Establecer nueva contraseña
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: '#476788', textAlign: 'center', maxWidth: 380, fontSize: '13px' }}
                    >
                        Crea una contraseña segura para tu cuenta. Tu sesión previa será finalizada por seguridad.
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
                                {fromProfile && (
                                    <Controller
                                        name="currentPassword"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                id="current-password"
                                                label="Contraseña actual"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                fullWidth
                                                error={!!errors.currentPassword}
                                                helperText={errors.currentPassword?.message}
                                                slotProps={{
                                                    input: {
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    aria-label="mostrar u ocultar contraseña actual"
                                                                    onClick={() => setShowCurrentPassword((v) => !v)}
                                                                    edge="end"
                                                                    size="small"
                                                                    tabIndex={-1}
                                                                >
                                                                    {showCurrentPassword ? (
                                                                        <VisibilityOff fontSize="small" />
                                                                    ) : (
                                                                        <Visibility fontSize="small" />
                                                                    )}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                )}

                                <Box>
                                    <Controller
                                        name="newPassword"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                id="new-password"
                                                label="Nueva contraseña"
                                                type={showNewPassword ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                autoFocus={!fromProfile}
                                                fullWidth
                                                error={!!errors.newPassword}
                                                helperText={
                                                    errors.newPassword?.message || 'Mínimo 8 caracteres'
                                                }
                                                slotProps={{
                                                    input: {
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    aria-label="mostrar u ocultar nueva contraseña"
                                                                    onClick={() => setShowNewPassword((v) => !v)}
                                                                    edge="end"
                                                                    size="small"
                                                                    tabIndex={-1}
                                                                >
                                                                    {showNewPassword ? (
                                                                        <VisibilityOff fontSize="small" />
                                                                    ) : (
                                                                        <Visibility fontSize="small" />
                                                                    )}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                    <PasswordStrengthMeter password={watchedNewPassword} />
                                </Box>

                                <Controller
                                    name="confirmPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="confirm-password"
                                            label="Confirmar nueva contraseña"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            fullWidth
                                            error={!!errors.confirmPassword}
                                            helperText={errors.confirmPassword?.message}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                aria-label="mostrar u ocultar confirmación de contraseña"
                                                                onClick={() => setShowConfirmPassword((v) => !v)}
                                                                edge="end"
                                                                size="small"
                                                                tabIndex={-1}
                                                            >
                                                                {showConfirmPassword ? (
                                                                    <VisibilityOff fontSize="small" />
                                                                ) : (
                                                                    <Visibility fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                },
                                            }}
                                        />
                                    )}
                                />

                                <Button
                                    id="reset-password-submit"
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
                                    sx={{ mt: 1 }}
                                >
                                    {isSubmitting ? 'Guardando contraseña...' : 'Actualizar contraseña'}
                                </Button>
                            </Stack>
                        </form>

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
                                Cancelar y reiniciar
                            </Link>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default PasswordResetNewPage;
