import { api } from '../../../../core/api/axios.instance';
import type { UserDto, CreateUserDto, UpdateUserDto, RoleDto } from '../../domain/dto/users.dto';

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

export interface PaginatedUsersResponse {
    data: UserDto[];
    total: number;
    limit: number;
    offset: number;
}

export const getRoles = async (): Promise<RoleDto[]> => {
    const response = await api.get<ApiResponse<RoleDto[]>>('/users/roles');
    return response.data.data;
};

export const getUsersPaginated = async (
    page: number = 1,
    limit: number = 10,
    q?: string
): Promise<PaginatedUsersResponse> => {
    const params: Record<string, unknown> = { page, limit };
    if (q) params.q = q;

    const response = await api.get<ApiResponse<UserDto[]>>('/users', { params });
    return {
        data: response.data.data,
        total: response.data.meta?.total ?? response.data.data.length,
        limit: response.data.meta?.limit ?? limit,
        offset: response.data.meta?.offset ?? (page - 1) * limit,
    };
};

export const createUser = async (data: CreateUserDto): Promise<UserDto> => {
    const response = await api.post<ApiResponse<UserDto>>('/users', data);
    return response.data.data;
};

export const updateUser = async (id: string, data: UpdateUserDto): Promise<UserDto> => {
    const response = await api.put<ApiResponse<UserDto>>(`/users/${id}`, data);
    return response.data.data;
};

export const disableUser = async (id: string): Promise<UserDto> => {
    const response = await api.patch<ApiResponse<UserDto>>(`/users/${id}/disable`);
    return response.data.data;
};

export const activateUser = async (id: string): Promise<UserDto> => {
    const response = await api.patch<ApiResponse<UserDto>>(`/users/${id}/activate`);
    return response.data.data;
};

export const deleteUser = async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
};
