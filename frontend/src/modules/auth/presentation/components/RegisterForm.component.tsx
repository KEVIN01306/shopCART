import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Box, TextField, Button, Typography, InputAdornment, IconButton,
    Alert, CircularProgress, Stack,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { registerSchema, type RegisterFormValues } from '../../domain/schemas/auth.schemas';
import { registerUser } from '../../infrastructure/services/auth.service';
import { useAuthStore } from '../../../../core/store/authStore';
import { useCartStore } from '../../../../core/store/cartStore';
interface RegisterFormProps {
    onSwitchToLogin: () => void;
}
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { setAuth } = useAuthStore();
    const syncCartOnAuth = useCartStore((state) => state.syncOnAuth);
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
    });
    const onSubmit = async (values: RegisterFormValues) => {
        setServerError(null);
        setSuccessMessage(null);
        try {
            const response = await registerUser({
                firstName: values.firstName, lastName: values.lastName,
                email: values.email, password: values.password,
            });
            setAuth(response.accessToken, response.user);
            try { await syncCartOnAuth(); } catch (err) { console.warn(err); }
            setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo...');
            setTimeout(() => navigate(from, { replace: true }), 800);
        } catch (err: any) {
            setServerError(err?.response?.data?.message || 'Error al crear la cuenta. Verifica tus datos o intenta más tarde.');
        }
    };
    const renderPasswordEndAdornment = (show: boolean, onToggle: () => void, id: string) => ({
        input: {
            endAdornment: (
                <InputAdornment position="end">
                    <IconButton id={id} onClick={onToggle} edge="end" size="small">
                        {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                </InputAdornment>
            ),
        },
    });
    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack sx={{ gap: 2 }}>
                {serverError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{serverError}</Alert>}
                {successMessage && <Alert severity="success" sx={{ borderRadius: '8px' }}>{successMessage}</Alert>}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Controller
                        name="firstName"
                        control={control}
                        render={({ field }) => (
                            <TextField {...field} id="register-firstname" label="Nombre" fullWidth error={!!errors.firstName} helperText={errors.firstName?.message} />
                        )}
                    />
                    <Controller
                        name="lastName"
                        control={control}
                        render={({ field }) => (
                            <TextField {...field} id="register-lastname" label="Apellido" fullWidth error={!!errors.lastName} helperText={errors.lastName?.message} />
                        )}
                    />
                </Stack>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} id="register-email" label="Correo electrónico" type="email" autoComplete="email" fullWidth error={!!errors.email} helperText={errors.email?.message} />
                    )}
                />
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            id="register-password"
                            label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            fullWidth
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            slotProps={renderPasswordEndAdornment(showPassword, () => setShowPassword((v) => !v), 'toggle-register-password')}
                        />
                    )}
                />
                <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            id="register-confirm-password"
                            label="Confirmar Contraseña"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            fullWidth
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword?.message}
                            slotProps={renderPasswordEndAdornment(showConfirmPassword, () => setShowConfirmPassword((v) => !v), 'toggle-register-confirm-password')}
                        />
                    )}
                />
                <Button
                    id="register-submit"
                    type="submit"
                    fullWidth
                    disabled={isSubmitting}
                    sx={{ borderRadius: '8px', bgcolor: '#425A8B', color: '#fff', fontWeight: 700, py: 1.25, textTransform: 'none', '&:hover': { bgcolor: '#2B3E66' } }}
                >
                    {isSubmitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Crear Cuenta (Registro Directo)'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>
                        ¿Ya tienes cuenta?{' '}
                        <Button variant="text" onClick={onSwitchToLogin} sx={{ textTransform: 'none', p: 0, fontWeight: 700, color: '#425A8B', '&:hover': { color: '#FD9636' } }}>
                            Iniciar Sesión
                        </Button>
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#8C9EC5' }}>
                        Al registrarte, aceptas los <RouterLink to="#" style={{ color: '#425A8B' }}>Términos de Servicio</RouterLink> y <RouterLink to="#" style={{ color: '#425A8B' }}>Política de Privacidad</RouterLink>.
                    </Typography>
                </Box>
            </Stack>
        </form>
    );
};
export default RegisterForm;
