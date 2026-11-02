import type { OtpProvider } from "../domain/otp.provider.js";
import type JwtProvider from "../domain/jwt.provider.js";
import type { UsersRepository } from "../../Users/domain/users.repository.js";
import type { AuditContext } from "@presentation/base.controller.js";
import AppError from "@shared/errors/AppError.js";

export interface VerifyOtpDTO {
    email: string;
    code: string;
    type?: 'PASSWORD_RESET' | 'OTP';
}

export interface VerifyOtpResponse {
    success: boolean;
    verified: boolean;
    resetToken: string;
    message: string;
}

export class VerifyOtpUseCase {
    constructor(
        private readonly otpProvider: OtpProvider,
        private readonly jwtProvider: JwtProvider,
        private readonly usersRepository: UsersRepository
    ) {}

    async execute(dto: VerifyOtpDTO, _context?: AuditContext): Promise<VerifyOtpResponse> {
        const email = dto.email.trim().toLowerCase();
        const code = dto.code.trim();
        const type = dto.type || "PASSWORD_RESET";

        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            throw new AppError("Usuario no encontrado", "USER_NOT_FOUND", 404);
        }

        if (!user.isActive) {
            throw new AppError("Esta cuenta se encuentra inactiva", "USER_INACTIVE", 403);
        }

        const verifyResult = await this.otpProvider.verifyOtp(email, code, type);
        if (!verifyResult.verified) {
            throw new AppError("Código OTP incorrecto", "INVALID_OTP", 400);
        }

        // Generate temporary single-use reset token bound to this user/email
        const resetToken = await this.jwtProvider.generateResetToken(user.id, email);

        return {
            success: true,
            verified: true,
            resetToken,
            message: "Identidad verificada exitosamente",
        };
    }
}
