import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Stack,
    Alert,
} from '@mui/material';
import type { OrderItemDto } from '../../domain/order.dto';

interface Props {
    open: boolean;
    orderId: string;
    item: OrderItemDto | null;
    onClose: () => void;
    onConfirmReturn: (payload: {
        orderItemId: string;
        quantity: number;
        reason: string;
    }) => Promise<void>;
}

export const OrderReturnDialog: React.FC<Props> = ({
    open,
    item,
    onClose,
    onConfirmReturn,
}) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            setQuantity(1);
            setReason('');
            setError(null);
        }
    }, [item]);

    if (!item) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity < 1 || quantity > item.availableToReturn) {
            setError(
                `La cantidad debe estar entre 1 y ${item.availableToReturn} unidades disponibles para devolver.`
            );
            return;
        }
        if (reason.trim().length < 3) {
            setError('Ingresa un motivo válido para el Kardex.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await onConfirmReturn({
                orderItemId: item.id,
                quantity,
                reason: reason.trim(),
            });
            onClose();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || 'Error al procesar la devolución.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: '#425A8B' }}>
                Procesar Devolución a Inventario
            </DialogTitle>
            <DialogContent dividers>
                <Stack component="form" onSubmit={handleSubmit} spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Typography sx={{ fontSize: '13.5px', color: '#425A8B', fontWeight: 700 }}>
                        {item.productName} ({item.variantSku})
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                        Comprados: {item.quantity} · Devueltos previamente: {item.returnedQuantity} ·{' '}
                        <strong>Máximo a devolver: {item.availableToReturn}</strong>
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        label="Cantidad a devolver"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        slotProps={{
                            htmlInput: { min: 1, max: item.availableToReturn },
                        }}
                        required
                        fullWidth
                    />
                    <TextField
                        size="small"
                        label="Motivo de devolución (Kardex)"
                        placeholder="Ej. Defecto de fábrica o cambio autorizado"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        multiline
                        rows={2}
                        required
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="warning"
                    disabled={submitting}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {submitting ? 'Procesando...' : 'Autorizar y Reintegrar Stock'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
