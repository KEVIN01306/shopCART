import { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockResetOutlined,
    CheckCircleOutlined,
} from '@mui/icons-material';
import {
    passwordResetNewSchema,
    type PasswordResetNewFormValues,
} from '../../domain/schemas/password-reset.schemas';
import { resetPassword } from '../../infrastructure/services/password-reset.service';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.component';
import { useAuthStore } from '../../../../core/store/authStore';

export const VerifyAccountPasswordPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const resetToken = (location.state as { resetToken?: string })?.resetToken || '';
    const email = (location.state as { email?: string })?.email || currentUser?.email || '';

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Establecer Nueva Contraseña | Asyncronix';
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
            navigate('/auth/verify-account', { replace: true });
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

    const newPasswordValue = watch('newPassword');

    const onSubmit: SubmitHandler<PasswordResetNewFormValues> = async (values) => {
        setServerError(null);
        try {
            await resetPassword({
                resetToken,
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword,
            });

            navigate('/auth/verify-account/success', { replace: true });
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                'No fue posible actualizar la contraseña. Verifica que tu contraseña temporal sea la correcta e intenta nuevamente.';
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
            <Box sx={{ width: '100%', maxWidth: 480 }}>
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
                        {/* Lock Reset Icon */}
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
                            <LockResetOutlined sx={{ fontSize: 28 }} />
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
                            Crea tu Nueva Contraseña
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: '#718096',
                                mb: 3,
                                lineHeight: 1.6,
                            }}
                        >
                            Ingresa la contraseña temporal enviada a tu correo ({email}) y define una contraseña nueva y segura para completar la activación de tu cuenta.
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

                        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                            <Stack spacing={2.5}>
                                {/* Current / Temporary Password */}
                                <Controller
                                    name="currentPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="activation-current-password"
                                            label="Contraseña actual / temporal"
                                            placeholder="Ingresa la contraseña temporal recibida por correo"
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            fullWidth
                                            required
                                            error={!!errors.currentPassword}
                                            helperText={errors.currentPassword?.message}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={() =>
                                                                    setShowCurrentPassword((prev) => !prev)
                                                                }
                                                                edge="end"
                                                                size="small"
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

                                {/* New Password */}
                                <Controller
                                    name="newPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="activation-new-password"
                                            label="Nueva contraseña"
                                            placeholder="Mínimo 8 caracteres"
                                            type={showNewPassword ? 'text' : 'password'}
                                            fullWidth
                                            required
                                            error={!!errors.newPassword}
                                            helperText={errors.newPassword?.message}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={() =>
                                                                    setShowNewPassword((prev) => !prev)
                                                                }
                                                                edge="end"
                                                                size="small"
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

                                {/* Password Strength Meter */}
                                <PasswordStrengthMeter password={newPasswordValue || ''} />

                                {/* Confirm New Password */}
                                <Controller
                                    name="confirmPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="activation-confirm-password"
                                            label="Confirmar nueva contraseña"
                                            placeholder="Repite la nueva contraseña"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            fullWidth
                                            required
                                            error={!!errors.confirmPassword}
                                            helperText={errors.confirmPassword?.message}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={() =>
                                                                    setShowConfirmPassword((prev) => !prev)
                                                                }
                                                                edge="end"
                                                                size="small"
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
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={isSubmitting}
                                    startIcon={
                                        isSubmitting ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <CheckCircleOutlined />
                                        )
                                    }
                                    sx={{
                                        py: 1.4,
                                        mt: 1,
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
                                    {isSubmitting ? 'Guardando contraseña...' : 'Activar cuenta y guardar contraseña'}
                                </Button>
                            </Stack>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default VerifyAccountPasswordPage;
