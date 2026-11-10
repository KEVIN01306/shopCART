import type { ReportsRepository } from "../domain/reports.repository.js";
import type {
    ListAuditLogsOptions,
    PaginatedAuditLogs,
} from "../domain/report.entity.js";

export class ListAuditLogsUseCase {
    constructor(private readonly reportsRepository: ReportsRepository) {}

    async execute(options: ListAuditLogsOptions): Promise<PaginatedAuditLogs> {
        return this.reportsRepository.listAuditLogsPaginated({
            page: Math.max(1, options.page || 1),
            limit: Math.min(100, Math.max(1, options.limit || 20)),
            entity: options.entity || null,
            action: options.action || null,
            q: options.q || null,
        });
    }
}
