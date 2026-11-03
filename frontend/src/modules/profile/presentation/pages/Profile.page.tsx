import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
    // Button,
} from '@mui/material';
import {
    PersonOutlineOutlined,
    EmailOutlined,
    StorefrontOutlined,
    BadgeOutlined,
    SecurityOutlined,
    CheckCircle,
    CalendarMonthOutlined,
    ContentCopyOutlined,
    MenuBookOutlined,
    FingerprintOutlined,
    Check,
    // LockResetOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../../../core/store/authStore';
import { getCurrentUser } from '../../../auth/infrastructure/services/auth.service';
import type { AuthUser } from '../../../auth/domain/interfaces/auth.interfaces';

interface ProfileRowProps {
    icon?: React.ReactNode;
    label: string;
    value: React.ReactNode;
    isLast?: boolean;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value, isLast = false }) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            py: 1.75,
            px: { xs: 2.5, sm: 3 },
            borderBottom: isLast ? 'none' : '1px solid #e8e6e5',
            transition: 'background-color 0.15s ease',
            '&:hover': {
                bgcolor: '#fafaf9',
            },
            gap: 1,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 240 }}>
            {icon && (
                <Box sx={{ color: '#78716c', display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                    {icon}
                </Box>
            )}
            <Typography
                variant="body2"
                sx={{
                    color: '#78716c',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04rem',
                    fontSize: '11px',
                }}
            >
                {label}
            </Typography>
        </Box>

        <Box
            sx={{
                color: '#0c0a09',
                fontWeight: 450,
                fontSize: '13px',
                textAlign: { xs: 'left', sm: 'right' },
                wordBreak: 'break-word',
            }}
        >
            {value || '-'}
        </Box>
    </Box>
);

const SelineProfileCard: React.FC<{
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
    <Paper
        elevation={0}
        sx={{
            border: '1px solid #e8e6e5',
            borderRadius: '10px',
            overflow: 'hidden',
            mb: 3,
            bgcolor: '#ffffff',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 16px 0px',
        }}
    >
        <Box sx={{ p: { xs: 2.5, sm: 3 }, pb: 2, borderBottom: '1px solid #e8e6e5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                {icon && (
                    <Box sx={{ color: '#3ba6f1', display: 'flex', alignItems: 'center', fontSize: 18 }}>
                        {icon}
                    </Box>
                )}
                <Typography
                    sx={{
                        fontFamily: 'var(--font-roobert), Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '18px',
                        letterSpacing: '-0.25px',
                        color: '#0c0a09',
                    }}
                >
                    {title}
                </Typography>
            </Box>
            {subtitle && (
                <Typography variant="body2" sx={{ color: '#78716c', fontSize: '13px' }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
        <Box>{children}</Box>
    </Paper>
);

export const ProfilePage: React.FC = () => {
    // const navigate = useNavigate();
    const { user: cachedUser, accessToken, setUser } = useAuthStore();
    const [profile, setProfile] = useState<AuthUser | null>(cachedUser);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'info' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'info',
    });

    useEffect(() => {
        if (!accessToken) return;

        const loadProfile = async () => {
            setLoading(true);
            try {
                const freshUser = await getCurrentUser(accessToken);
                setProfile(freshUser);
                setUser(freshUser);
            } catch {
                setError('Error al actualizar la información del perfil');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [accessToken, setUser]);

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setSnackbar({
            open: true,
            message: 'ID copiado al portapapeles',
            severity: 'info',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const displayUser = profile || cachedUser;

    if (loading && !displayUser) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress sx={{ color: '#3ba6f1' }} />
            </Box>
        );
    }

    if (!displayUser) return null;

    const initials = displayUser.name
        ? displayUser.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
        : (displayUser.email?.charAt(0).toUpperCase() || 'U');

    const firstName = displayUser.firstName || displayUser.name?.split(' ')[0] || '';
    const lastName = displayUser.lastName || displayUser.name?.split(' ').slice(1).join(' ') || '';
    const rolesList =
        displayUser.roles && displayUser.roles.length > 0
            ? displayUser.roles
            : displayUser.role
            ? [displayUser.role]
            : ['Cliente'];

    const formattedDate = displayUser.createdAt
        ? new Date(displayUser.createdAt).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Activo en el sistema';

    return (
        <Box sx={{ maxWidth: 960, mx: 'auto', py: 2, px: { xs: 1, sm: 3 } }}>
            {error && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Header Banner */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    py: 4,
                    px: 3,
                    mb: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e8e6e5',
                    borderRadius: '10px',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 16px 0px',
                }}
            >
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#1c1917',
                        color: '#ffffff',
                        fontSize: '1.75rem',
                        fontWeight: 500,
                        mb: 2,
                        border: '1px solid #e8e6e5',
                    }}
                >
                    {initials}
                </Avatar>

                <Typography
                    component="h1"
                    sx={{
                        fontFamily: 'var(--font-roobert), Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '28px',
                        letterSpacing: '-0.64px',
                        mb: 0.5,
                        color: '#0c0a09',
                    }}
                >
                    {displayUser.name}
                </Typography>

                <Typography variant="body1" sx={{ color: '#78716c', fontSize: '14px', mb: 2 }}>
                    {displayUser.email}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {rolesList.map((role) => (
                        <Chip
                            key={role}
                            icon={<SecurityOutlined sx={{ fontSize: 15, color: '#3398e1 !important' }} />}
                            label={role}
                            size="small"
                            sx={{
                                fontWeight: 500,
                                fontSize: '11px',
                                borderRadius: '9999px',
                                bgcolor: '#c1e1f7',
                                color: '#3398e1',
                                border: '1px solid rgba(51, 152, 225, 0.25)',
                            }}
                        />
                    ))}

                    <Chip
                        icon={<CheckCircle sx={{ fontSize: 15, color: '#0c0a09 !important' }} />}
                        label={displayUser.isActive !== false ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                        size="small"
                        variant="outlined"
                        sx={{
                            fontWeight: 500,
                            fontSize: '11px',
                            borderRadius: '9999px',
                            borderColor: '#e8e6e5',
                            color: '#0c0a09',
                            bgcolor: '#fafaf9',
                        }}
                    />

                    <Chip
                        icon={<StorefrontOutlined sx={{ fontSize: 15, color: '#78716c !important' }} />}
                        label="ShopCart E-Commerce"
                        variant="outlined"
                        size="small"
                        sx={{
                            fontWeight: 400,
                            fontSize: '11px',
                            borderRadius: '9999px',
                            borderColor: '#e8e6e5',
                            color: '#78716c',
                            bgcolor: '#fafaf9',
                        }}
                    />
                </Box>
            </Box>

            {/* Card 1: Información Personal Básica */}
            <SelineProfileCard
                title="Información personal"
                subtitle="Información básica de tu identidad en ShopCart"
                icon={<PersonOutlineOutlined />}
            >
                <ProfileRow
                    icon={<PersonOutlineOutlined />}
                    label="Nombre Completo"
                    value={displayUser.name}
                />
                {firstName && (
                    <ProfileRow
                        icon={<PersonOutlineOutlined />}
                        label="Nombres"
                        value={firstName}
                    />
                )}
                {lastName && (
                    <ProfileRow
                        icon={<PersonOutlineOutlined />}
                        label="Apellidos"
                        value={lastName}
                    />
                )}
                <ProfileRow
                    icon={<EmailOutlined />}
                    label="Correo Electrónico"
                    value={displayUser.email}
                />
                <ProfileRow
                    icon={<BadgeOutlined />}
                    label="Rol en el Sistema"
                    isLast
                    value={
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 0.75,
                                flexWrap: 'wrap',
                                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                            }}
                        >
                            {rolesList.map((role) => (
                                <Chip
                                    key={role}
                                    label={role}
                                    size="small"
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: '11px',
                                        borderRadius: '9999px',
                                        bgcolor: '#c1e1f7',
                                        color: '#3398e1',
                                    }}
                                />
                            ))}
                        </Box>
                    }
                />
            </SelineProfileCard>

            {/* Card 2: Entorno y Plataforma */}
            <SelineProfileCard
                title="Plataforma y Nivel de Acceso"
                subtitle="Detalles de tu rol operativo dentro de ShopCart E-Commerce"
                icon={<StorefrontOutlined />}
            >
                <ProfileRow
                    icon={<StorefrontOutlined />}
                    label="Plataforma / Sistema"
                    value={
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#0c0a09' }}>
                            ShopCart E-Commerce Platform
                        </Typography>
                    }
                />
                <ProfileRow
                    icon={<MenuBookOutlined />}
                    label="Ámbito Operativo"
                    value="Comercio Electrónico, Catálogo de Productos y Pedidos"
                />
                <ProfileRow
                    icon={<SecurityOutlined />}
                    label="Rol Asignado"
                    isLast
                    value={rolesList.join(', ')}
                />
            </SelineProfileCard>

            {/* Card 3: Seguridad y Estado de la Cuenta */}
            <SelineProfileCard
                title="Seguridad y Estado de la Cuenta"
                subtitle="Control de acceso y registro en la plataforma"
                icon={<SecurityOutlined />}
            >
                <ProfileRow
                    icon={<CheckCircle />}
                    label="Estado de la Cuenta"
                    value={
                        <Chip
                            icon={<CheckCircle fontSize="small" sx={{ color: '#0c0a09 !important' }} />}
                            label={displayUser.isActive !== false ? 'Activa y Verificada' : 'Inactiva'}
                            size="small"
                            sx={{
                                bgcolor: '#fafaf9',
                                border: '1px solid #e8e6e5',
                                color: '#0c0a09',
                                fontWeight: 500,
                                borderRadius: '9999px',
                            }}
                        />
                    }
                />
                {/* Botón de cambio/recuperación de contraseña deshabilitado temporalmente */}
                {/* <ProfileRow
                    icon={<LockResetOutlined />}
                    label="Contraseña de Acceso"
                    value={
                        <Button
                            id="profile-change-password-btn"
                            variant="outlined"
                            size="small"
                            startIcon={<LockResetOutlined sx={{ fontSize: 16 }} />}
                            onClick={() => navigate('/auth/change-password')}
                            sx={{
                                borderRadius: '9999px',
                                border: '1px solid #e8e6e5',
                                color: '#0c0a09',
                                textTransform: 'none',
                                fontWeight: 400,
                                fontSize: '12px',
                                px: 2,
                                py: 0.5,
                                '&:hover': {
                                    borderColor: '#3398e1',
                                    color: '#3398e1',
                                    bgcolor: '#fafaf9',
                                },
                            }}
                        >
                            Cambiar contraseña
                        </Button>
                    }
                /> */}
                <ProfileRow
                    icon={<CalendarMonthOutlined />}
                    label="Miembro Desde"
                    value={formattedDate}
                />
                <ProfileRow
                    icon={<FingerprintOutlined />}
                    label="ID de Usuario"
                    isLast
                    value={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: 'monospace',
                                    bgcolor: '#fafaf9',
                                    border: '1px solid #e8e6e5',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    userSelect: 'all',
                                    color: '#0c0a09',
                                }}
                            >
                                {displayUser.id}
                            </Typography>
                            <Tooltip title={copied ? '¡Copiado!' : 'Copiar ID'}>
                                <IconButton size="small" onClick={() => handleCopyId(displayUser.id)}>
                                    {copied ? (
                                        <Check fontSize="small" sx={{ color: '#3398e1' }} />
                                    ) : (
                                        <ContentCopyOutlined fontSize="small" sx={{ color: '#78716c' }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    }
                />
            </SelineProfileCard>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: '8px' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfilePage;
