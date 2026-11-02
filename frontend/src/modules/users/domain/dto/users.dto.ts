export type SystemRoleName = 'Cliente' | 'Operador' | 'Administrador';

export interface RoleDto {
    id: string;
    name: SystemRoleName | string;
    description?: string | null;
}

export interface UserDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    role?: SystemRoleName | string;
    roles?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateUserDto {
    email: string;
    passwordRaw?: string;
    autoGeneratePassword?: boolean;
    firstName: string;
    lastName: string;
    role?: string;
    roles: string[];
}

export interface UpdateUserDto {
    email?: string;
    passwordRaw?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    roles?: string[];
}
