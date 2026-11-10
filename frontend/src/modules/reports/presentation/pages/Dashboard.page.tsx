import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Card, Typography, Stack, TextField, MenuItem, Button, Alert, Chip,
} from '@mui/material';
import {
    AssessmentOutlined, PaidOutlined, ShoppingBagOutlined,
    ConfirmationNumberOutlined, InventoryOutlined, RefreshOutlined,
} from '@mui/icons-material';
import { getDashboardMetrics } from '../../infrastructure/services/reports.service';
import type { DashboardGranularity, DashboardMetricsDto } from '../../domain/report.dto';
import { DashboardChartsSection } from '../components/DashboardChartsSection';
import { DashboardOrdersReportTable } from '../components/DashboardOrdersReportTable';

const formatGtq = (value: number) =>
    `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DashboardPage: React.FC = () => {
    const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
    const [granularity, setGranularity] = useState<DashboardGranularity>('day');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const loadMetrics = useCallback(async () => {
        try {
            setError(null);
            const data = await getDashboardMetrics({
                granularity,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            });
            setMetrics(data);
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Error al cargar las métricas del dashboard comercial.'
            );
        }
    }, [granularity, dateFrom, dateTo]);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    const kpis = metrics?.kpis;
    const kpiCards = [
        {
            title: 'Ventas Netas (GTQ)',
            value: formatGtq(kpis?.totalRevenueGtq ?? 0),
            subtitle: `Descuenta ${kpis?.returnedUnitsCount ?? 0} uds devueltas`,
            icon: <PaidOutlined sx={{ color: '#FD9636', fontSize: 28 }} />,
        },
        {
            title: 'Pedidos Completados',
            value: String(kpis?.totalOrders ?? 0),
            subtitle: `Excluye ${kpis?.cancelledOrdersCount ?? 0} cancelados`,
            icon: <ShoppingBagOutlined sx={{ color: '#425A8B', fontSize: 28 }} />,
        },
        {
            title: 'Ticket Promedio (GTQ)',
            value: formatGtq(kpis?.averageTicketGtq ?? 0),
            subtitle: 'Promedio neto por pedido pagado',
            icon: <ConfirmationNumberOutlined sx={{ color: '#FD9636', fontSize: 28 }} />,
        },
        {
            title: 'Unidades Vendidas (Netas)',
            value: String(kpis?.totalUnitsSold ?? 0),
            subtitle: 'Unidades efectivas entregadas/pagadas',
            icon: <InventoryOutlined sx={{ color: '#425A8B', fontSize: 28 }} />,
        },
    ];

    return (
        <Box sx={{ maxWidth: 1320, mx: 'auto', px: 3, py: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <AssessmentOutlined sx={{ color: '#FD9636', fontSize: 32 }} />
                    <Box>
                        <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#425A8B' }}>
                            Dashboard Comercial y Reportes (GTQ)
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: '#66789C' }}>
                            KPIs ejecutivos, ventas por periodo/categoría, Top 10 productos y reporte de pedidos
                        </Typography>
                    </Box>
                </Stack>
                <Chip label="Moneda Oficial: Quetzales (GTQ)" sx={{ bgcolor: '#FFF3E6', color: '#E07B1B', fontWeight: 800 }} />
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

            <Card elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                    <TextField
                        select size="small" label="Agrupación Temporal" value={granularity}
                        onChange={(e) => setGranularity(e.target.value as DashboardGranularity)} sx={{ minWidth: 180 }}
                    >
                        <MenuItem value="day">Por Día</MenuItem>
                        <MenuItem value="week">Por Semana</MenuItem>
                        <MenuItem value="month">Por Mes</MenuItem>
                    </TextField>
                    <TextField
                        size="small" type="date" label="Fecha Desde" value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                        size="small" type="date" label="Fecha Hasta" value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={() => { setDateFrom(''); setDateTo(''); setGranularity('day'); }} sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#425A8B', color: '#425A8B' }}>
                        Limpiar Filtros
                    </Button>
                </Stack>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                {kpiCards.map((card) => (
                    <Card key={card.title} elevation={0} sx={{ p: 2.25, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#66789C' }}>{card.title}</Typography>
                            {card.icon}
                        </Stack>
                        <Typography sx={{ fontSize: '23px', fontWeight: 800, color: '#425A8B', mb: 0.5 }}>{card.value}</Typography>
                        <Typography sx={{ fontSize: '11.5px', color: '#8C9EC5' }}>{card.subtitle}</Typography>
                    </Card>
                ))}
            </Box>

            <DashboardChartsSection
                granularity={granularity}
                salesSeries={metrics?.salesSeries ?? []}
                salesByCategory={metrics?.salesByCategory ?? []}
                topProducts={metrics?.topProducts ?? []}
            />

            <DashboardOrdersReportTable dateFrom={dateFrom} dateTo={dateTo} />
        </Box>
    );
};

export default DashboardPage;
