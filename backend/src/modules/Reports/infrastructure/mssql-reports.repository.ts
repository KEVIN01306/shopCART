import sql from "mssql";
import type { ReportsRepository } from "../domain/reports.repository.js";
import type {
    DashboardMetrics,
    DashboardMetricsQuery,
    ListAuditLogsOptions,
    PaginatedAuditLogs,
} from "../domain/report.entity.js";
import {
    ReportMapper,
    type AuditLogDbRow,
    type CategorySalesDbRow,
    type DashboardKpiDbRow,
    type SalesSeriesDbRow,
    type TopSellingProductDbRow,
} from "./mappers/report.mapper.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";

export type PoolProvider = () => Promise<sql.ConnectionPool>;

export class MssqlReportsRepository implements ReportsRepository {
    constructor(private readonly getPool: PoolProvider) {}

    async getDashboardMetrics(
        query: DashboardMetricsQuery
    ): Promise<DashboardMetrics> {
        try {
            const pool = await this.getPool();
            const parsedFrom = query.dateFrom ? new Date(query.dateFrom) : null;
            const parsedTo = query.dateTo ? new Date(query.dateTo) : null;
            const granularity = query.granularity || "day";

            const result = await pool
                .request()
                .input("p_date_from", sql.DateTime2, parsedFrom)
                .input("p_date_to", sql.DateTime2, parsedTo)
                .input("p_granularity", sql.VarChar(15), granularity)
                .execute("SP_Reportes_ObtenerDashboard");

            const recordsets = result.recordsets as unknown as [
                DashboardKpiDbRow[]?,
                SalesSeriesDbRow[]?,
                CategorySalesDbRow[]?,
                TopSellingProductDbRow[]?,
            ];

            const kpiRow =
                recordsets?.[0]?.[0] ??
                ((result.recordset as unknown as DashboardKpiDbRow[])?.[0] ||
                    undefined);
            const seriesRows = recordsets?.[1] ?? [];
            const categoryRows = recordsets?.[2] ?? [];
            const topProductRows = recordsets?.[3] ?? [];

            return ReportMapper.toDashboardMetrics(
                kpiRow,
                seriesRows,
                categoryRows,
                topProductRows
            );
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async listAuditLogsPaginated(
        options: ListAuditLogsOptions
    ): Promise<PaginatedAuditLogs> {
        try {
            const pool = await this.getPool();
            const result = await pool
                .request()
                .input("p_page", sql.Int, options.page)
                .input("p_limit", sql.Int, options.limit)
                .input("p_entity", sql.VarChar(50), options.entity ?? null)
                .input("p_action", sql.VarChar(50), options.action ?? null)
                .input("p_q", sql.NVarChar(100), options.q ?? null)
                .execute<AuditLogDbRow>("SP_Auditoria_ListarPaginado");

            const rows = result.recordset ?? [];
            const total =
                rows.length > 0 && rows[0]?.total_count !== undefined
                    ? Number(rows[0].total_count)
                    : 0;

            return {
                data: rows.map((r) => ReportMapper.toAuditLogEntry(r)),
                total,
            };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}
