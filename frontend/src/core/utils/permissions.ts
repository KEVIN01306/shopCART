import type { AuthUser, SystemRole } from '../../modules/auth/domain/interfaces/auth.interfaces';

export const SYSTEM_ROLES: readonly SystemRole[] = [
    'Cliente',
    'Operador',
    'Administrador',
] as const;

/**
 * Extracts normalized role names from an AuthUser object or a role string/array.
 */
export const extractUserRoles = (
    userOrRoles: AuthUser | string | string[] | null | undefined
): string[] => {
    if (!userOrRoles) return [];

    if (typeof userOrRoles === 'string') {
        return [userOrRoles];
    }

    if (Array.isArray(userOrRoles)) {
        return userOrRoles.filter(Boolean);
    }

    if (typeof userOrRoles === 'object') {
        const user = userOrRoles as AuthUser;
        const rolesSet = new Set<string>();

        if (user.role) {
            rolesSet.add(user.role);
        }
        if (Array.isArray(user.roles)) {
            user.roles.forEach((r) => {
                if (r) rolesSet.add(r);
            });
        }
        return Array.from(rolesSet);
    }

    return [];
};

/**
 * Checks if the user has a specific required role (case-insensitive).
 * Note: 'Administrador' also matches legacy 'ADMIN' / 'SUPER_ADMIN' if present.
 */
export const hasRole = (
    userOrRoles: AuthUser | string | string[] | null | undefined,
    requiredRole: string
): boolean => {
    if (!requiredRole) return true;

    const roles = extractUserRoles(userOrRoles).map((r) => r.toLowerCase());
    if (roles.length === 0) return false;

    const target = requiredRole.toLowerCase();

    if (target === 'administrador') {
        return (
            roles.includes('administrador') ||
            roles.includes('admin') ||
            roles.includes('super_admin')
        );
    }

    return roles.includes(target);
};

/**
 * Checks if the user has AT LEAST ONE of the required roles.
 */
export const hasSomeRole = (
    userOrRoles: AuthUser | string | string[] | null | undefined,
    requiredRoles?: string[]
): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.some((role) => hasRole(userOrRoles, role));
};

/**
 * Checks if the user has ALL of the required roles.
 */
export const hasEveryRole = (
    userOrRoles: AuthUser | string | string[] | null | undefined,
    requiredRoles?: string[]
): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.every((role) => hasRole(userOrRoles, role));
};

export const isAdmin = (user: AuthUser | null | undefined): boolean =>
    hasRole(user, 'Administrador');

export const isOperator = (user: AuthUser | null | undefined): boolean =>
    hasRole(user, 'Operador');

export const isClient = (user: AuthUser | null | undefined): boolean =>
    hasRole(user, 'Cliente');

/**
 * Backwards-compatible aliases that delegate to role checks or Administrador check.
 */
export const hasPermission = (
    userOrRoles: AuthUser | string[] | null | undefined,
    requiredRoleOrPerm: string
): boolean => {
    if (!requiredRoleOrPerm) return true;
    if (hasRole(userOrRoles, 'Administrador')) return true;
    return hasRole(userOrRoles, requiredRoleOrPerm);
};

export const hasSomePermission = (
    userOrRoles: AuthUser | string[] | null | undefined,
    requiredRolesOrPerms: string[]
): boolean => {
    if (!requiredRolesOrPerms || requiredRolesOrPerms.length === 0) return true;
    if (hasRole(userOrRoles, 'Administrador')) return true;
    return hasSomeRole(userOrRoles, requiredRolesOrPerms);
};

export const hasEveryPermission = (
    userOrRoles: AuthUser | string[] | null | undefined,
    requiredRolesOrPerms: string[]
): boolean => {
    if (!requiredRolesOrPerms || requiredRolesOrPerms.length === 0) return true;
    if (hasRole(userOrRoles, 'Administrador')) return true;
    return hasEveryRole(userOrRoles, requiredRolesOrPerms);
};
