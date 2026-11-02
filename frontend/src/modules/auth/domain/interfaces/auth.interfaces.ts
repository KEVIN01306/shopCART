export type SystemRole = 'Cliente' | 'Operador' | 'Administrador';

export interface AuthUser {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: SystemRole | string;
    roles?: string[];
    permissions?: string[];
    isActive?: boolean;
    isVerify?: boolean;
    createdAt?: string | Date;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
}
