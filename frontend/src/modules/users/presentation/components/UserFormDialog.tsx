import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Alert,
    CircularProgress,
    Box,
    Autocomplete,
    FormControlLabel,
    Checkbox,
    IconButton,
    InputAdornment,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    ContentCopy,
    CheckCircleOutlined,
    Visibility,
    VisibilityOff,
    AutoAwesome,
} from '@mui/icons-material';
import {
    createUserSchema,
    updateUserSchema,
    VALID_SYSTEM_ROLES,
} from '../../domain/schemas/users.schemas';
import type { UserDto } from '../../domain/dto/users.dto';
import { createUser, updateUser, getRoles } from '../../infrastructure/services/users.service';

interface UserFormValues {
    email?: string;
    passwordRaw?: string;
    autoGeneratePassword?: boolean;
    firstName?: string;
    lastName?: string;
    roles?: string[];
}

interface UserFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: UserDto | null;
}

const generateClientSecurePassword = (): string => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%^&*()-_=+';
    const all = uppercase + lowercase + numbers + special;

    const getRandomChar = (charset: string) => {
        const randomValues = new Uint32Array(1);
        window.crypto.getRandomValues(randomValues);
        return charset[randomValues[0] % charset.length];
    };

    const password = [
        getRandomChar(uppercase),
        getRandomChar(lowercase),
        getRandomChar(numbers),
        getRandomChar(special),
    ];

    for (let i = password.length; i < 12; i++) {
        password.push(getRandomChar(all));
    }

    for (let i = password.length - 1; i > 0; i--) {
        const randomValues = new Uint32Array(1);
        window.crypto.getRandomValues(randomValues);
        const j = randomValues[0] % (i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
};

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
    open,
    onClose,
    onSuccess,
    initialData,
}) => {
    const [serverError, setServerError] = useState<string | null>(null);
    const [availableRoleNames, setAvailableRoleNames] = useState<string[]>([...VALID_SYSTEM_ROLES]);
    const [autoGen, setAutoGen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isEdit = Boolean(initialData);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<UserFormValues>({
        resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as never,
        defaultValues: {
            email: '',
            passwordRaw: '',
            autoGeneratePassword: false,
            firstName: '',
            lastName: '',
            roles: ['Cliente'],
        },
    });

    useEffect(() => {
        getRoles()
            .then((roles) => {
                if (roles && roles.length > 0) {
                    setAvailableRoleNames(roles.map((r) => r.name));
                }
            })
            .catch(() => {
                // Keep default ['Cliente', 'Operador', 'Administrador']
            });
    }, []);

    useEffect(() => {
        if (open) {
            setServerError(null);
            setAutoGen(false);
            setCopied(false);
            setShowPassword(false);
            if (initialData) {
                const initialRoles =
                    initialData.roles && initialData.roles.length > 0
                        ? initialData.roles
                        : initialData.role
                        ? [initialData.role]
                        : ['Cliente'];

                reset({
                    email: initialData.email,
                    passwordRaw: '',
                    autoGeneratePassword: false,
                    firstName: initialData.firstName,
                    lastName: initialData.lastName,
                    roles: initialRoles,
                });
            } else {
                reset({
                    email: '',
                    passwordRaw: '',
                    autoGeneratePassword: false,
                    firstName: '',
                    lastName: '',
                    roles: ['Cliente'],
                });
            }
        }
    }, [open, initialData, reset]);

    const handleToggleAutoGen = (checked: boolean) => {
        setAutoGen(checked);
        setValue('autoGeneratePassword', checked);
        if (checked) {
            const securePass = generateClientSecurePassword();
            setValue('passwordRaw', securePass, { shouldValidate: true });
        } else {
            setValue('passwordRaw', '', { shouldValidate: true });
        }
    };

    const handleCopyPassword = (val?: string) => {
        if (val) {
            navigator.clipboard.writeText(val);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const onSubmit = async (values: UserFormValues) => {
        setServerError(null);
        try {
            const selectedRoles: string[] =
                Array.isArray(values.roles) && values.roles.length > 0
                    ? values.roles
                    : ['Cliente'];
            const primaryRole = selectedRoles[0];

            if (isEdit && initialData) {
                const payload: Record<string, unknown> = {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    role: primaryRole,
                    roles: selectedRoles,
                };
                if (values.email && values.email !== initialData.email) {
                    payload.email = values.email;
                }
                if (values.passwordRaw && values.passwordRaw.trim() !== '') {
                    payload.passwordRaw = values.passwordRaw;
                }
                await updateUser(initialData.id, payload);
            } else {
                await createUser({
                    email: values.email || '',
                    passwordRaw: values.passwordRaw,
                    autoGeneratePassword: values.autoGeneratePassword,
                    firstName: values.firstName || '',
                    lastName: values.lastName || '',
                    role: primaryRole,
                    roles: selectedRoles,
                });
            }
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            const message =
                axiosErr.response?.data?.message ||
                (isEdit ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario');
            setServerError(message);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => !isSubmitting && onClose()}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '10px',
                        p: 1,
                        border: '1px solid #e8e6e5',
                        bgcolor: '#ffffff',
                        boxShadow: 'rgba(17, 12, 46, 0.12) 0px 12px 45px 0px',
                    },
                },
            }}
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogTitle
                    sx={{
                        fontFamily: 'var(--font-roobert), Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '22px',
                        color: '#0c0a09',
                        pt: 2,
                        px: 2.5,
                    }}
                >
                    {isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </DialogTitle>

                <DialogContent sx={{ px: 2.5, pt: 1 }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setServerError(null)}>
                            {serverError}
                        </Alert>
                    )}

                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <Controller
                                name="firstName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        id="user-firstname"
                                        label="Nombres"
                                        required
                                        fullWidth
                                        autoFocus
                                        error={!!errors.firstName}
                                        helperText={errors.firstName?.message as string}
                                    />
                                )}
                            />

                            <Controller
                                name="lastName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        id="user-lastname"
                                        label="Apellidos"
                                        required
                                        fullWidth
                                        error={!!errors.lastName}
                                        helperText={errors.lastName?.message as string}
                                    />
                                )}
                            />
                        </Box>

                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    id="user-email"
                                    label="Correo Electrónico"
                                    type="email"
                                    required={!isEdit}
                                    fullWidth
                                    error={!!errors.email}
                                    helperText={errors.email?.message as string}
                                />
                            )}
                        />

                        {!isEdit && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: '8px',
                                    bgcolor: '#fafaf9',
                                    border: '1px solid #e8e6e5',
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={autoGen}
                                            onChange={(e) => handleToggleAutoGen(e.target.checked)}
                                            icon={<AutoAwesome fontSize="small" />}
                                            checkedIcon={<AutoAwesome fontSize="small" sx={{ color: '#3ba6f1' }} />}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#0c0a09' }}>
                                            Generar contraseña automáticamente
                                        </Typography>
                                    }
                                />
                                <Typography variant="caption" sx={{ display: 'block', color: '#78716c', ml: 3.5, mt: -0.5 }}>
                                    Se creará una contraseña segura y se enviará por correo al usuario con las instrucciones de activación.
                                </Typography>
                            </Box>
                        )}

                        <Controller
                            name="passwordRaw"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    id="user-password"
                                    label={
                                        isEdit
                                            ? 'Nueva contraseña (dejar en blanco para mantener actual)'
                                            : autoGen
                                            ? 'Contraseña generada'
                                            : 'Contraseña'
                                    }
                                    type={showPassword ? 'text' : 'password'}
                                    required={!isEdit && !autoGen}
                                    fullWidth
                                    error={!!errors.passwordRaw}
                                    helperText={
                                        (errors.passwordRaw?.message as string) ||
                                        (autoGen
                                            ? 'Esta contraseña se enviará por correo al usuario.'
                                            : !isEdit
                                            ? 'Mínimo 8 caracteres.'
                                            : undefined)
                                    }
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    {field.value && (
                                                        <Tooltip title={copied ? '¡Copiado!' : 'Copiar contraseña'}>
                                                            <IconButton
                                                                onClick={() => handleCopyPassword(field.value)}
                                                                edge="end"
                                                                size="small"
                                                                sx={{ mr: 0.5, color: copied ? '#3398e1' : '#78716c' }}
                                                            >
                                                                {copied ? (
                                                                    <CheckCircleOutlined fontSize="small" />
                                                                ) : (
                                                                    <ContentCopy fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <IconButton
                                                        onClick={() => setShowPassword((prev) => !prev)}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        {showPassword ? (
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

                        <Controller
                            name="roles"
                            control={control}
                            render={({ field }) => (
                                <Autocomplete
                                    multiple
                                    id="user-roles-autocomplete"
                                    options={availableRoleNames}
                                    value={field.value || []}
                                    onChange={(_, newValue) => field.onChange(newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Roles Asignados"
                                            placeholder="Seleccionar rol..."
                                            required={!isEdit}
                                            error={!!errors.roles}
                                            helperText={
                                                (errors.roles?.message as string) ||
                                                'Roles válidos: Cliente, Operador, Administrador'
                                            }
                                        />
                                    )}
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        disabled={isSubmitting}
                        sx={{
                            borderRadius: '9999px',
                            textTransform: 'none',
                            fontWeight: 400,
                            fontSize: '13px',
                            color: '#0c0a09',
                            border: '1px solid #e8e6e5',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: '#fafaf9',
                            },
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{
                            borderRadius: '9999px',
                            backgroundColor: '#3ba6f1',
                            border: '1px solid #3398e1',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            px: 2.5,
                            '&:hover': {
                                backgroundColor: '#3398e1',
                            },
                        }}
                    >
                        {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default UserFormDialog;
