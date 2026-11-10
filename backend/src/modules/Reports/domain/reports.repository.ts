import type {
    DashboardMetrics,
    DashboardMetricsQuery,
    ListAuditLogsOptions,
    PaginatedAuditLogs,
} from "./report.entity.js";

export interface ReportsRepository {
    getDashboardMetrics(query: DashboardMetricsQuery): Promise<DashboardMetrics>;
    listAuditLogsPaginated(
        options: ListAuditLogsOptions
    ): Promise<PaginatedAuditLogs>;
}
