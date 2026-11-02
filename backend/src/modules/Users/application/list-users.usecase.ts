import type { UsersRepository } from "../domain/users.repository.js";
import type { GetSimpleUser } from "../domain/user.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface ListUsersParams {
    page?: number;
    limit?: number;
    q?: string;
}

export interface ListUsersResult {
    data: GetSimpleUser[];
    total: number;
}

export class ListUsersUseCase {
    constructor(private readonly usersRepository: UsersRepository) { }

    async execute(params?: ListUsersParams): Promise<ListUsersResult> {
        try {
            const page = params?.page && params.page > 0 ? Number(params.page) : 1;
            const limit = params?.limit && params.limit > 0 ? Number(params.limit) : 10;
            return await this.usersRepository.findAllPaginated(page, limit, { q: params?.q });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError("Error fetching users", "INTERNAL_SERVER_ERROR", 500);
        }
    }
}
