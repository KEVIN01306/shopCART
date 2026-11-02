import crypto from "node:crypto";
import AppError from "@shared/errors/AppError.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import type { HashProvider } from "@shared/domain/hash.provider.js";
import type { AuthRepository } from "../domain/auth.repository.js";
import type JwtProvider from "../domain/jwt.provider.js";
import type { AuditContext } from "@presentation/base.controller.js";
import type { AuthUser } from "../domain/auth-user.entity.js";

export interface RegisterDTO {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface RegisterResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        roles: string[];
        isVerify: boolean;
    };
}

export class RegisterUseCase {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly jwtProvider: JwtProvider,
        private readonly hashProvider: HashProvider
    ) {}

    async execute(data: RegisterDTO, _context?: AuditContext): Promise<RegisterResponse> {
        const { firstName, lastName, email, password } = data;

        const cleanEmail = email.trim().toLowerCase();
        const cleanFirstName = firstName.trim();
        const cleanLastName = lastName.trim();

        const passwordHash = await this.hashProvider.hash(password);
        const id = crypto.randomUUID();

        let user: AuthUser;
        try {
            user = await this.authRepository.createUser({
                id,
                email: cleanEmail,
                passwordHash,
                firstName: cleanFirstName,
                lastName: cleanLastName,
                avatarUrl: null,
                role: "Cliente",
                isVerify: true,
            });
        } catch (error: any) {
            const errNumber = error?.number ?? error?.originalError?.info?.number;
            const message = error?.message || "";
            if (
                error instanceof UniqueConstraintError ||
                errNumber === 2627 ||
                errNumber === 2601 ||
                errNumber === 50003 ||
                message.includes("DUPLICADO") ||
                message.includes("Unique constraint")
            ) {
                throw new AppError(
                    "El correo electrónico ya está registrado",
                    "EMAIL_ALREADY_EXISTS",
                    409
                );
            }
            throw error;
        }

        const { accessToken, refreshToken } = await this.jwtProvider.generateTokens(
            user.id,
            user.roles
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.authRepository.upsertSession(
            user.id,
            refreshToken,
            expiresAt
        );

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                role: user.role,
                roles: user.roles,
                isVerify: user.isVerify,
            },
        };
    }
}
