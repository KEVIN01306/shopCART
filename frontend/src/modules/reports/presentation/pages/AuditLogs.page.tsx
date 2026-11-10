import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Card, Typography, Stack, TextField, MenuItem, Chip, Table, TableHead,
    TableRow, TableCell, TableBody, TablePagination, Alert,
} from '@mui/material';
import { FactCheckOutlined } from '@mui/icons-material';
import { getAuditLogsPaginated } from '../../infrastructure/services/reports.service';
import type { AuditLogEntryDto } from '../../domain/report.dto';

const formatAuditPayload = (val: Record<string, unknown> | string | null): string => {
    if (!val) return '—';
    if (typeof val === 'string') return val;
    return JSON.stringify(val, null, 2);
};

const ENTITY_OPTIONS = ['PRODUCTO', 'PRECIO', 'EXISTENCIA', 'CUPON', 'PEDIDO'];

export const AuditLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntryDto[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(15);
    const [entity, setEntity] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const loadAuditLogs = useCallback(async () => {
        try {
            setError(null);
            const res = await getAuditLogsPaginated({
                page: page + 1,
                limit: rowsPerPage,
                entity: entity || undefined,
                q: search.trim() || undefined,
            });
            setLogs(res.data);
            setTotal(res.total);
        } catch {
            setError('No se pudo cargar la bitácora de auditoría.');
        }
    }, [page, rowsPerPage, entity, search]);

    useEffect(() => {
        loadAuditLogs();
    }, [loadAuditLogs]);

    return (
        <Box sx={{ maxWidth: 1320, mx: 'auto', px: 3, py: 3 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
                <FactCheckOutlined sx={{ color: '#FD9636', fontSize: 32 }} />
                <Box>
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#425A8B' }}>
                        Bitácora de Auditoría Inmutable (RF-09)
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>
                        Registro histórico de cambios de precios, ajustes de existencias, cupones y estados de pedido
                    </Typography>
                </Box>
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

            <Card elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        size="small" fullWidth placeholder="Buscar por acción, usuario, SKU o valor JSON..."
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    />
                    <TextField
                        select size="small" label="Módulo / Entidad" value={entity}
                        onChange={(e) => { setEntity(e.target.value); setPage(0); }} sx={{ minWidth: 220 }}
                    >
                        <MenuItem value="">Todos los módulos</MenuItem>
                        {ENTITY_OPTIONS.map((ent) => (
                            <MenuItem key={ent} value={ent}>{ent}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Card>

            <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid #D5DFE4', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Fecha / Hora</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Usuario</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Módulo</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Acción</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Valor Anterior (OldValue)</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#425A8B' }}>Valor Nuevo (NewValue)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#8C9EC5' }}>
                                        No se encontraron eventos de auditoría con los criterios indicados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} hover sx={{ verticalAlign: 'top' }}>
                                        <TableCell sx={{ fontSize: '12px', color: '#66789C', whiteSpace: 'nowrap' }}>
                                            {new Date(log.createdAt).toLocaleString('es-GT')}
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#425A8B' }}>{log.userName}</Typography>
                                            {log.userEmail && <Typography sx={{ fontSize: '11px', color: '#8C9EC5' }}>{log.userEmail}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.entity} size="small" sx={{ bgcolor: '#F0F3F8', color: '#425A8B', fontWeight: 800, fontSize: '11px' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.action} size="small" sx={{ bgcolor: '#FFF3E6', color: '#E07B1B', fontWeight: 700, fontSize: '11px' }} />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 280 }}>
                                            <Box component="pre" sx={{ m: 0, p: 1, bgcolor: '#F8FAFC', borderRadius: '6px', fontSize: '11px', color: '#66789C', overflowX: 'auto' }}>
                                                {formatAuditPayload(log.oldValue)}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 280 }}>
                                            <Box component="pre" sx={{ m: 0, p: 1, bgcolor: '#F8FAFC', borderRadius: '6px', fontSize: '11px', color: '#425A8B', overflowX: 'auto' }}>
                                                {formatAuditPayload(log.newValue)}
                                            </Box>
                                        </TableCell>
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
                    rowsPerPageOptions={[10, 15, 30]}
                    labelRowsPerPage="Registros por página:"
                />
            </Card>
        </Box>
    );
};

export default AuditLogsPage;
