import React from 'react';
import { Box, Card, Typography, Stack, LinearProgress, Chip, Tooltip } from '@mui/material';
import type {
    CategorySalesMetricDto,
    DashboardGranularity,
    SalesSeriesPointDto,
    TopSellingProductMetricDto,
} from '../../domain/report.dto';

interface DashboardChartsSectionProps {
    granularity: DashboardGranularity;
    salesSeries: SalesSeriesPointDto[];
    salesByCategory: CategorySalesMetricDto[];
    topProducts: TopSellingProductMetricDto[];
}

const formatGtq = (value: number) =>
    `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DashboardChartsSection: React.FC<DashboardChartsSectionProps> = ({
    granularity,
    salesSeries,
    salesByCategory,
    topProducts,
}) => {
    const maxSeriesRev = Math.max(...salesSeries.map((s) => s.revenueGtq), 1);
    const totalCatRev = Math.max(salesByCategory.reduce((acc, c) => acc + c.revenueGtq, 0), 1);
    const maxProdUnits = Math.max(...topProducts.map((p) => p.unitsSold), 1);
    const granLabel = granularity === 'week' ? 'Semana' : granularity === 'month' ? 'Mes' : 'Día';

    return (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5 }}>
                {/* 1. Ventas por Día / Semana / Mes */}
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography sx={{ fontWeight: 800, color: '#425A8B', fontSize: '16px' }}>
                                Evolución de Ventas Netas por {granLabel} (GTQ)
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#66789C' }}>
                                Excluye pedidos cancelados y descuenta ítems devueltos
                            </Typography>
                        </Box>
                        <Chip label={`${salesSeries.length} periodos`} size="small" sx={{ bgcolor: '#F0F3F8', color: '#425A8B', fontWeight: 700 }} />
                    </Stack>

                    {salesSeries.length === 0 ? (
                        <Typography sx={{ py: 5, textAlign: 'center', color: '#8C9EC5', fontSize: '13px' }}>
                            Sin ventas registradas en el periodo seleccionado.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 195, pt: 3, px: 1, overflowX: 'auto' }}>
                            {salesSeries.map((pt) => {
                                const heightPct = Math.max(8, Math.round((pt.revenueGtq / maxSeriesRev) * 100));
                                return (
                                    <Tooltip key={pt.periodLabel} title={`${pt.periodLabel}: ${formatGtq(pt.revenueGtq)} (${pt.ordersCount} pedidos)`} arrow>
                                        <Box sx={{ flex: '1 0 54px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                            <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#425A8B', mb: 0.5 }}>
                                                {formatGtq(pt.revenueGtq)}
                                            </Typography>
                                            <Box sx={{ width: '100%', maxWidth: 42, height: `${heightPct}%`, bgcolor: '#425A8B', borderRadius: '6px 6px 2px 2px', transition: 'all 0.25s', '&:hover': { bgcolor: '#FD9636' } }} />
                                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#66789C', mt: 0.75 }} noWrap>
                                                {pt.periodLabel}
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#8C9EC5' }}>{pt.ordersCount} ped.</Typography>
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    )}
                </Card>

                {/* 2. Ventas por Categoría (GTQ) */}
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                    <Typography sx={{ fontWeight: 800, color: '#425A8B', fontSize: '16px', mb: 0.5 }}>
                        Ventas por Categoría (GTQ)
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#66789C', mb: 2 }}>
                        Participación sobre ingresos netos y unidades comercializadas
                    </Typography>
                    <Stack spacing={1.75}>
                        {salesByCategory.length === 0 && (
                            <Typography sx={{ py: 4, textAlign: 'center', color: '#8C9EC5', fontSize: '13px' }}>
                                Sin datos por categoría.
                            </Typography>
                        )}
                        {salesByCategory.map((cat) => {
                            const share = Math.round((cat.revenueGtq / totalCatRev) * 100);
                            return (
                                <Box key={cat.categoryId}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>
                                            {cat.categoryName} <Box component="span" sx={{ color: '#8C9EC5', fontWeight: 500 }}>({cat.unitsSold} uds)</Box>
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#425A8B' }}>
                                            {formatGtq(cat.revenueGtq)} ({share}%)
                                        </Typography>
                                    </Stack>
                                    <LinearProgress variant="determinate" value={share} sx={{ height: 8, borderRadius: 4, bgcolor: '#F0F3F8', '& .MuiLinearProgress-bar': { bgcolor: '#FD9636', borderRadius: 4 } }} />
                                </Box>
                            );
                        })}
                    </Stack>
                </Card>
            </Box>

            {/* 3. Top 10 Productos Más Vendidos */}
            <Card elevation={0} sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                <Typography sx={{ fontWeight: 800, color: '#425A8B', fontSize: '16px', mb: 0.5 }}>
                    Top 10 Productos Más Vendidos
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#66789C', mb: 2 }}>
                    Ranking por unidades netas vendidas e ingresos generados en Quetzales (GTQ)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                    {topProducts.map((prod, idx) => (
                        <Box key={prod.productId} sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #E5E9F2', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Chip label={`#${idx + 1}`} size="small" sx={{ fontWeight: 800, bgcolor: idx < 3 ? '#FD9636' : '#F0F3F8', color: idx < 3 ? '#FFF' : '#425A8B' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#425A8B' }} noWrap>{prod.productName}</Typography>
                                <Typography sx={{ fontSize: '11.5px', color: '#8C9EC5' }}>{prod.categoryName}</Typography>
                                <LinearProgress variant="determinate" value={Math.round((prod.unitsSold / maxProdUnits) * 100)} sx={{ mt: 0.75, height: 5, borderRadius: 3, bgcolor: '#F0F3F8', '& .MuiLinearProgress-bar': { bgcolor: '#425A8B' } }} />
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#425A8B' }}>{prod.unitsSold} uds</Typography>
                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#FD9636' }}>{formatGtq(prod.revenueGtq)}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Card>
        </Stack>
    );
};
