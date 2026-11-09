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
    // Dual compatibility with PascalCase schema (Users)
    IDUser?: string;
    Email?: string;
    PasswordHash?: string;
    FirstName?: string;
    LastName?: string;
    AvatarURL?: string | null;
    Role?: string;
    IsActive?: boolean | number;
    IsVerify?: boolean | number;
    CreatedAt?: Date | string;
    UpdatedAt?: Date | string;
}

export interface AuthSessionDbRow {
    id: string;
    user_id: string;
    token: string;
    family?: string | null;
    is_revoked?: boolean | number;
    expires_at: Date | string;
    created_at: Date | string;
    // Dual compatibility with PascalCase schema (UserSessions)
    IDSession?: string;
    IDUser?: string;
    RefreshToken?: string;
    Family?: string | null;
    IsRevoked?: boolean | number;
    ExpiresAt?: Date | string;
    CreatedAt?: Date | string;
}

export class AuthMapper {
    static toDomain(row: AuthUserDbRow): AuthUser {
        const role = (row.role ?? row.Role ?? 'Cliente') as AuthUserRole;
        const createdRaw = row.created_at ?? row.CreatedAt;
        const updatedRaw = row.updated_at ?? row.UpdatedAt;
        return {
            id: row.id ?? row.IDUser ?? '',
            firstName: row.first_name ?? row.FirstName ?? '',
            lastName: row.last_name ?? row.LastName ?? '',
            email: row.email ?? row.Email ?? '',
            passwordHash: row.password_hash ?? row.PasswordHash ?? '',
            avatarUrl: row.avatar_url ?? row.AvatarURL ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active ?? row.IsActive),
            isVerify: Boolean(row.is_verify ?? row.IsVerify),
            createdAt: createdRaw ? new Date(createdRaw) : undefined,
            updatedAt: updatedRaw ? new Date(updatedRaw) : undefined,
        };
    }

    static toSession(row: AuthSessionDbRow): AuthSession {
        return {
            id: row.id ?? row.IDSession ?? '',
            userId: row.user_id ?? row.IDUser ?? '',
            token: row.token ?? row.RefreshToken ?? '',
            expiresAt: new Date(row.expires_at ?? row.ExpiresAt ?? new Date()),
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
        };
    }
}
