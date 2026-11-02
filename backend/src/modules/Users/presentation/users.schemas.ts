import { z } from "zod";

export const VALID_SYSTEM_ROLES = ["Cliente", "Operador", "Administrador"] as const;
export type SystemRole = (typeof VALID_SYSTEM_ROLES)[number];

export const isValidUserEmailDomain = (email?: string | null): boolean => {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const RoleEnumSchema = z.enum(VALID_SYSTEM_ROLES);

export const CreateUserSchema = z
    .object({
        email: z
            .string()
            .trim()
            .email("Invalid email format"),
        passwordRaw: z.string().min(8, "Password must be at least 8 characters long").optional(),
        autoGeneratePassword: z.boolean().optional(),
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        avatarUrl: z.string().url("Invalid avatar URL").nullable().optional(),
        role: RoleEnumSchema.optional(),
        roles: z.array(RoleEnumSchema).optional(),
    })
    .refine((data) => data.autoGeneratePassword || (data.passwordRaw && data.passwordRaw.length >= 8), {
        message: "Debe ingresar una contraseña de al menos 8 caracteres o seleccionar 'Generar contraseña automáticamente'",
        path: ["passwordRaw"],
    })
    .transform((data) => {
        const resolvedRole: SystemRole = data.role || data.roles?.[0] || "Cliente";
        const resolvedRoles: SystemRole[] = data.roles && data.roles.length > 0 ? data.roles : [resolvedRole];
        return {
            ...data,
            role: resolvedRole,
            roles: resolvedRoles,
        };
    });

export const UpdateUserSchema = z
    .object({
        email: z
            .string()
            .trim()
            .email("Invalid email format")
            .optional(),
        passwordRaw: z.string().min(8, "Password must be at least 8 characters long").optional(),
        firstName: z.string().trim().min(1, "First name must not be empty").optional(),
        lastName: z.string().trim().min(1, "Last name must not be empty").optional(),
        avatarUrl: z.string().url("Invalid avatar URL").nullable().optional(),
        role: RoleEnumSchema.optional(),
        roles: z.array(RoleEnumSchema).optional(),
    })
    .transform((data) => {
        const resolvedRole = data.role || data.roles?.[0];
        const resolvedRoles = data.roles && data.roles.length > 0
            ? data.roles
            : resolvedRole
            ? [resolvedRole]
            : undefined;
        return {
            ...data,
            ...(resolvedRole ? { role: resolvedRole } : {}),
            ...(resolvedRoles ? { roles: resolvedRoles } : {}),
        };
    });

export const UserIdSchema = z.object({
    id: z.string().uuid("Invalid user ID format"),
});

export const ChangePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters long"),
        confirmPassword: z.string().min(1, "Password confirmation is required"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });
