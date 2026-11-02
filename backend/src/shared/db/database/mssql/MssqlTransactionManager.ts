import { sql, getPool } from "@infrastructure/config/mssql.config.js";
import type { TransactionManager } from "../TransactionManager.js";

export class MssqlTransactionManager implements TransactionManager {
    constructor(private readonly poolProvider: () => Promise<sql.ConnectionPool> = getPool) {}

    async run<T>(fn: (tx: sql.Transaction) => Promise<T>): Promise<T> {
        const pool = await this.poolProvider();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        try {
            const result = await fn(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Failed to rollback SQL Server transaction:", rollbackError);
            }
            throw error;
        }
    }
}
