import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import AppError from '@shared/errors/AppError.js';

class JwtProvider {
    private readonly secret: Uint8Array;
    private readonly issuer: string;
    private readonly audience: string;

    constructor() {
        if (!process.env.JWT_SECRET || !process.env.JWT_ISS || !process.env.JWT_AUD) {
            throw new AppError('Missing critical JWT environment variables', "MISSING_ENV_VARS");
        }

        this.secret = new TextEncoder().encode(process.env.JWT_SECRET);
        this.issuer = process.env.JWT_ISS;
        this.audience = process.env.JWT_AUD;
    }

    async generateTokens(
        userId: string,
        roles: string[] | string
    ) {
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        const primaryRole = rolesArray[0] || 'Cliente';
        const payload: JWTPayload = {
            role: primaryRole,
            roles: rolesArray.length > 0 ? rolesArray : [primaryRole],
        };

        const accessToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer(this.issuer!)
            .setAudience(this.audience!)
            .setSubject(userId)
            .setExpirationTime(process.env.JWT_ACCESS_TTL || '15m')
            .sign(this.secret);

        const refreshToken = await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer(this.issuer!)
            .setAudience(this.audience!)
            .setSubject(userId)
            .setExpirationTime(process.env.JWT_REFRESH_TTL || '7d')
            .sign(this.secret);

        return { accessToken, refreshToken };
    }

    async verifyToken(token: string): Promise<JWTPayload> {
        const { payload } = await jwtVerify(token, this.secret, {
            issuer: this.issuer,
            audience: this.audience,
        });

        return payload;
    }

    private static readonly usedResetTokens = new Set<string>();

    async generateResetToken(userId: string, email: string): Promise<string> {
        const jti = crypto.randomUUID();
        const payload: JWTPayload = {
            purpose: 'PASSWORD_RESET',
            email,
            jti,
        };

        const resetToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer(this.issuer)
            .setAudience(this.audience)
            .setSubject(userId)
            .setExpirationTime('15m')
            .sign(this.secret);

        return resetToken;
    }

    async verifyResetToken(token: string): Promise<{ userId: string; email: string; jti: string }> {
        try {
            const { payload } = await jwtVerify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
            });

            if (payload.purpose !== 'PASSWORD_RESET') {
                throw new AppError('Token inválido para restablecimiento de contraseña', 'INVALID_TOKEN_PURPOSE', 400);
            }

            const jti = payload.jti as string;
            if (!jti || JwtProvider.usedResetTokens.has(jti)) {
                throw new AppError('Este enlace o token de recuperación ya ha sido utilizado', 'TOKEN_ALREADY_USED', 400);
            }

            const userId = payload.sub;
            const email = payload.email as string;

            if (!userId || !email) {
                throw new AppError('Token de recuperación corrupto o incompleto', 'MALFORMED_TOKEN', 400);
            }

            return { userId, email, jti };
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            if (error?.code === 'ERR_JWT_EXPIRED') {
                throw new AppError('El token de restablecimiento ha expirado. Por favor solicita un nuevo código.', 'TOKEN_EXPIRED', 400);
            }
            throw new AppError('Token de restablecimiento inválido o manipulado', 'INVALID_RESET_TOKEN', 400);
        }
    }

    consumeResetToken(jti: string): void {
        JwtProvider.usedResetTokens.add(jti);
        // Clear memory after 30 minutes to prevent memory leak
        setTimeout(() => {
            JwtProvider.usedResetTokens.delete(jti);
        }, 30 * 60 * 1000);
    }
}

export default JwtProvider;
