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
    // Dual compatibility with PascalCase schema (Users)
    IDUser?: string;
    Email?: string;
    PasswordHash?: string;
    FirstName?: string;
    LastName?: string;
    AvatarURL?: string | null;
    Role?: string | null;
    IsActive?: boolean | number;
    IsVerify?: boolean | number;
    CreatedAt?: Date | string;
    UpdatedAt?: Date | string;
}

export class UsersMapper {
    static toDomain(row: UserDbRow): User {
        const role = row.role ?? row.Role ?? 'Cliente';
        return {
            id: row.id ?? row.IDUser ?? '',
            email: row.email ?? row.Email ?? '',
            passwordHash: row.password_hash ?? row.PasswordHash ?? '',
            firstName: row.first_name ?? row.FirstName ?? '',
            lastName: row.last_name ?? row.LastName ?? '',
            avatarUrl: row.avatar_url ?? row.AvatarURL ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active ?? row.IsActive),
            isVerify: Boolean(row.is_verify ?? row.IsVerify),
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
            updatedAt: new Date(row.updated_at ?? row.UpdatedAt ?? new Date()),
        };
    }

    static toGetUser(row: UserDbRow): GetUser {
        const role = row.role ?? row.Role ?? 'Cliente';
        return {
            id: row.id ?? row.IDUser ?? '',
            email: row.email ?? row.Email ?? '',
            firstName: row.first_name ?? row.FirstName ?? '',
            lastName: row.last_name ?? row.LastName ?? '',
            avatarUrl: row.avatar_url ?? row.AvatarURL ?? null,
            role,
            roles: [role],
            isActive: Boolean(row.is_active ?? row.IsActive),
            isVerify: Boolean(row.is_verify ?? row.IsVerify),
            createdAt: new Date(row.created_at ?? row.CreatedAt ?? new Date()),
            updatedAt: new Date(row.updated_at ?? row.UpdatedAt ?? new Date()),
        };
    }

    static toGetSimpleUser(row: UserDbRow): GetSimpleUser {
        const role = row.role ?? row.Role ?? 'Cliente';
        return {
            id: row.id ?? row.IDUser ?? '',
            email: row.email ?? row.Email ?? '',
            firstName: row.first_name ?? row.FirstName ?? '',
            lastName: row.last_name ?? row.LastName ?? '',
            avatarUrl: row.avatar_url ?? row.AvatarURL ?? null,
            isActive: Boolean(row.is_active ?? row.IsActive),
            isVerify: Boolean(row.is_verify ?? row.IsVerify),
            role,
            roles: [role],
        };
    }
}
