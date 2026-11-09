import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from '@infrastructure/config/mssql.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Despliega los Triggers de integridad (TR_*) ubicados en scripts/TR/
 * en Microsoft SQL Server (shop_cart_db).
 */
export async function deployTriggers(shouldClosePool = true): Promise<void> {
    const trDirPath = path.resolve(__dirname, 'scripts', 'TR');
    const entries = await fs.readdir(trDirPath);
    const trFiles = entries.filter((f) => f.toLowerCase().endsWith('.sql')).sort();
    const pool = await getPool();

    try {
        for (const fileName of trFiles) {
            const trFilePath = path.resolve(trDirPath, fileName);
            const rawSql = await fs.readFile(trFilePath, 'utf-8');

            const batches = rawSql
                .split(/\r?\nGO\r?\n?/i)
                .map((batch) => batch.trim())
                .filter((batch) => batch.length > 0);

            console.log(`Desplegando ${batches.length} bloques de Triggers desde ${fileName}...`);

            for (const batch of batches) {
                await pool.request().batch(batch);
            }

            console.log(`✅ Trigger(s) de ${fileName} registrados exitosamente en shop_cart_db.`);
        }
    } finally {
        if (shouldClosePool) {
            await closePool();
        }
    }
}

const isDirectExecution =
    process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
    deployTriggers(true).catch((error: unknown) => {
        console.error('Error al desplegar los Triggers en SQL Server:', error);
        process.exitCode = 1;
    });
}
