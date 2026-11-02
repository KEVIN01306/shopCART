import type { OtpProvider, SendOtpResult } from "../domain/otp.provider.js";
import type { UsersRepository } from "../../Users/domain/users.repository.js";
import type { AuditContext } from "@presentation/base.controller.js";
import AppError from "@shared/errors/AppError.js";

export interface SendOtpDTO {
    email: string;
    type?: 'PASSWORD_RESET' | 'OTP';
}

export class SendOtpUseCase {
    constructor(
        private readonly otpProvider: OtpProvider,
        private readonly usersRepository: UsersRepository
    ) {}

    async execute(dto: SendOtpDTO, _context?: AuditContext): Promise<SendOtpResult> {
        const email = dto.email.trim().toLowerCase();

        // Check if user exists and is active
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            throw new AppError("No existe ninguna cuenta asociada a este correo electrónico", "USER_NOT_FOUND", 404);
        }

        if (!user.isActive) {
            throw new AppError("Esta cuenta se encuentra inactiva o deshabilitada", "USER_INACTIVE", 403);
        }

        const type = dto.type || "PASSWORD_RESET";
        const result = await this.otpProvider.sendOtp(email, type);

        return result;
    }
}
