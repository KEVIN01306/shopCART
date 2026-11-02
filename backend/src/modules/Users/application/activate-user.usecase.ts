import type { UsersRepository } from "../domain/users.repository.js";
import type { GetUser } from "../domain/user.entity.js";
import AppError from "@shared/errors/AppError.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import type { AuditContext } from "@presentation/base.controller.js";

export class ActivateUserUseCase {
    constructor(
        private readonly usersRepository: UsersRepository
    ) {}

    async execute(id: string, _context?: AuditContext): Promise<GetUser> {
        try {
            const user = await this.usersRepository.findById(id);
            if (!user) {
                throw new AppError("User not found", "USER_NOT_FOUND", 404);
            }

            if (user.isActive) {
                throw new AppError("User is already active", "USER_ALREADY_ACTIVE", 400);
            }

            const activatedUser = await this.usersRepository.activate(id);

            return activatedUser;
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) {
                throw new AppError("User not found", "USER_NOT_FOUND", 404);
            }
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError("Error activating user", "INTERNAL_SERVER_ERROR", 500);
        }
    }
}
