import React, { useEffect, useState, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    MenuItem, Stack, Typography, Box, Chip, Pagination, Skeleton,
} from '@mui/material';
import type { AdminProductDto, KardexMovementDto } from '../../domain/dto/product-admin.dto';
import { getKardexMovements } from '../../infrastructure/services/products-admin.service';

interface KardexHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    products: AdminProductDto[];
    initialProductId?: string;
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    ENTRADA: { bg: '#D1FAE5', color: '#047857' },
    DEVOLUCION: { bg: '#E0F2FE', color: '#0369A1' },
    SALIDA: { bg: '#FEE2E2', color: '#B91C1C' },
    AJUSTE: { bg: '#FFF3E6', color: '#E07B1B' },
};

export const KardexHistoryDialog: React.FC<KardexHistoryDialogProps> = ({
    open, onClose, products, initialProductId = '',
}) => {
    const [movements, setMovements] = useState<KardexMovementDto[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [productId, setProductId] = useState(initialProductId);
    const [movementType, setMovementType] = useState('');
    const [loading, setLoading] = useState(false);
    const limit = 10;

    useEffect(() => {
        if (open) {
            setProductId(initialProductId);
            setPage(1);
        }
    }, [open, initialProductId]);

    const loadHistory = useCallback(async () => {
        if (!open) return;
        setLoading(true);
        try {
            const res = await getKardexMovements({
                page, limit,
                productId: productId || undefined,
                movementType: movementType || undefined,
            });
            setMovements(res.data);
            setTotal(res.meta.total);
        } catch {
            setMovements([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [open, page, productId, movementType]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: '#425A8B', borderBottom: '1px solid #E5E9F2' }}>
                Historial de Movimientos en Kardex ({total})
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField select size="small" label="Filtrar por Producto" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }} sx={{ flex: 1 }}>
                            <MenuItem value="">Todos los productos</MenuItem>
                            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Tipo de Movimiento" value={movementType} onChange={(e) => { setMovementType(e.target.value); setPage(1); }} sx={{ minWidth: 190 }}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="ENTRADA">ENTRADA</MenuItem>
                            <MenuItem value="SALIDA">SALIDA</MenuItem>
                            <MenuItem value="AJUSTE">AJUSTE</MenuItem>
                            <MenuItem value="DEVOLUCION">DEVOLUCION</MenuItem>
                        </TextField>
                    </Stack>

                    {loading ? (
                        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: '8px' }} />
                    ) : movements.length === 0 ? (
                        <Typography sx={{ py: 4, textAlign: 'center', color: '#66789C', fontSize: '13.5px' }}>
                            No se encontraron movimientos registrados en Kardex con estos filtros.
                        </Typography>
                    ) : (
                        <Stack spacing={1} sx={{ maxHeight: 380, overflowY: 'auto' }}>
                            {movements.map((m) => {
                                const badge = BADGE_STYLES[m.movementType] ?? BADGE_STYLES.AJUSTE;
                                const sign = m.quantity > 0 ? `+${m.quantity}` : String(m.quantity);
                                return (
                                    <Box key={m.id} sx={{ p: 1.5, borderRadius: '6px', border: '1px solid #E5E9F2', backgroundColor: '#F8FAFC', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ minWidth: 220, flex: 1 }}>
                                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                                                <Chip label={m.movementType} size="small" sx={{ height: 20, fontSize: '10.5px', fontWeight: 700, backgroundColor: badge.bg, color: badge.color }} />
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#425A8B' }}>{m.sku}</Typography>
                                                <Typography noWrap sx={{ fontSize: '12.5px', fontWeight: 700, color: '#425A8B' }}>{m.productName}</Typography>
                                            </Stack>
                                            <Typography sx={{ fontSize: '12px', color: '#66789C' }}>
                                                Motivo: <strong>{m.reason}</strong> {m.userName ? `· Por: ${m.userName}` : ''} · {new Date(m.createdAt).toLocaleString('es-GT')}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                            <Chip label={`Cant: ${sign}`} size="small" sx={{ fontWeight: 800, fontSize: '11.5px', backgroundColor: '#FFF', border: '1px solid #D5DFE4' }} />
                                            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#425A8B' }}>
                                                Stock: {m.previousStock} → {m.newStock}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" color="primary" />
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
export default KardexHistoryDialog;
