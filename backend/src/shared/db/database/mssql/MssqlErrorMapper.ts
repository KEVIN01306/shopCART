import { DatabaseError } from "../errors/DatabaseError.js";
import { InsufficientStockPersistenceError } from "../errors/InsufficientStockPersistenceError.js";
import { NotFoundPersistenceError } from "../errors/NotFoundPersistenceError.js";
import { PersistenceError } from "../errors/PersistenceError.js";
import { UniqueConstraintError } from "../errors/UniqueConstraintError.js";
import AppError from "../../../errors/AppError.js";

interface SqlErrorLike {
    number?: number;
    code?: string;
    message?: string;
    originalError?: {
        info?: {
            number?: number;
            message?: string;
        };
    };
}

export class MssqlErrorMapper {
    static map(error: unknown): PersistenceError | AppError | Error {
        console.error("MssqlErrorMapper caught error:", error);

        if (error instanceof AppError || error instanceof PersistenceError) {
            return error;
        }

        const sqlErr = error as SqlErrorLike | undefined;
        const errNumber = sqlErr?.number ?? sqlErr?.originalError?.info?.number;
        const errCode = sqlErr?.code;
        const message =
            (error instanceof Error ? error.message : sqlErr?.message) ||
            sqlErr?.originalError?.info?.message ||
            "Database error";

        // Connection / initialization failures
        if (
            errCode === "ESOCKET" ||
            errCode === "ELOGIN" ||
            errCode === "ETIMEOUT" ||
            errCode === "ECONNREFUSED" ||
            errCode === "ENOTOPEN"
        ) {
            return new DatabaseError("DATABASE_UNAVAILABLE");
        }

        // SQL Server Unique Constraint / Primary Key Violation (2627, 2601, 50003)
        if (
            errNumber === 2627 ||
            errNumber === 2601 ||
            errNumber === 50003 ||
            message.includes("DUPLICADO")
        ) {
            return new UniqueConstraintError();
        }

        // Custom THROW codes or messages from Stored Procedures
        if (
            errNumber === 50001 ||
            message.includes("NO_ENCONTRADO") ||
            message.includes("NOT_FOUND")
        ) {
            return new NotFoundPersistenceError();
        }

        if (
            errNumber === 50002 ||
            message.includes("STOCK_INSUFICIENTE") ||
            message.includes("INSUFFICIENT_STOCK")
        ) {
            return new InsufficientStockPersistenceError(message);
        }

        return new DatabaseError(message);
    }
}
