import crypto from "node:crypto";
import { getPool, sql } from "@infrastructure/config/mssql.config.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import { NotFoundPersistenceError } from "@shared/db/database/errors/NotFoundPersistenceError.js";
import type { UsersRepository } from "../domain/users.repository.js";
import type { User, CreateUser, UpdateUser, GetUser, GetSimpleUser } from "../domain/user.entity.js";
import { UsersMapper, type UserDbRow } from "./mappers/users.mapper.js";

const VALID_ROLES = new Set(["Cliente", "Operador", "Administrador"]);

function normalizeRole(role?: string, roles?: string[]): string {
    const candidate = role || (roles && roles.length > 0 ? roles[0] : undefined);
    if (candidate && VALID_ROLES.has(candidate)) {
        return candidate;
    }
    return "Cliente";
}

export class MssqlUsersRepository implements UsersRepository {
    constructor(
        private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool
    ) {}

    async create(data: CreateUser): Promise<GetUser> {
        try {
            const pool = await this.poolProvider();
            const role = normalizeRole(data.role, data.roles);
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), crypto.randomUUID())
                .input("p_email", sql.VarChar(255), data.email)
                .input("p_password_hash", sql.VarChar(255), data.passwordHash)
                .input("p_first_name", sql.VarChar(100), data.firstName)
                .input("p_last_name", sql.VarChar(100), data.lastName)
                .input("p_avatar_url", sql.VarChar(500), data.avatarUrl ?? null)
                .input("p_role", sql.VarChar(20), role)
                .input("p_is_verify", sql.Bit, data.isVerify ? 1 : 0)
                .execute<UserDbRow>("SP_Usuarios_CrearUsuario");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return UsersMapper.toGetUser(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async update(id: string, data: UpdateUser): Promise<GetUser> {
        try {
            const pool = await this.poolProvider();
            const roleParam =
                data.role !== undefined || (data.roles && data.roles.length > 0)
                    ? normalizeRole(data.role, data.roles)
                    : null;

            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_email", sql.VarChar(255), data.email ?? null)
                .input("p_password_hash", sql.VarChar(255), data.passwordHash ?? null)
                .input("p_first_name", sql.VarChar(100), data.firstName ?? null)
                .input("p_last_name", sql.VarChar(100), data.lastName ?? null)
                .input("p_avatar_url", sql.VarChar(500), data.avatarUrl ?? null)
                .input("p_role", sql.VarChar(20), roleParam)
                .execute<UserDbRow>("SP_Usuarios_ActualizarUsuario");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return UsersMapper.toGetUser(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async findById(id: string): Promise<GetUser | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .execute<UserDbRow>("SP_Usuarios_ObtenerPorId");

            const row = result.recordset?.[0];
            return row ? UsersMapper.toGetUser(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findByIdWithPassword(id: string): Promise<User | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .execute<UserDbRow>("SP_Usuarios_ObtenerPorId");

            const row = result.recordset?.[0];
            return row ? UsersMapper.toDomain(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_email", sql.VarChar(255), email)
                .execute<UserDbRow>("SP_Usuarios_ObtenerPorEmail");

            const row = result.recordset?.[0];
            return row ? UsersMapper.toDomain(row) : null;
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findAll(): Promise<GetSimpleUser[]> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_page", sql.Int, 1)
                .input("p_limit", sql.Int, 1000)
                .input("p_q", sql.NVarChar(100), null)
                .execute<UserDbRow>("SP_Usuarios_ListarPaginado");

            const rows = result.recordset ?? [];
            return rows.map((row) => UsersMapper.toGetSimpleUser(row));
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findAllPaginated(
        page: number = 1,
        limit: number = 10,
        filters?: { q?: string }
    ): Promise<{ data: GetSimpleUser[]; total: number }> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_page", sql.Int, page)
                .input("p_limit", sql.Int, limit)
                .input("p_q", sql.NVarChar(100), filters?.q?.trim() || null)
                .execute<UserDbRow>("SP_Usuarios_ListarPaginado");

            const rows = result.recordset ?? [];
            const recordsets = result.recordsets as unknown as [UserDbRow[], { total?: number }[]] | undefined;
            const secondSetTotal = recordsets?.[1]?.[0]?.total;
            const windowTotal = rows[0]?.total_count;
            const total =
                secondSetTotal !== undefined
                    ? Number(secondSetTotal)
                    : windowTotal !== undefined
                    ? Number(windowTotal)
                    : rows.length;

            return {
                data: rows.map((row) => UsersMapper.toGetSimpleUser(row)),
                total,
            };
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findAllRoles(): Promise<{ id: string; name: string; description: string | null }[]> {
        return [
            {
                id: "Administrador",
                name: "Administrador",
                description: "Acceso total al sistema",
            },
            {
                id: "Operador",
                name: "Operador",
                description: "Administración de inventario y despacho de pedidos",
            },
            {
                id: "Cliente",
                name: "Cliente",
                description: "Cliente de la tienda",
            },
        ];
    }

    async activate(id: string): Promise<GetUser> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_is_active", sql.Bit, 1)
                .execute<UserDbRow>("SP_Usuarios_CambiarEstadoActivo");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return UsersMapper.toGetUser(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async disable(id: string): Promise<GetUser> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_is_active", sql.Bit, 0)
                .execute<UserDbRow>("SP_Usuarios_CambiarEstadoActivo");

            const row = result.recordset?.[0];
            if (!row) {
                throw new NotFoundPersistenceError();
            }
            return UsersMapper.toGetUser(row);
        } catch (error) {
            if (error instanceof NotFoundPersistenceError) throw error;
            throw MssqlErrorMapper.map(error);
        }
    }

    async softDelete(id: string): Promise<GetUser> {
        return this.disable(id);
    }

    async updatePassword(id: string, passwordHash: string): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_password_hash", sql.VarChar(255), passwordHash)
                .execute("SP_Usuarios_ActualizarPassword");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async updateVerification(id: string, isVerify: boolean): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .input("p_is_verify", sql.Bit, isVerify ? 1 : 0)
                .execute("SP_Usuarios_ActualizarVerificacion");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}
