import type JwtProvider from "../domain/jwt.provider.js";
import type { UsersRepository } from "../../Users/domain/users.repository.js";
import type { AuthRepository } from "../domain/auth.repository.js";
import type { HashProvider } from "@shared/domain/hash.provider.js";
import type { AuditContext } from "@presentation/base.controller.js";
import AppError from "@shared/errors/AppError.js";

export interface ResetPasswordWithOtpDTO {
    resetToken: string;
    currentPassword?: string;
    newPassword: string;
    confirmPassword?: string;
}

export class ResetPasswordWithOtpUseCase {
    constructor(
        private readonly jwtProvider: JwtProvider,
        private readonly usersRepository: UsersRepository,
        private readonly authRepository: AuthRepository,
        private readonly hashProvider: HashProvider
    ) {}

    async execute(dto: ResetPasswordWithOtpDTO, _context?: AuditContext): Promise<void> {
        // 1. Verify reset token validity and single-use status
        const { userId, jti } = await this.jwtProvider.verifyResetToken(dto.resetToken);

        // 2. Fetch user with password
        const user = await this.usersRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new AppError("Usuario no encontrado", "USER_NOT_FOUND", 404);
        }

        if (!user.isActive) {
            throw new AppError("Esta cuenta se encuentra inactiva", "USER_INACTIVE", 403);
        }

        // 3. If current password is provided, validate it
        if (dto.currentPassword) {
            if (!user.passwordHash) {
                throw new AppError("El usuario no tiene una contraseña configurada", "NO_PASSWORD", 400);
            }
            const isCurrentValid = await this.hashProvider.compare(dto.currentPassword, user.passwordHash);
            if (!isCurrentValid) {
                throw new AppError("La contraseña actual es incorrecta", "INVALID_CURRENT_PASSWORD", 400);
            }
        }

        // 4. Validate new password
        if (dto.newPassword.length < 8) {
            throw new AppError("La nueva contraseña debe tener al menos 8 caracteres", "INVALID_PASSWORD_LENGTH", 400);
        }

        if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
            throw new AppError("Las contraseñas no coinciden", "PASSWORDS_DO_NOT_MATCH", 400);
        }

        // Check that new password is not identical to current password
        if (user.passwordHash) {
            const isSameAsCurrent = await this.hashProvider.compare(dto.newPassword, user.passwordHash);
            if (isSameAsCurrent) {
                throw new AppError("La nueva contraseña no puede ser igual a la contraseña actual", "SAME_PASSWORD", 400);
            }
        }

        // 5. Hash new password with Argon2
        const newPasswordHash = await this.hashProvider.hash(dto.newPassword);

        // 6. Update user's password in database
        await this.usersRepository.updatePassword(userId, newPasswordHash);

        // 7. Activate / verify user account
        await this.usersRepository.updateVerification(userId, true);

        // 8. Invalidate sessions to enforce re-login
        await this.authRepository.deleteSession(userId);

        // 9. Consume single-use reset token
        this.jwtProvider.consumeResetToken(jti);
    }
}
