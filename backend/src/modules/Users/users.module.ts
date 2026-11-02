import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlUsersRepository } from "./infrastructure/mssql-users.repository.js";
import { Argon2HashProvider } from "../../shared/infrastructure/argon2-hash.provider.js";
import { CreateUserUseCase } from "./application/create-user.usecase.js";
import { UpdateUserUseCase } from "./application/update-user.usecase.js";
import { ListUsersUseCase } from "./application/list-users.usecase.js";
import { ActivateUserUseCase } from "./application/activate-user.usecase.js";
import { DisableUserUseCase } from "./application/disable-user.usecase.js";
import { DeleteUserUseCase } from "./application/delete-user.usecase.js";
import { ChangePasswordUseCase } from "./application/change-password.usecase.js";
import { ListRolesUseCase } from "./application/list-roles.usecase.js";
import { UsersController } from "./presentation/users.controller.js";
import { HttpEmailProvider } from "../../shared/infrastructure/http-email.provider.js";

export const usersRepository = new MssqlUsersRepository(getPool);
export const hashProvider = new Argon2HashProvider();
export const emailProvider = new HttpEmailProvider();

export const createUserUseCase = new CreateUserUseCase(usersRepository, hashProvider, emailProvider);
export const updateUserUseCase = new UpdateUserUseCase(usersRepository);
export const listUsersUseCase = new ListUsersUseCase(usersRepository);
export const listRolesUseCase = new ListRolesUseCase(usersRepository);
export const activateUserUseCase = new ActivateUserUseCase(usersRepository);
export const disableUserUseCase = new DisableUserUseCase(usersRepository);
export const deleteUserUseCase = new DeleteUserUseCase(usersRepository);
export const changePasswordUseCase = new ChangePasswordUseCase(usersRepository, hashProvider);

export const usersController = new UsersController(
    createUserUseCase,
    updateUserUseCase,
    listUsersUseCase,
    listRolesUseCase,
    activateUserUseCase,
    disableUserUseCase,
    deleteUserUseCase,
    changePasswordUseCase,
    hashProvider
);
