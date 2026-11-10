import type {
    AuditLogEntry,
    CategorySalesMetric,
    DashboardKpiSummary,
    DashboardMetrics,
    SalesSeriesPoint,
    TopSellingProductMetric,
} from "../../domain/report.entity.js";

export interface DashboardKpiDbRow {
    total_revenue_gtq: number | string;
    total_orders: number | string;
    average_ticket_gtq: number | string;
    total_units_sold: number | string;
    cancelled_orders_count: number | string;
    returned_units_count: number | string;
}

export interface SalesSeriesDbRow {
    period_label: string;
    revenue_gtq: number | string;
    orders_count: number | string;
}

export interface CategorySalesDbRow {
    category_id: string;
    category_name: string;
    units_sold: number | string;
    revenue_gtq: number | string;
    orders_count: number | string;
}

export interface TopSellingProductDbRow {
    product_id: string;
    product_name: string;
    category_name: string;
    units_sold: number | string;
    revenue_gtq: number | string;
}

export interface AuditLogDbRow {
    id: string;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    user_role: string | null;
    entity: string;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: Date | string;
    total_count?: number | string;
}

function parseJsonValue(
    raw: string | null
): Record<string, unknown> | string | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
            return parsed as Record<string, unknown>;
        }
        return String(raw);
    } catch {
        return raw;
    }
}

export class ReportMapper {
    static toKpiSummary(row?: DashboardKpiDbRow): DashboardKpiSummary {
        return {
            totalRevenueGtq: Number(row?.total_revenue_gtq ?? 0),
            totalOrders: Number(row?.total_orders ?? 0),
            averageTicketGtq: Number(row?.average_ticket_gtq ?? 0),
            totalUnitsSold: Number(row?.total_units_sold ?? 0),
            cancelledOrdersCount: Number(row?.cancelled_orders_count ?? 0),
            returnedUnitsCount: Number(row?.returned_units_count ?? 0),
        };
    }

    static toSalesSeriesPoint(row: SalesSeriesDbRow): SalesSeriesPoint {
        return {
            periodLabel: row.period_label,
            revenueGtq: Number(row.revenue_gtq ?? 0),
            ordersCount: Number(row.orders_count ?? 0),
        };
    }

    static toCategorySalesMetric(row: CategorySalesDbRow): CategorySalesMetric {
        return {
            categoryId: row.category_id,
            categoryName: row.category_name,
            unitsSold: Number(row.units_sold ?? 0),
            revenueGtq: Number(row.revenue_gtq ?? 0),
            ordersCount: Number(row.orders_count ?? 0),
        };
    }

    static toTopSellingProduct(
        row: TopSellingProductDbRow
    ): TopSellingProductMetric {
        return {
            productId: row.product_id,
            productName: row.product_name,
            categoryName: row.category_name,
            unitsSold: Number(row.units_sold ?? 0),
            revenueGtq: Number(row.revenue_gtq ?? 0),
        };
    }

    static toDashboardMetrics(
        kpiRow?: DashboardKpiDbRow,
        seriesRows: SalesSeriesDbRow[] = [],
        categoryRows: CategorySalesDbRow[] = [],
        topProductRows: TopSellingProductDbRow[] = []
    ): DashboardMetrics {
        return {
            kpis: this.toKpiSummary(kpiRow),
            salesSeries: seriesRows.map((r) => this.toSalesSeriesPoint(r)),
            salesByCategory: categoryRows.map((r) =>
                this.toCategorySalesMetric(r)
            ),
            topProducts: topProductRows.map((r) =>
                this.toTopSellingProduct(r)
            ),
        };
    }

    static toAuditLogEntry(row: AuditLogDbRow): AuditLogEntry {
        return {
            id: row.id,
            userId: row.user_id ?? null,
            userName: row.user_name || "Sistema / Trigger SQL",
            userEmail: row.user_email ?? null,
            userRole: row.user_role ?? null,
            entity: row.entity,
            action: row.action,
            oldValue: parseJsonValue(row.old_value),
            newValue: parseJsonValue(row.new_value),
            createdAt: new Date(row.created_at),
        };
    }
}
