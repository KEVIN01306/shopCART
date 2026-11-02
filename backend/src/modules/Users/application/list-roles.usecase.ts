import type { UsersRepository } from "../domain/users.repository.js";

export interface RoleResponse {
    id: string;
    name: string;
    description: string | null;
}

export class ListRolesUseCase {
    constructor(private readonly usersRepository: UsersRepository) { }

    async execute(): Promise<RoleResponse[]> {
        return this.usersRepository.findAllRoles();
    }
}
