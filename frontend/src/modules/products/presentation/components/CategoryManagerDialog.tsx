import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Stack, Typography, Box, Chip, Switch, IconButton, Alert, Divider,
} from '@mui/material';
import { AddRounded, EditOutlined, CheckRounded, CloseRounded } from '@mui/icons-material';
import type { AdminCategoryDto } from '../../domain/dto/product-admin.dto';
import { createAdminCategory, updateAdminCategory } from '../../infrastructure/services/products-admin.service';

interface CategoryManagerDialogProps {
    open: boolean;
    onClose: () => void;
    categories: AdminCategoryDto[];
    onCategoriesChanged: () => void;
}

export const CategoryManagerDialog: React.FC<CategoryManagerDialogProps> = ({
    open, onClose, categories, onCategoriesChanged,
}) => {
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await createAdminCategory({ name: newName.trim(), description: newDesc.trim() || null });
            setNewName('');
            setNewDesc('');
            onCategoriesChanged();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Error al crear la categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async (id: string) => {
        if (!editName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await updateAdminCategory(id, { name: editName.trim(), description: editDesc.trim() || null });
            setEditingId(null);
            onCategoriesChanged();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Error al actualizar la categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (cat: AdminCategoryDto) => {
        setSaving(true);
        setError(null);
        try {
            await updateAdminCategory(cat.id, { isActive: !cat.isActive });
            onCategoriesChanged();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Error al cambiar el estado');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: '#425A8B', borderBottom: '1px solid #E5E9F2' }}>
                Gestión de Categorías ({categories.length})
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Box component="form" onSubmit={handleCreate}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                size="small"
                                label="Nueva categoría *"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                size="small"
                                label="Descripción"
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                sx={{ flex: 1.2 }}
                            />
                            <Button
                                type="submit"
                                disabled={saving || !newName.trim()}
                                startIcon={<AddRounded />}
                                sx={{ backgroundColor: '#FD9636', color: '#FFF', fontWeight: 700, textTransform: 'none', '&:hover': { backgroundColor: '#E07B1B' } }}
                            >
                                Agregar
                            </Button>
                        </Stack>
                    </Box>
                    <Divider />
                    <Stack spacing={1} sx={{ maxHeight: 340, overflowY: 'auto' }}>
                        {categories.map((cat) => (
                            <Box key={cat.id} sx={{ p: 1.25, borderRadius: '6px', border: '1px solid #E5E9F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                {editingId === cat.id ? (
                                    <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                                        <TextField size="small" value={editName} onChange={(e) => setEditName(e.target.value)} sx={{ flex: 1 }} />
                                        <TextField size="small" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción" sx={{ flex: 1 }} />
                                        <IconButton size="small" color="success" onClick={() => handleSaveEdit(cat.id)} disabled={saving}><CheckRounded fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => setEditingId(null)}><CloseRounded fontSize="small" /></IconButton>
                                    </Stack>
                                ) : (
                                    <>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#425A8B' }}>{cat.name}</Typography>
                                                <Chip label={`${cat.productCount ?? 0} prod.`} size="small" sx={{ height: 20, fontSize: '10.5px', fontWeight: 700 }} />
                                            </Stack>
                                            {cat.description && <Typography noWrap sx={{ fontSize: '12px', color: '#66789C' }}>{cat.description}</Typography>}
                                        </Box>
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <Switch size="small" checked={cat.isActive} onChange={() => handleToggleActive(cat)} disabled={saving} />
                                            <IconButton size="small" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditDesc(cat.description || ''); }}><EditOutlined fontSize="small" /></IconButton>
                                        </Stack>
                                    </>
                                )}
                            </Box>
                        ))}
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
export default CategoryManagerDialog;
