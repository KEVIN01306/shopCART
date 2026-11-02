import type { User, GetUser, GetSimpleUser } from "../../domain/user.entity.js";

export interface UserDbRow {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    role?: string | null;
    is_active: boolean | number;
    is_verify: boolean | number;
    created_at: Date | string;
    updated_at: Date | string;
    total_count?: number;
}

export class UsersMapper {
    static toDomain(row: UserDbRow): User {
        const role = row.role || 'Cliente';
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            firstName: row.first_name,
            lastName: row.last_name,
            avatarUrl: row.avatar_url ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active),
            isVerify: Boolean(row.is_verify),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    static toGetUser(row: UserDbRow): GetUser {
        const role = row.role || 'Cliente';
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            avatarUrl: row.avatar_url ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active),
            isVerify: Boolean(row.is_verify),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    static toGetSimpleUser(row: UserDbRow): GetSimpleUser {
        const role = row.role || 'Cliente';
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            avatarUrl: row.avatar_url ?? null,
            isActive: Boolean(row.is_active),
            isVerify: Boolean(row.is_verify),
            role,
            roles: [role],
        };
    }
}
