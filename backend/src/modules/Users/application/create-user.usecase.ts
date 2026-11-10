import type { UsersRepository } from "../domain/users.repository.js";
import type { GetUser } from "../domain/user.entity.js";
import AppError from "@shared/errors/AppError.js";
import type { HashProvider } from "@shared/domain/hash.provider.js";
import type { EmailProvider } from "@shared/domain/email.provider.js";
import { UniqueConstraintError } from "@shared/db/database/errors/UniqueConstraintError.js";
import type { AuditContext } from "@presentation/base.controller.js";
import { isValidUserEmailDomain } from "../presentation/users.schemas.js";
import { generateSecurePassword } from "@shared/utils/password-generator.util.js";

export interface CreateUserRequest {
    email: string;
    passwordRaw?: string;
    autoGeneratePassword?: boolean;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role?: string;
    roles?: string[];
}

export class CreateUserUseCase {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly hashProvider: HashProvider,
        private readonly emailProvider: EmailProvider
    ) {}

    async execute(data: CreateUserRequest, _context?: AuditContext): Promise<GetUser> {
        try {
            if (!isValidUserEmailDomain(data.email)) {
                throw new AppError(
                    "Formato de correo electrónico inválido.",
                    "INVALID_EMAIL_FORMAT",
                    400
                );
            }

            const existingUser = await this.usersRepository.findByEmail(data.email);
            if (existingUser) {
                throw new AppError("Email already in use", "EMAIL_ALREADY_EXISTS", 400);
            }

            // Determine or generate secure password
            let rawPassword = data.passwordRaw?.trim();
            if (data.autoGeneratePassword || !rawPassword) {
                rawPassword = generateSecurePassword(12);
            }

            if (rawPassword.length < 8) {
                throw new AppError("Password must be at least 8 characters long", "INVALID_PASSWORD_LENGTH", 400);
            }

            const passwordHash = await this.hashProvider.hash(rawPassword);

            const role = data.role || data.roles?.[0] || "Cliente";
            const roles = data.roles && data.roles.length > 0 ? data.roles : [role];

            // Como el servicio OTP está temporalmente deshabilitado, los usuarios
            // creados por el Administrador nacen verificados (isVerify = true) para poder ingresar de inmediato
            const user = await this.usersRepository.create({
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                avatarUrl: data.avatarUrl ?? null,
                role,
                roles,
                isVerify: true,
            });

            // Send credentials email via OTP / Email microservice
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            const emailResult = await this.emailProvider.sendWelcomeCredentialsEmail(
                user.email,
                fullName,
                rawPassword,
                "shopCART"
            );

            return {
                ...user,
                isVerify: true,
                emailSent: emailResult.success,
                generatedPassword: data.autoGeneratePassword ? rawPassword : undefined,
            };
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new AppError("Email already in use", "EMAIL_ALREADY_EXISTS", 400);
            }
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError("Error creating user", "INTERNAL_SERVER_ERROR", 500);
        }
    }
}
