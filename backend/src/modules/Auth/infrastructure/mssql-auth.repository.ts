import crypto from "node:crypto";
import { getPool, sql } from "@infrastructure/config/mssql.config.js";
import { MssqlErrorMapper } from "@shared/db/database/mssql/MssqlErrorMapper.js";
import type { AuthRepository } from "../domain/auth.repository.js";
import type { AuthUser } from "../domain/auth-user.entity.js";
import type { AuthSession } from "../domain/auth-session.entity.js";
import { AuthMapper, type AuthUserDbRow, type AuthSessionDbRow } from "./mappers/auth.mapper.js";

export class MssqlAuthRepository implements AuthRepository {
    constructor(
        private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool
    ) {}

    async findByEmail(email: AuthUser["email"]): Promise<AuthUser | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_email", sql.VarChar(255), email)
                .execute<AuthUserDbRow>("SP_Auth_ObtenerUsuarioPorEmail");

            const row = result.recordset?.[0];
            if (!row) return null;

            return AuthMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findById(id: AuthUser["id"]): Promise<AuthUser | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), id)
                .execute<AuthUserDbRow>("SP_Auth_ObtenerUsuarioPorId");

            const row = result.recordset?.[0];
            if (!row) return null;

            return AuthMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async upsertSession(
        userId: AuthUser["id"],
        token: AuthSession["token"],
        expiresAt: Date
    ): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_id", sql.VarChar(36), crypto.randomUUID())
                .input("p_user_id", sql.VarChar(36), userId)
                .input("p_token", sql.VarChar(500), token)
                .input("p_expires_at", sql.DateTime2, expiresAt)
                .execute<AuthSessionDbRow>("SP_Auth_UpsertSesion");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findSessionByToken(token: AuthSession["token"]): Promise<AuthSession | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_token", sql.VarChar(500), token)
                .execute<AuthSessionDbRow>("SP_Auth_ObtenerSesionPorToken");

            const row = result.recordset?.[0];
            if (!row) return null;

            return AuthMapper.toSession(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async findSessionByUserId(userId: AuthUser["id"]): Promise<AuthSession | null> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_user_id", sql.VarChar(36), userId)
                .execute<AuthSessionDbRow>("SP_Auth_ObtenerSesionPorUsuario");

            const row = result.recordset?.[0];
            if (!row) return null;

            return AuthMapper.toSession(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async deleteSession(userId: AuthUser["id"]): Promise<void> {
        try {
            const pool = await this.poolProvider();
            await pool
                .request()
                .input("p_user_id", sql.VarChar(36), userId)
                .execute("SP_Auth_EliminarSesion");
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }

    async createUser(data: {
        id: string;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
        role: string;
        isVerify: boolean;
    }): Promise<AuthUser> {
        try {
            const pool = await this.poolProvider();
            const result = await pool
                .request()
                .input("p_id", sql.VarChar(36), data.id)
                .input("p_email", sql.VarChar(255), data.email)
                .input("p_password_hash", sql.VarChar(255), data.passwordHash)
                .input("p_first_name", sql.VarChar(100), data.firstName)
                .input("p_last_name", sql.VarChar(100), data.lastName)
                .input("p_avatar_url", sql.VarChar(500), data.avatarUrl ?? null)
                .input("p_role", sql.VarChar(20), data.role)
                .input("p_is_verify", sql.Bit, data.isVerify ? 1 : 0)
                .execute<AuthUserDbRow>("SP_Usuarios_CrearUsuario");

            const row = result.recordset?.[0];
            if (!row) {
                throw new Error("No se pudo registrar el usuario en base de datos");
            }

            return AuthMapper.toDomain(row);
        } catch (error) {
            throw MssqlErrorMapper.map(error);
        }
    }
}
