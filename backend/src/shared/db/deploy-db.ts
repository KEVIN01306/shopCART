import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from '@infrastructure/config/mssql.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ejecuta el script de creación del esquema de base de datos (db.sql)
 * en Microsoft SQL Server (shop_cart_db).
 */
export async function deployDatabaseSchema(shouldClosePool = true): Promise<void> {
    const dbFilePath = path.resolve(__dirname, 'scripts', 'db.sql');
    const rawSql = await fs.readFile(dbFilePath, 'utf-8');
    const pool = await getPool();

    try {
        console.log(`Ejecutando script de esquema de base de datos desde ${dbFilePath}...`);

        // Separar por bloques GO en caso de existir, o ejecutar el lote completo
        const batches = rawSql
            .split(/\r?\nGO\r?\n?/i)
            .map((batch) => batch.trim())
            .filter((batch) => batch.length > 0);

        for (const batch of batches) {
            await pool.request().batch(batch);
        }

        console.log('✅ Esquema de base de datos (db.sql) ejecutado exitosamente en Microsoft SQL Server.');
    } catch (error) {
        console.error('❌ Error al ejecutar el esquema de base de datos:', error);
        throw error;
    } finally {
        if (shouldClosePool) {
            await closePool();
        }
    }
}

const isDirectExecution =
    process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
    deployDatabaseSchema(true).catch((error: unknown) => {
        console.error('Error al ejecutar deployDatabaseSchema:', error);
        process.exitCode = 1;
    });
}
