import type { ReportsRepository } from "../domain/reports.repository.js";
import type {
    DashboardGranularity,
    DashboardMetrics,
    DashboardMetricsQuery,
} from "../domain/report.entity.js";
import AppError from "@shared/errors/AppError.js";

const VALID_GRANULARITIES: DashboardGranularity[] = ["day", "week", "month"];

export class GetDashboardMetricsUseCase {
    constructor(private readonly reportsRepository: ReportsRepository) {}

    async execute(query: DashboardMetricsQuery = {}): Promise<DashboardMetrics> {
        const granularity: DashboardGranularity =
            query.granularity &&
            VALID_GRANULARITIES.includes(query.granularity)
                ? query.granularity
                : "day";

        if (query.dateFrom && query.dateTo) {
            const fromTime = new Date(query.dateFrom).getTime();
            const toTime = new Date(query.dateTo).getTime();
            if (
                !Number.isNaN(fromTime) &&
                !Number.isNaN(toTime) &&
                fromTime > toTime
            ) {
                throw new AppError(
                    "La fecha de inicio no puede ser posterior a la fecha final.",
                    "INVALID_DATE_RANGE",
                    400
                );
            }
        }

        return this.reportsRepository.getDashboardMetrics({
            dateFrom: query.dateFrom || null,
            dateTo: query.dateTo || null,
            granularity,
        });
    }
}
