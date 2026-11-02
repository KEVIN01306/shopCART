import type { Request, Response, NextFunction } from "express";
import JwtProvider from "@modules/Auth/domain/jwt.provider.js";
import AppError from "@shared/errors/AppError.js";

export class AuthMiddleware {
    private readonly jwtProvider: JwtProvider;

    constructor() {
        this.jwtProvider = new JwtProvider();
    }

    /**
     * Middleware principal para proteger rutas
     */
    public routeProtect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new AppError("Unauthorized: Token not provided", "UNAUTHORIZED", 401);
            }

            const token = authHeader.split(" ")[1];

            const payload = await this.jwtProvider.verifyToken(String(token));

            const role = (payload.role as string) || (Array.isArray(payload.roles) ? String(payload.roles[0]) : "Cliente");
            const roles = Array.isArray(payload.roles)
                ? (payload.roles as string[])
                : [role];

            res.locals.user = {
                id: payload.sub,
                role,
                roles,
            };

            (req as any).user = res.locals.user;

            next();
        } catch (error: any) {
            if (error.code === "ERR_JWT_EXPIRED") {
                next(new AppError("the token has expired", "TOKEN_EXPIRED", 401));
                return;
            }

            if (error instanceof AppError) {
                next(error);
            } else {
                next(new AppError("Invalid Token", "INVALID_TOKEN", 401));
            }
        }
    };

    /**
     * Middleware opcional: si hay token Bearer válido, adjunta el usuario; si no, continúa como invitado.
     */
    public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (authHeader && authHeader.startsWith("Bearer ")) {
                const token = authHeader.split(" ")[1];
                const payload = await this.jwtProvider.verifyToken(String(token));

                const role = (payload.role as string) || (Array.isArray(payload.roles) ? String(payload.roles[0]) : "Cliente");
                const roles = Array.isArray(payload.roles)
                    ? (payload.roles as string[])
                    : [role];

                res.locals.user = {
                    id: payload.sub,
                    role,
                    roles,
                };
                (req as any).user = res.locals.user;
            }
        } catch {
            // Ignorar errores de token en autenticación opcional (invitado)
        }
        next();
    };

    /**
     * Middleware para validar roles fijos del sistema:
     * 'Cliente' | 'Operador' | 'Administrador'
     */
    public checkRole = (allowedRoles: string | string[]) => {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = (req as any).user || res.locals.user;

            if (!user) {
                return next(new AppError("Not authorized to perform this action", "FORBIDDEN", 403));
            }

            const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            const userRoles: string[] = Array.isArray(user.roles)
                ? user.roles
                : user.role
                ? [user.role]
                : [];

            if (user.role === "Administrador" || userRoles.includes("Administrador")) {
                return next();
            }

            const hasAllowedRole =
                (user.role && allowed.includes(user.role)) ||
                userRoles.some((role: string) => allowed.includes(role));

            if (!hasAllowedRole) {
                return next(new AppError("Not authorized to perform this action", "FORBIDDEN", 403));
            }

            next();
        };
    };

    public checkRoles = this.checkRole;
}
