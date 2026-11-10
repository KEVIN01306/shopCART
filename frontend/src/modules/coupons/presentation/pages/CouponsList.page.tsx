import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Stack,
    TextField,
    Chip,
    Switch,
    IconButton,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { AddRounded, EditOutlined, LoyaltyOutlined } from '@mui/icons-material';
import {
    getAdminCoupons,
    toggleAdminCouponStatus,
} from '../../infrastructure/services/coupons.service';
import type { CouponDto } from '../../domain/coupon.dto';
import { getAdminCategories } from '../../../products/infrastructure/services/products-admin.service';
import type { AdminCategoryDto } from '../../../products/domain/dto/product-admin.dto';
import { CouponFormDialog } from '../components/CouponFormDialog';
import { formatMoney } from '../../../../core/utils/formatMoney';

export const CouponsListPage: React.FC = () => {
    const [coupons, setCoupons] = useState<CouponDto[]>([]);
    const [categories, setCategories] = useState<AdminCategoryDto[]>([]);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponDto | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [resCoupons, resCats] = await Promise.all([
                getAdminCoupons({ page: 1, limit: 50, q: search || undefined }),
                getAdminCategories(),
            ]);
            setCoupons(resCoupons.data);
            setCategories(resCats);
        } catch {
            setCoupons([]);
        }
    }, [search]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggle = async (c: CouponDto) => {
        await toggleAdminCouponStatus(c.id, !c.isActive);
        setToast(`Cupón ${c.code} ${!c.isActive ? 'activado' : 'desactivado'}`);
        loadData();
    };

    return (
        <Box sx={{ width: '100%', pb: 6 }}>
            <Box
                sx={{
                    p: 3,
                    mb: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e8e6e5',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography component="h1" sx={{ fontSize: '28px', fontWeight: 400, color: '#0c0a09', letterSpacing: '-0.025em' }}>
                        Cupones y{' '}
                        <Box component="span" sx={{ color: '#3398e1', bgcolor: '#c1e1f7', px: 1, py: 0.25, borderRadius: '4px' }}>
                            Promociones
                        </Box>
                    </Typography>
                    <Typography sx={{ fontSize: '14px', color: '#78716c', mt: 0.5 }}>
                        Administra códigos de descuento porcentuales o fijos, vigencia, montos mínimos y límites de uso (RF-05).
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <TextField size="small" placeholder="Buscar por código..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Button
                        startIcon={<AddRounded />}
                        onClick={() => { setEditingCoupon(null); setDialogOpen(true); }}
                        sx={{ borderRadius: '9999px', bgcolor: '#3ba6f1', border: '1px solid #3398e1', color: '#fff', px: 2.5, textTransform: 'none', '&:hover': { bgcolor: '#3398e1' } }}
                    >
                        Nuevo Cupón
                    </Button>
                </Stack>
            </Box>

            <TableContainer sx={{ bgcolor: '#ffffff', border: '1px solid #e8e6e5', borderRadius: '10px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#fafaf9' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Beneficio</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Mínimo Compra</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Usos (Global / Cliente)</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Vigencia</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {coupons.map((c) => {
                            const isExpired = new Date(c.expiresAt) < new Date();
                            return (
                                <TableRow key={c.id} hover>
                                    <TableCell>
                                        <Chip icon={<LoyaltyOutlined sx={{ fontSize: 15 }} />} label={c.code} size="small" sx={{ fontWeight: 700, bgcolor: '#c1e1f7', color: '#0c0a09' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        {c.discountType === 'PORCENTAJE' ? `${c.discountValue}% OFF` : `${formatMoney(c.discountValue)} OFF`}
                                    </TableCell>
                                    <TableCell>{formatMoney(c.minOrderAmount)}</TableCell>
                                    <TableCell>{c.categoryName || 'Todas'}</TableCell>
                                    <TableCell>{`${c.currentUses} / ${c.maxUses} (máx. ${c.maxUsesPerClient}/cliente)`}</TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: '12px', color: isExpired ? '#dc2626' : '#78716c' }}>
                                            {new Date(c.startsAt).toLocaleDateString()} — {new Date(c.expiresAt).toLocaleDateString()} {isExpired ? '(Vencido)' : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Switch size="small" checked={c.isActive} onChange={() => handleToggle(c)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => { setEditingCoupon(c); setDialogOpen(true); }}>
                                            <EditOutlined fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <CouponFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={loadData} editingCoupon={editingCoupon} categories={categories} />
            <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)}>
                <Alert severity="success">{toast}</Alert>
            </Snackbar>
        </Box>
    );
};

export default CouponsListPage;
