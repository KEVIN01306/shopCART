import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from '@infrastructure/config/mssql.config.js';
import { deployTriggers } from './deploy-tr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TABLES_IN_DROP_ORDER = [
    // Tablas actuales (PascalCase) y legado (snake_case) en orden inverso de llaves foráneas
    'OrderReturns',
    'order_returns',
    'OrderStatusHistory',
    'order_status_history',
    'OrderItems',
    'order_items',
    'CouponUsages',
    'coupon_usages',
    'Orders',
    'orders',
    'Coupons',
    'coupons',
    'StockReservations',
    'stock_reservations',
    'CartItems',
    'cart_items',
    'Carts',
    'carts',
    'KardexMovements',
    'kardex_movements',
    'ProductVariants',
    'product_variants',
    'ProductImages',
    'product_images',
    'Products',
    'products',
    'Categories',
    'categories',
    'Addresses',
    'addresses',
    'UserSessions',
    'user_sessions',
    'AuditLogs',
    'audit_logs',
    'Users',
    'users',
    'SystemSettings',
    'system_settings',
];

/**
 * Ejecuta el script de creación del esquema de base de datos (db.sql)
 * y despliega automáticamente los triggers de integridad (scripts/TR/)
 * en Microsoft SQL Server (shop_cart_db).
 */
export async function deployDatabaseSchema(shouldClosePool = true): Promise<void> {
    const dbFilePath = path.resolve(__dirname, 'scripts', 'db.sql');
    const rawSql = await fs.readFile(dbFilePath, 'utf-8');
    const pool = await getPool();

    try {
        console.log('Limpiando tablas previas (si existen) en orden inverso de dependencias...');
        const dropSql = TABLES_IN_DROP_ORDER.map(
            (tableName) => `DROP TABLE IF EXISTS [${tableName}];`
        ).join('\n');
        await pool.request().batch(dropSql);

        console.log(`Ejecutando script de esquema de base de datos desde ${dbFilePath}...`);

        const batches = rawSql
            .split(/\r?\nGO\r?\n?/i)
            .map((batch) => batch.trim())
            .filter((batch) => batch.length > 0);

        for (const batch of batches) {
            await pool.request().batch(batch);
        }

        console.log('✅ Esquema de base de datos (db.sql) ejecutado exitosamente en Microsoft SQL Server.');

        await deployTriggers(false);
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
