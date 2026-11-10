import { api } from '../../../../core/api/axios.instance';
import type {
    AuditLogEntryDto,
    DashboardGranularity,
    DashboardMetricsDto,
    PaginatedAuditLogsResponse,
} from '../../domain/report.dto';

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
    meta?: {
        total: number;
        limit: number;
        offset: number;
    };
}

export const getDashboardMetrics = async (params?: {
    dateFrom?: string;
    dateTo?: string;
    granularity?: DashboardGranularity;
}): Promise<DashboardMetricsDto> => {
    const res = await api.get<ApiResponse<DashboardMetricsDto>>('/reports/dashboard', {
        params,
    });
    return res.data.data;
};

export const getAuditLogsPaginated = async (params?: {
    page?: number;
    limit?: number;
    entity?: string;
    action?: string;
    q?: string;
}): Promise<PaginatedAuditLogsResponse> => {
    const res = await api.get<ApiResponse<AuditLogEntryDto[]>>('/reports/audit-logs', {
        params,
    });
    return {
        data: res.data.data,
        total: res.data.meta?.total ?? res.data.data.length,
        limit: res.data.meta?.limit ?? (params?.limit || 20),
        offset: res.data.meta?.offset ?? 0,
    };
};
