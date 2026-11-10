import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import BaseController from "@presentation/base.controller.js";
import type { GetDashboardMetricsUseCase } from "../application/get-dashboard-metrics.usecase.js";
import type { ListAuditLogsUseCase } from "../application/list-audit-logs.usecase.js";
import type { DashboardGranularity } from "../domain/report.entity.js";

export class ReportsController extends BaseController {
    constructor(
        private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
        private readonly listAuditLogsUseCase: ListAuditLogsUseCase
    ) {
        super();
    }

    getDashboard = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dateFrom = req.query.dateFrom
                ? String(req.query.dateFrom).trim()
                : undefined;
            const dateTo = req.query.dateTo
                ? String(req.query.dateTo).trim()
                : undefined;
            const rawGranularity = req.query.granularity
                ? String(req.query.granularity).trim().toLowerCase()
                : "day";
            const granularity: DashboardGranularity =
                rawGranularity === "week" || rawGranularity === "month"
                    ? rawGranularity
                    : "day";

            const metrics = await this.getDashboardMetricsUseCase.execute({
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                granularity,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.success(
                        "Métricas del dashboard comercial obtenidas exitosamente",
                        metrics
                    )
                );
        } catch (error) {
            next(error);
        }
    };

    listAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = req.query.page
                ? Math.max(1, parseInt(String(req.query.page), 10) || 1)
                : 1;
            const limit = req.query.limit
                ? Math.max(1, parseInt(String(req.query.limit), 10) || 20)
                : 20;
            const entity = req.query.entity
                ? String(req.query.entity).trim()
                : undefined;
            const action = req.query.action
                ? String(req.query.action).trim()
                : undefined;
            const q = req.query.q ? String(req.query.q).trim() : undefined;
            const offset = (page - 1) * limit;

            const result = await this.listAuditLogsUseCase.execute({
                page,
                limit,
                entity: entity || null,
                action: action || null,
                q: q || null,
            });

            return res
                .status(200)
                .json(
                    ResponseHttp.pagination(
                        "Bitácora de auditoría obtenida exitosamente",
                        result.data,
                        result.total,
                        limit,
                        offset
                    )
                );
        } catch (error) {
            next(error);
        }
    };
}
