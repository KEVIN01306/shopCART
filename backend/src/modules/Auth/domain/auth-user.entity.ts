export type AuthUserRole = 'Cliente' | 'Operador' | 'Administrador';

export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string | null;
    role: AuthUserRole;
    roles: string[];
    isActive: boolean;
    isVerify: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
