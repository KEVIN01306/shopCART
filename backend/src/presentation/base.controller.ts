import type { Request, Response } from 'express';
import AppError from '@shared/errors/AppError.js';

export interface RequestContext {
    userId: string | null;
    ip?: string;
    userAgent?: string;
    method?: string;
    path?: string;
}

export type AuditContext = RequestContext;

abstract class BaseController {
    constructor() { }

    /**
     * Returns the context or environment of the current request.
     * Centralizes the security of business data.
     */
    protected obtenerEntorno(res: Response) {
        if (!res.locals.user) {
            throw new AppError(
                "Unable to determine the context of the request",
                "CONTEXT_NOT_FOUND",
                403
            );
        }

        return res.locals.user;
    }

    /**
     * Extracts audit context cleanly from Express Request & Response
     * without passing Express objects to Use Cases.
     */
    protected getAuditContext(req: Request, res?: Response): AuditContext {
        const user = res?.locals?.user || (req as any).user;
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0]?.trim() || undefined
            : req.socket?.remoteAddress || req.ip || undefined;

        const userAgent = req.headers['user-agent'] as string | undefined;

        return {
            userId: user?.id || null,
            ip,
            userAgent,
            method: req.method,
            path: req.originalUrl || req.path
        };
    }
}

export default BaseController;
