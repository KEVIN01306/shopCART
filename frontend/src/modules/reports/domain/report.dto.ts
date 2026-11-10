export type DashboardGranularity = 'day' | 'week' | 'month';

export interface DashboardKpiSummaryDto {
    totalRevenueGtq: number;
    totalOrders: number;
    averageTicketGtq: number;
    totalUnitsSold: number;
    cancelledOrdersCount: number;
    returnedUnitsCount: number;
}

export interface SalesSeriesPointDto {
    periodLabel: string;
    revenueGtq: number;
    ordersCount: number;
}

export interface CategorySalesMetricDto {
    categoryId: string;
    categoryName: string;
    unitsSold: number;
    revenueGtq: number;
    ordersCount: number;
}

export interface TopSellingProductMetricDto {
    productId: string;
    productName: string;
    categoryName: string;
    unitsSold: number;
    revenueGtq: number;
}

export interface DashboardMetricsDto {
    kpis: DashboardKpiSummaryDto;
    salesSeries: SalesSeriesPointDto[];
    salesByCategory: CategorySalesMetricDto[];
    topProducts: TopSellingProductMetricDto[];
}

export interface AuditLogEntryDto {
    id: string;
    userId: string | null;
    userName: string;
    userEmail: string | null;
    userRole: string | null;
    entity: string;
    action: string;
    oldValue: Record<string, unknown> | string | null;
    newValue: Record<string, unknown> | string | null;
    createdAt: string;
}

export interface PaginatedAuditLogsResponse {
    data: AuditLogEntryDto[];
    total: number;
    limit: number;
    offset: number;
}
