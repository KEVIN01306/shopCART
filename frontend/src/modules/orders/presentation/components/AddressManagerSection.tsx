import React, { useState } from 'react';
import {
    Box, Card, Typography, Button, Stack, TextField, Radio,
    IconButton, Chip, Collapse, Alert, Grid,
} from '@mui/material';
import { AddLocationAltOutlined, DeleteOutlineRounded, PlaceOutlined } from '@mui/icons-material';
import type { CreateShippingAddressPayload, ShippingAddressDto } from '../../domain/order.dto';

interface Props {
    addresses: ShippingAddressDto[];
    selectedAddressId: string;
    onSelectAddress: (id: string) => void;
    onCreateAddress: (payload: CreateShippingAddressPayload) => Promise<void>;
    onDeleteAddress: (id: string) => Promise<void>;
}

export const AddressManagerSection: React.FC<Props> = ({
    addresses, selectedAddressId, onSelectAddress, onCreateAddress, onDeleteAddress,
}) => {
    const [showForm, setShowForm] = useState(addresses.length === 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<CreateShippingAddressPayload>({
        title: 'Casa', recipientName: '', phone: '', streetAddress: '',
        city: 'Ciudad de Guatemala', state: 'Guatemala', postalCode: '01010', isDefault: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            await onCreateAddress(form);
            setShowForm(false);
            setForm((prev) => ({ ...prev, streetAddress: '' }));
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Completa todos los campos de la dirección.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid #D5DFE4', p: 3, mb: 2.5, bgcolor: '#FFFFFF' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <PlaceOutlined sx={{ color: '#FD9636' }} />
                    <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#425A8B' }}>1. Dirección de Entrega</Typography>
                </Stack>
                <Button size="small" startIcon={<AddLocationAltOutlined />} onClick={() => setShowForm((v) => !v)} sx={{ textTransform: 'none', fontWeight: 700, color: '#425A8B' }}>
                    {showForm ? 'Cancelar' : 'Nueva Dirección'}
                </Button>
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

            <Stack spacing={1.25} sx={{ mb: showForm ? 2 : 0 }}>
                {addresses.map((addr) => {
                    const isSelected = addr.id === selectedAddressId;
                    return (
                        <Box
                            key={addr.id}
                            onClick={() => onSelectAddress(addr.id)}
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                p: 1.5, borderRadius: '8px', cursor: 'pointer',
                                border: isSelected ? '2px solid #FD9636' : '1px solid #D5DFE4',
                                bgcolor: isSelected ? '#FFF3E6' : '#FFFFFF',
                            }}
                        >
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Radio checked={isSelected} sx={{ color: '#425A8B', '&.Mui-checked': { color: '#FD9636' } }} />
                                <Box>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: '14px', color: '#425A8B' }}>
                                            {addr.title} — {addr.recipientName}
                                        </Typography>
                                        {addr.isDefault && <Chip label="Predeterminada" size="small" sx={{ height: 20, fontSize: '10.5px' }} />}
                                    </Stack>
                                    <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                        {addr.streetAddress}, {addr.city}, {addr.state} · Tel: {addr.phone}
                                    </Typography>
                                </Box>
                            </Stack>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteAddress(addr.id); }} sx={{ color: '#8C9EC5', '&:hover': { color: '#EF4444' } }}>
                                <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                        </Box>
                    );
                })}
            </Stack>

            <Collapse in={showForm || addresses.length === 0}>
                <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField size="small" fullWidth required label="Alias (Casa, Oficina)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField size="small" fullWidth required label="Nombre quien recibe" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField size="small" fullWidth required label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField size="small" fullWidth required label="Dirección exacta (Calle, avenida, zona, colonia)" value={form.streetAddress} onChange={(e) => setForm({ ...form, streetAddress: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField size="small" fullWidth required label="Municipio / Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField size="small" fullWidth required label="Departamento" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Grid>
                    </Grid>
                    <Button type="submit" variant="contained" disabled={saving} sx={{ mt: 1.5, bgcolor: '#425A8B', textTransform: 'none', fontWeight: 700 }}>
                        {saving ? 'Guardando...' : 'Guardar Dirección'}
                    </Button>
                </Box>
            </Collapse>
        </Card>
    );
};
