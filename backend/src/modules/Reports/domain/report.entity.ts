export type DashboardGranularity = "day" | "week" | "month";

export type AuditLogEntityFilter =
    | "PRODUCTO"
    | "PRECIO"
    | "EXISTENCIA"
    | "CUPON"
    | "PEDIDO"
    | string;

export interface DashboardKpiSummary {
    totalRevenueGtq: number;
    totalOrders: number;
    averageTicketGtq: number;
    totalUnitsSold: number;
    cancelledOrdersCount: number;
    returnedUnitsCount: number;
}

export interface SalesSeriesPoint {
    periodLabel: string;
    revenueGtq: number;
    ordersCount: number;
}

export interface CategorySalesMetric {
    categoryId: string;
    categoryName: string;
    unitsSold: number;
    revenueGtq: number;
    ordersCount: number;
}

export interface TopSellingProductMetric {
    productId: string;
    productName: string;
    categoryName: string;
    unitsSold: number;
    revenueGtq: number;
}

export interface DashboardMetrics {
    kpis: DashboardKpiSummary;
    salesSeries: SalesSeriesPoint[];
    salesByCategory: CategorySalesMetric[];
    topProducts: TopSellingProductMetric[];
}

export interface DashboardMetricsQuery {
    dateFrom?: string | null;
    dateTo?: string | null;
    granularity?: DashboardGranularity;
}

export interface AuditLogEntry {
    id: string;
    userId: string | null;
    userName: string;
    userEmail: string | null;
    userRole: string | null;
    entity: string;
    action: string;
    oldValue: Record<string, unknown> | string | null;
    newValue: Record<string, unknown> | string | null;
    createdAt: Date;
}

export interface ListAuditLogsOptions {
    page: number;
    limit: number;
    entity?: string | null;
    action?: string | null;
    q?: string | null;
}

export interface PaginatedAuditLogs {
    data: AuditLogEntry[];
    total: number;
}
