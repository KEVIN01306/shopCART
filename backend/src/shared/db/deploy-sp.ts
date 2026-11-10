import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from '@infrastructure/config/mssql.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Despliega los Stored Procedures oficiales (SP_Auth_*, SP_Usuarios_*, SP_Categorias_*,
 * SP_Productos_*, SP_Carritos_*, SP_Inventario_*, SP_Configuracion_*)
 * en Microsoft SQL Server (shop_cart_db).
 */
export async function deployStoredProcedures(shouldClosePool = true): Promise<void> {
    const spFiles = [
        'SP_Auth_Users.sql',
        'SP_Products_Categories.sql',
        'SP_Carts.sql',
        'SP_Coupons.sql',
        'SP_Orders_Addresses.sql',
        'SP_Reports_AuditLogs.sql',
        'SP_Modulo_Proceso.sql',
    ];
    const pool = await getPool();

    try {
        for (const fileName of spFiles) {
            const spFilePath = path.resolve(__dirname, 'scripts', 'SP', fileName);
            const rawSql = await fs.readFile(spFilePath, 'utf-8');

            const batches = rawSql
                .split(/\r?\nGO\r?\n?/i)
                .map((batch) => batch.trim())
                .filter((batch) => batch.length > 0);

            console.log(`Desplegando ${batches.length} bloques de Stored Procedures desde ${fileName}...`);

            for (const batch of batches) {
                await pool.request().batch(batch);
            }

            console.log(`Los ${batches.length} Stored Procedures de ${fileName} fueron registrados exitosamente en shop_cart_db.`);
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
    deployStoredProcedures(true).catch((error: unknown) => {
        console.error('Error al desplegar los Stored Procedures en SQL Server:', error);
        process.exitCode = 1;
    });
}
