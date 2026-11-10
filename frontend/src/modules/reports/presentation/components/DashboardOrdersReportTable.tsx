import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Card, Typography, Stack, TextField, MenuItem, Chip, Table, TableHead,
    TableRow, TableCell, TableBody, TablePagination,
} from '@mui/material';
import { getAllOrdersPaginated } from '../../../orders/infrastructure/services/orders.service';
import type { OrderSummaryDto } from '../../../orders/domain/order.dto';

interface DashboardOrdersReportTableProps {
    dateFrom: string;
    dateTo: string;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    CREADO: 'default',
    PAGADO: 'info',
    PREPARACION: 'warning',
    DESPACHADO: 'primary',
    ENTREGADO: 'success',
    CANCELADO: 'error',
    DEVUELTO: 'error',
};

export const DashboardOrdersReportTable: React.FC<DashboardOrdersReportTableProps> = ({
    dateFrom,
    dateTo,
}) => {
    const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [status, setStatus] = useState<string>('');
    const [customerQuery, setCustomerQuery] = useState<string>('');

    const fetchOrdersReport = useCallback(async () => {
        try {
            const res = await getAllOrdersPaginated({
                page: page + 1,
                limit: rowsPerPage,
                status: status || undefined,
                q: customerQuery.trim() || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            });
            setOrders(res.data);
            setTotal(res.total);
        } catch {
            setOrders([]);
            setTotal(0);
        }
    }, [page, rowsPerPage, status, customerQuery, dateFrom, dateTo]);

    useEffect(() => {
        fetchOrdersReport();
    }, [fetchOrdersReport]);

    return (
        <Card elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, color: '#425A8B', fontSize: '16px' }}>
                        Reporte Detallado de Pedidos (Paginación Server-Side)
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#66789C' }}>
                        Filtrado por estado, cliente (nombre/correo/# pedido) y rango de fechas activo
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                        size="small"
                        placeholder="Filtrar por cliente o # pedido..."
                        value={customerQuery}
                        onChange={(e) => { setCustomerQuery(e.target.value); setPage(0); }}
                        sx={{ minWidth: 240 }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Estado del Pedido"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                        sx={{ minWidth: 185 }}
                    >
                        <MenuItem value="">Todos los estados</MenuItem>
                        {['PAGADO', 'PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO'].map((st) => (
                            <MenuItem key={st} value={st}>{st}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Stack>

            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                            <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}># Pedido</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Fecha</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Estado</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#425A8B' }}>Unidades</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#425A8B' }}>Descuento</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#425A8B' }}>Total (GTQ)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#8C9EC5' }}>
                                    No se encontraron pedidos con los filtros seleccionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((o) => (
                                <TableRow key={o.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#425A8B' }}>{o.orderNumber}</TableCell>
                                    <TableCell sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                        {new Date(o.createdAt).toLocaleDateString('es-GT')}
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>{o.customerName}</Typography>
                                        <Typography sx={{ fontSize: '11.5px', color: '#8C9EC5' }}>{o.customerEmail}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={o.status} size="small" color={STATUS_COLORS[o.status] || 'default'} sx={{ fontWeight: 700, fontSize: '11px' }} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{o.itemsCount}</TableCell>
                                    <TableCell align="right" sx={{ color: '#66789C' }}>Q{o.discount.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#FD9636' }}>Q{o.total.toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Box>

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 20]}
                labelRowsPerPage="Filas por página:"
            />
        </Card>
    );
};
