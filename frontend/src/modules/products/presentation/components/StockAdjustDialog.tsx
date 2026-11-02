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
    Typography,
    Box,
    Chip,
    Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    stockAdjustSchema,
    type StockAdjustFormValues,
} from '../../domain/schemas/product-admin.schema';
import type {
    AdminProductDto,
    AdminProductVariantDto,
} from '../../domain/dto/product-admin.dto';
import { adjustVariantStock } from '../../infrastructure/services/products-admin.service';

interface StockAdjustDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: AdminProductDto | null;
    variant: AdminProductVariantDto | null;
}

export const StockAdjustDialog: React.FC<StockAdjustDialogProps> = ({
    open,
    onClose,
    onSuccess,
    product,
    variant,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<StockAdjustFormValues>({
        resolver: zodResolver(stockAdjustSchema),
        defaultValues: {
            movementType: 'ENTRADA',
            quantity: 1,
            reason: '',
        },
    });

    const selectedMovementType = watch('movementType');

    useEffect(() => {
        if (open) {
            setServerError(null);
            reset({
                movementType: 'ENTRADA',
                quantity: 1,
                reason: '',
            });
        }
    }, [open, reset]);

    const onSubmit = async (values: StockAdjustFormValues) => {
        if (!product || !variant) return;
        setSubmitting(true);
        setServerError(null);
        try {
            await adjustVariantStock(product.id, variant.id, {
                movementType: values.movementType,
                quantity: Number(values.quantity),
                reason: values.reason.trim(),
            });
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setServerError(
                axiosErr.response?.data?.message ||
                    'No se pudo registrar el movimiento de inventario en el Kardex.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!product || !variant) return null;

    const attrText = Object.entries(variant.attributes || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ borderBottom: '1px solid #E5E9F2', pb: 2 }}>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#425A8B' }}>
                    Ajuste de Inventario (Kardex)
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: '#66789C', mt: 0.5 }}>
                    {product.name} — SKU: <strong>{variant.sku}</strong>
                </Typography>
            </DialogTitle>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ pt: 2.5 }}>
                    <Stack spacing={2.5}>
                        {serverError && (
                            <Alert severity="error" sx={{ borderRadius: '8px' }}>
                                {serverError}
                            </Alert>
                        )}

                        {/* Current Stock Summary Box */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '8px',
                                backgroundColor: '#F0F3F8',
                                border: '1px solid #D5DFE4',
                            }}
                        >
                            {attrText && (
                                <Typography
                                    sx={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#FD9636',
                                        mb: 1,
                                    }}
                                >
                                    Variante: {attrText}
                                </Typography>
                            )}
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                <Chip
                                    label={`Stock Físico: ${variant.stockPhysical}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#FFFFFF',
                                        color: '#425A8B',
                                        fontWeight: 700,
                                    }}
                                />
                                <Chip
                                    label={`Reservado: ${variant.stockReserved}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#FFF3E6',
                                        color: '#E07B1B',
                                        fontWeight: 700,
                                    }}
                                />
                                <Chip
                                    label={`Disponible: ${variant.stockAvailable}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#D1FAE5',
                                        color: '#047857',
                                        fontWeight: 700,
                                    }}
                                />
                            </Stack>
                        </Box>

                        <Controller
                            name="movementType"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Tipo de Movimiento Kardex"
                                    fullWidth
                                    size="small"
                                    error={Boolean(errors.movementType)}
                                    helperText={
                                        selectedMovementType === 'ENTRADA'
                                            ? 'Suma unidades al stock físico actual.'
                                            : selectedMovementType === 'SALIDA'
                                            ? 'Descuenta unidades del stock físico actual.'
                                            : 'Establece el stock físico exacto al valor indicado.'
                                    }
                                >
                                    <MenuItem value="ENTRADA">ENTRADA (+ Ingreso de mercadería)</MenuItem>
                                    <MenuItem value="SALIDA">SALIDA (- Merma o retiro)</MenuItem>
                                    <MenuItem value="AJUSTE">AJUSTE (= Definir stock físico exacto)</MenuItem>
                                </TextField>
                            )}
                        />

                        <Controller
                            name="quantity"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="number"
                                    label={
                                        selectedMovementType === 'AJUSTE'
                                            ? 'Nuevo Stock Físico Exacto'
                                            : 'Cantidad de Unidades'
                                    }
                                    fullWidth
                                    size="small"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    error={Boolean(errors.quantity)}
                                    helperText={errors.quantity?.message}
                                />
                            )}
                        />

                        <Controller
                            name="reason"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Motivo del Ajuste (Auditoría Kardex)"
                                    placeholder="Ej. Recepción de lote #402 / Conteo físico mensual"
                                    multiline
                                    rows={2}
                                    fullWidth
                                    size="small"
                                    error={Boolean(errors.reason)}
                                    helperText={errors.reason?.message}
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E9F2' }}>
                    <Button
                        onClick={onClose}
                        disabled={submitting}
                        sx={{ color: '#66789C', textTransform: 'none' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitting}
                        sx={{
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            px: 2.5,
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': { backgroundColor: '#2B3E66' },
                        }}
                    >
                        {submitting ? 'Guardando...' : 'Registrar en Kardex'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default StockAdjustDialog;
