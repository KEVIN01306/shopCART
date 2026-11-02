import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Chip,
    Typography,
    Snackbar,
    Alert,
    Avatar,
    Stack,
} from '@mui/material';
import {
    PersonAdd,
    Edit,
    Delete,
    Block,
    CheckCircle,
} from '@mui/icons-material';
import { PageHeader } from '../../../../shared/components/common/PageHeader';
import { GoogleSearchBar } from '../../../../shared/components/common/GoogleSearchBar';
import ListTable, { type Column, type Action } from '../../../../shared/components/tables/ListTable';
import ConfirmDialog from '../../../../shared/components/dialog/ConfirmDialog';
import UserFormDialog from '../components/UserFormDialog';
import { useAuthStore } from '../../../../core/store/authStore';
import { hasRole } from '../../../../core/utils/permissions';
import {
    getUsersPaginated,
    disableUser,
    activateUser,
    deleteUser,
} from '../../infrastructure/services/users.service';
import type { UserDto } from '../../domain/dto/users.dto';

export const UsersListPage: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const isAdminUser = hasRole(user, 'Administrador');
    const canCreate = isAdminUser;
    const canUpdate = isAdminUser;
    const canDelete = isAdminUser;

    const [users, setUsers] = useState<UserDto[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [q, setQ] = useState('');
    const [searchInputValue, setSearchInputValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Dialog states
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);
    const [userToDisable, setUserToDisable] = useState<UserDto | null>(null);
    const [userToActivate, setUserToActivate] = useState<UserDto | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Feedback toast
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getUsersPaginated(page + 1, limit, q || undefined);
            setUsers(res.data);
            setTotal(res.total);
        } catch {
            setSnackbar({
                open: true,
                message: 'No se pudieron cargar los usuarios',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    }, [page, limit, q]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        setQ(searchInputValue);
    };

    const handleOpenCreate = () => {
        setSelectedUser(null);
        setFormDialogOpen(true);
    };

    const handleOpenEdit = (row: UserDto) => {
        setSelectedUser(row);
        setFormDialogOpen(true);
    };

    const handleConfirmDisable = async () => {
        if (!userToDisable) return;
        setIsProcessing(true);
        try {
            await disableUser(userToDisable.id);
            setSnackbar({
                open: true,
                message: 'Cuenta de usuario desactivada correctamente',
                severity: 'success',
            });
            setUserToDisable(null);
            fetchUsers();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setSnackbar({
                open: true,
                message: axiosErr.response?.data?.message || 'Error al desactivar usuario',
                severity: 'error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmActivate = async () => {
        if (!userToActivate) return;
        setIsProcessing(true);
        try {
            await activateUser(userToActivate.id);
            setSnackbar({
                open: true,
                message: 'Cuenta de usuario reactivada correctamente',
                severity: 'success',
            });
            setUserToActivate(null);
            fetchUsers();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setSnackbar({
                open: true,
                message: axiosErr.response?.data?.message || 'Error al reactivar usuario',
                severity: 'error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsProcessing(true);
        try {
            await deleteUser(userToDelete.id);
            setSnackbar({
                open: true,
                message: 'Usuario eliminado correctamente',
                severity: 'success',
            });
            setUserToDelete(null);
            fetchUsers();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setSnackbar({
                open: true,
                message: axiosErr.response?.data?.message || 'Error al eliminar usuario',
                severity: 'error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const columns: Column[] = [
        {
            id: 'fullName',
            name: 'Usuario',
            format: (_: unknown, row: UserDto) => {
                const fullName = `${row.firstName} ${row.lastName}`.trim();
                const initials =
                    fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || 'U';

                return (
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                fontSize: '12px',
                                fontWeight: 500,
                                bgcolor: row.isActive ? '#1c1917' : '#a8a29e',
                                color: '#ffffff',
                            }}
                        >
                            {initials}
                        </Avatar>
                        <Box>
                            <Typography sx={{ fontWeight: 500, fontSize: '13px', color: '#0c0a09' }}>
                                {fullName}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        },
        {
            id: 'email',
            name: 'Correo Electrónico',
            format: (value: string) => (
                <Typography sx={{ fontSize: '13px', color: '#78716c' }}>
                    {value}
                </Typography>
            ),
        },
        {
            id: 'roles',
            name: 'Rol',
            format: (_: unknown, row: UserDto) => {
                const roleList =
                    row.roles && row.roles.length > 0
                        ? row.roles
                        : row.role
                        ? [row.role]
                        : ['Cliente'];

                return (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {roleList.map((role) => (
                            <Chip
                                key={role}
                                size="small"
                                label={role}
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '11px',
                                    height: 22,
                                    borderRadius: '9999px',
                                    bgcolor:
                                        role === 'Administrador'
                                            ? '#1c1917'
                                            : role === 'Operador'
                                            ? '#c1e1f7'
                                            : '#fafaf9',
                                    color:
                                        role === 'Administrador'
                                            ? '#ffffff'
                                            : role === 'Operador'
                                            ? '#3398e1'
                                            : '#0c0a09',
                                    border:
                                        role === 'Administrador'
                                            ? '1px solid #1c1917'
                                            : '1px solid #e8e6e5',
                                }}
                            />
                        ))}
                    </Stack>
                );
            },
        },
        {
            id: 'status',
            name: 'Estado',
            format: (_: unknown, row: UserDto) => (
                <Chip
                    size="small"
                    label={row.isActive ? 'Activo' : 'Inactivo'}
                    sx={{
                        fontWeight: 500,
                        fontSize: '11px',
                        height: 22,
                        borderRadius: '9999px',
                        bgcolor: row.isActive ? '#fafaf9' : '#fafaf9',
                        color: row.isActive ? '#0c0a09' : '#a8a29e',
                        border: '1px solid #e8e6e5',
                    }}
                />
            ),
        },
    ];

    const actions: Action[] = [
        {
            name: 'Editar',
            icon: <Edit fontSize="small" />,
            visible: () => canUpdate,
            onClick: (row: UserDto) => handleOpenEdit(row),
        },
        {
            name: 'Desactivar cuenta',
            icon: <Block fontSize="small" />,
            color: '#78716c',
            visible: (row: UserDto) => row.isActive && canUpdate,
            onClick: (row: UserDto) => setUserToDisable(row),
        },
        {
            name: 'Reactivar usuario',
            icon: <CheckCircle fontSize="small" />,
            color: '#3398e1',
            visible: (row: UserDto) => !row.isActive && canUpdate,
            onClick: (row: UserDto) => setUserToActivate(row),
        },
        {
            name: 'Eliminar usuario',
            icon: <Delete fontSize="small" />,
            color: '#0c0a09',
            visible: () => canDelete,
            onClick: (row: UserDto) => setUserToDelete(row),
        },
    ];

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            <PageHeader
                title="Gestión de Usuarios"
                subtitle="Directorio de usuarios registrados, asignación de roles (Cliente, Operador, Administrador) y estado de cuenta"
                actionLabel={canCreate ? 'Nuevo Usuario' : undefined}
                actionIcon={canCreate ? <PersonAdd /> : undefined}
                onAction={canCreate ? handleOpenCreate : undefined}
            />

            <GoogleSearchBar
                value={searchInputValue}
                onChange={(val) => {
                    setSearchInputValue(val);
                    if (!val && q) {
                        setPage(0);
                        setQ('');
                    }
                }}
                onSubmit={handleSearchSubmit}
                placeholder="Buscar usuarios por nombre o correo..."
                loading={loading}
            />

            <ListTable
                data={users}
                columns={columns}
                actions={actions}
                emptyMessage="No se encontraron usuarios registrados"
                pagination={{
                    total,
                    limit,
                    offset: page * limit,
                    onPageChange: (newPage) => setPage(newPage),
                    onRowsPerPageChange: (newLimit) => {
                        setLimit(newLimit);
                        setPage(0);
                    },
                }}
            />

            {/* Create / Edit User Dialog */}
            <UserFormDialog
                open={formDialogOpen}
                onClose={() => setFormDialogOpen(false)}
                onSuccess={() => {
                    setSnackbar({
                        open: true,
                        message: selectedUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
                        severity: 'success',
                    });
                    fetchUsers();
                }}
                initialData={selectedUser}
            />

            {/* Disable Account Confirmation Dialog */}
            <ConfirmDialog
                open={Boolean(userToDisable)}
                title="¿Desactivar cuenta de usuario?"
                description={
                    <span>
                        ¿Estás seguro de que deseas desactivar el acceso de{' '}
                        <strong>
                            {userToDisable?.firstName} {userToDisable?.lastName}
                        </strong>{' '}
                        ({userToDisable?.email})?
                    </span>
                }
                onClose={() => setUserToDisable(null)}
                onConfirm={handleConfirmDisable}
                isLoading={isProcessing}
                confirmText="Desactivar cuenta"
                confirmColor="warning"
            />

            {/* Reactivate Account Confirmation Dialog */}
            <ConfirmDialog
                open={Boolean(userToActivate)}
                title="¿Reactivar usuario?"
                description={
                    <span>
                        El usuario{' '}
                        <strong>
                            {userToActivate?.firstName} {userToActivate?.lastName}
                        </strong>{' '}
                        ({userToActivate?.email}) volverá a tener acceso al sistema.
                    </span>
                }
                onClose={() => setUserToActivate(null)}
                onConfirm={handleConfirmActivate}
                isLoading={isProcessing}
                confirmText="Reactivar"
                confirmColor="primary"
            />

            {/* Delete User Confirmation Dialog */}
            <ConfirmDialog
                open={Boolean(userToDelete)}
                title="¿Eliminar usuario?"
                description={
                    <span>
                        ¿Estás seguro de que deseas eliminar a{' '}
                        <strong>
                            {userToDelete?.firstName} {userToDelete?.lastName}
                        </strong>
                        ?
                    </span>
                }
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isProcessing}
                confirmText="Eliminar"
                confirmColor="error"
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UsersListPage;
