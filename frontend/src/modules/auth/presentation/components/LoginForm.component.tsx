import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Box, TextField, Button, Typography, InputAdornment, IconButton,
    Alert, CircularProgress, Stack, Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, StorefrontOutlined } from '@mui/icons-material';
import { loginSchema, type LoginFormValues } from '../../domain/schemas/auth.schemas';
import { loginUser } from '../../infrastructure/services/auth.service';
import { useAuthStore } from '../../../../core/store/authStore';
import { useCartStore } from '../../../../core/store/cartStore';
interface LoginFormProps {
    onSwitchToRegister: () => void;
}
export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const { setAuth } = useAuthStore();
    const syncCartOnAuth = useCartStore((state) => state.syncOnAuth);
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });
    const onSubmit = async (values: LoginFormValues) => {
        setServerError(null);
        try {
            const response = await loginUser(values);
            setAuth(response.accessToken, response.user);
            try { await syncCartOnAuth(); } catch (err) { console.warn(err); }
            navigate(from, { replace: true });
        } catch (err: any) {
            setServerError(err?.response?.data?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        }
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack sx={{ gap: 2 }}>
                {serverError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{serverError}</Alert>}
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            id="login-email"
                            label="Correo electrónico"
                            type="email"
                            autoComplete="email"
                            fullWidth
                            error={!!errors.email}
                            helperText={errors.email?.message}
                        />
                    )}
                />
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            id="login-password"
                            label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            fullWidth
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton id="toggle-login-password" onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    )}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
                    <Button
                        variant="text"
                        size="small"
                        onClick={() => navigate('/auth/change-password')}
                        sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 600, color: '#425A8B', p: 0, '&:hover': { color: '#FD9636' } }}
                    >
                        ¿Olvidaste tu contraseña?
                    </Button>
                </Box>
                <Button
                    id="login-submit"
                    type="submit"
                    fullWidth
                    disabled={isSubmitting}
                    sx={{ borderRadius: '8px', bgcolor: '#425A8B', color: '#fff', fontWeight: 700, py: 1.25, textTransform: 'none', '&:hover': { bgcolor: '#2B3E66' } }}
                >
                    {isSubmitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Iniciar Sesión'}
                </Button>
                <Box sx={{ my: 0.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Divider sx={{ flex: 1 }} /><Typography variant="caption" sx={{ color: '#8C9EC5' }}>o</Typography><Divider sx={{ flex: 1 }} />
                </Box>
                <Button
                    id="login-continue-guest"
                    fullWidth
                    startIcon={<StorefrontOutlined sx={{ fontSize: 18, color: '#FD9636' }} />}
                    onClick={() => navigate('/')}
                    sx={{ borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #D5DFE4', color: '#425A8B', fontWeight: 700, py: 1.1, textTransform: 'none', '&:hover': { bgcolor: '#EFF3F8' } }}
                >
                    Continuar como invitado
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>
                        ¿No tienes una cuenta?{' '}
                        <Button variant="text" onClick={onSwitchToRegister} sx={{ textTransform: 'none', p: 0, fontWeight: 700, color: '#425A8B', '&:hover': { color: '#FD9636' } }}>
                            Crear una cuenta
                        </Button>
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#8C9EC5' }}>
                        Al iniciar sesión, aceptas los <RouterLink to="#" style={{ color: '#425A8B' }}>Términos de Servicio</RouterLink> y <RouterLink to="#" style={{ color: '#425A8B' }}>Política de Privacidad</RouterLink>.
                    </Typography>
                </Box>
            </Stack>
        </form>
    );
};
export default LoginForm;
