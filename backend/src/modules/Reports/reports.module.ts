import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlReportsRepository } from "./infrastructure/mssql-reports.repository.js";
import { GetDashboardMetricsUseCase } from "./application/get-dashboard-metrics.usecase.js";
import { ListAuditLogsUseCase } from "./application/list-audit-logs.usecase.js";
import { ReportsController } from "./presentation/reports.controller.js";

export const reportsRepository = new MssqlReportsRepository(getPool);

export const getDashboardMetricsUseCase = new GetDashboardMetricsUseCase(
    reportsRepository
);
export const listAuditLogsUseCase = new ListAuditLogsUseCase(reportsRepository);

export const reportsController = new ReportsController(
    getDashboardMetricsUseCase,
    listAuditLogsUseCase
);
