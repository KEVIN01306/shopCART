export type UserRole = 'Cliente' | 'Operador' | 'Administrador';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role: string;
    roles: string[];
    isActive: boolean;
    isVerify: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUser {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role?: string;
    roles?: string[];
    isVerify?: boolean;
}

export interface UpdateUser {
    email?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    role?: string;
    roles?: string[];
    isVerify?: boolean;
}

export interface GetUser extends Omit<User, 'passwordHash'> {
    role: string;
    roles: string[];
    emailSent?: boolean;
    generatedPassword?: string;
}

export interface GetSimpleUser extends Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'isActive' | 'isVerify' | 'avatarUrl'> {
    role: string;
    roles: string[];
}
