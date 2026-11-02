import type { AuthUser, AuthUserRole } from "../../domain/auth-user.entity.js";
import type { AuthSession } from "../../domain/auth-session.entity.js";

export interface AuthUserDbRow {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    role: string;
    is_active: boolean | number;
    is_verify: boolean | number;
    created_at?: Date | string;
    updated_at?: Date | string;
}

export interface AuthSessionDbRow {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date | string;
    created_at: Date | string;
}

export class AuthMapper {
    static toDomain(row: AuthUserDbRow): AuthUser {
        const role = (row.role || 'Cliente') as AuthUserRole;
        return {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            passwordHash: row.password_hash,
            avatarUrl: row.avatar_url ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active),
            isVerify: Boolean(row.is_verify),
            createdAt: row.created_at ? new Date(row.created_at) : undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        };
    }

    static toSession(row: AuthSessionDbRow): AuthSession {
        return {
            id: row.id,
            userId: row.user_id,
            token: row.token,
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
        };
    }
}
