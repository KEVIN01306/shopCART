import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack,
    Alert,
    Typography,
} from '@mui/material';
import type {
    CouponDto,
    CreateCouponPayload,
    DiscountType,
} from '../../domain/coupon.dto';
import {
    createAdminCoupon,
    updateAdminCoupon,
} from '../../infrastructure/services/coupons.service';
import type { AdminCategoryDto } from '../../../products/domain/dto/product-admin.dto';

interface CouponFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingCoupon: CouponDto | null;
    categories: AdminCategoryDto[];
}

export const CouponFormDialog: React.FC<CouponFormDialogProps> = ({
    open,
    onClose,
    onSuccess,
    editingCoupon,
    categories,
}) => {
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType>('PORCENTAJE');
    const [discountValue, setDiscountValue] = useState('10');
    const [minOrderAmount, setMinOrderAmount] = useState('0');
    const [maxUses, setMaxUses] = useState('100');
    const [maxUsesPerClient, setMaxUsesPerClient] = useState('1');
    const [categoryId, setCategoryId] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        const nowIso = new Date().toISOString().slice(0, 16);
        const futureIso = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16);
        if (editingCoupon) {
            setCode(editingCoupon.code);
            setDiscountType(editingCoupon.discountType);
            setDiscountValue(String(editingCoupon.discountValue));
            setMinOrderAmount(String(editingCoupon.minOrderAmount));
            setMaxUses(String(editingCoupon.maxUses));
            setMaxUsesPerClient(String(editingCoupon.maxUsesPerClient));
            setCategoryId(editingCoupon.categoryId || '');
            setStartsAt(new Date(editingCoupon.startsAt).toISOString().slice(0, 16));
            setExpiresAt(new Date(editingCoupon.expiresAt).toISOString().slice(0, 16));
        } else {
            setCode('');
            setDiscountType('PORCENTAJE');
            setDiscountValue('10');
            setMinOrderAmount('0');
            setMaxUses('100');
            setMaxUsesPerClient('1');
            setCategoryId('');
            setStartsAt(nowIso);
            setExpiresAt(futureIso);
        }
    }, [open, editingCoupon]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const payload: CreateCouponPayload = {
                code: code.trim().toUpperCase(),
                discountType,
                discountValue: Number(discountValue),
                minOrderAmount: Number(minOrderAmount || 0),
                maxUses: Number(maxUses),
                maxUsesPerClient: Number(maxUsesPerClient || 1),
                categoryId: categoryId || null,
                startsAt: new Date(startsAt).toISOString(),
                expiresAt: new Date(expiresAt).toISOString(),
            };
            if (editingCoupon) {
                await updateAdminCoupon(editingCoupon.id, {
                    ...payload,
                    clearCategory: !categoryId,
                });
            } else {
                await createAdminCoupon(payload);
            }
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Error al guardar el cupón.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: '1px solid #e8e6e5', pb: 1.5 }}>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#0c0a09' }}>
                    {editingCoupon ? 'Editar Cupón Promocional' : 'Nuevo Cupón Promocional'}
                </Typography>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2.5 }}>
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField label="Código (Ej. VERANO20)" size="small" fullWidth required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                            <TextField select label="Tipo de Descuento" size="small" fullWidth value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                                <MenuItem value="PORCENTAJE">Porcentaje (%)</MenuItem>
                                <MenuItem value="MONTO_FIJO">Monto Fijo (GTQ)</MenuItem>
                            </TextField>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField label={discountType === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Descuento (Q)'} type="number" size="small" fullWidth required value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                            <TextField label="Compra Mínima (Q)" type="number" size="small" fullWidth value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField label="Límite Global de Usos" type="number" size="small" fullWidth required value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                            <TextField label="Usos por Cliente" type="number" size="small" fullWidth required value={maxUsesPerClient} onChange={(e) => setMaxUsesPerClient(e.target.value)} />
                        </Stack>
                        <TextField select label="Categoría Elegible (Opcional)" size="small" fullWidth value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <MenuItem value="">Todas las categorías de la tienda</MenuItem>
                            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField label="Inicio de Vigencia" type="datetime-local" size="small" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                            <TextField label="Fecha de Expiración" type="datetime-local" size="small" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e8e6e5' }}>
                    <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none', color: '#78716c' }}>Cancelar</Button>
                    <Button type="submit" disabled={submitting} sx={{ borderRadius: '9999px', bgcolor: '#3ba6f1', color: '#fff', px: 2.5, textTransform: 'none', '&:hover': { bgcolor: '#3398e1' } }}>
                        {submitting ? 'Guardando...' : 'Guardar Cupón'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
