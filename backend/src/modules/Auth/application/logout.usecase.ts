import type { AuthRepository } from "../domain/auth.repository.js";
import type { AuditContext } from "@presentation/base.controller.js";

export class LogoutUseCase {
    constructor(
        private readonly authRepository: AuthRepository
    ) { }

    async execute(userId: string, _context?: AuditContext): Promise<void> {
        await this.authRepository.deleteSession(userId);
    }
}
