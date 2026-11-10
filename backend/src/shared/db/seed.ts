import 'dotenv/config';
import crypto from 'node:crypto';
import { getPool, closePool, sql } from '@infrastructure/config/mssql.config.js';
import { Argon2HashProvider } from '@shared/infrastructure/argon2-hash.provider.js';

interface SeedUserRow {
    id: string;
    email: string;
    role: string;
    is_active: boolean | number;
    is_verify: boolean | number;
}

interface SeedAccountDefinition {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'Administrador' | 'Operador' | 'Cliente';
}

const INITIAL_SYSTEM_SETTINGS: Array<{
    keyName: string;
    keyValue: string;
    description: string;
}> = [
    {
        keyName: 'CURRENCY_CODE',
        keyValue: 'GTQ',
        description: 'Moneda oficial del sistema ShopCart (Quetzales)',
    },
    {
        keyName: 'RESERVATION_EXP_MINUTES',
        keyValue: '15',
        description: 'Minutos de vigencia de reserva temporal de inventario en checkout',
    },
    {
        keyName: 'STORE_NAME',
        keyValue: 'shopCART',
        description: 'Nombre comercial de la tienda',
    },
];

/**
 * Seed oficial para los parámetros base (SystemSettings) y las 3 cuentas de demostración
 * por rol (Administrador, Operador, Cliente) del sistema ShopCart.
 * Cumple estrictamente con CONTEXT.md: invocación exclusiva de Stored Procedures
 * en Microsoft SQL Server (mssql) con parámetros fuertemente tipados.
 */
async function seedSystemAndRoles(): Promise<void> {
    const demoAccounts: SeedAccountDefinition[] = [
        {
            email: process.env.SEED_ADMIN_EMAIL || 'kevin01306@gmail.com',
            password: process.env.SEED_ADMIN_PASSWORD || '12345678',
            firstName: 'Administrador',
            lastName: 'Sistema',
            role: 'Administrador',
        },
        {
            email: process.env.SEED_OPERATOR_EMAIL || 'operador@shopcart.com',
            password: process.env.SEED_OPERATOR_PASSWORD || '12345678',
            firstName: 'Carlos',
            lastName: 'Operador Logístico',
            role: 'Operador',
        },
        {
            email: process.env.SEED_CLIENT_EMAIL || 'cliente@shopcart.com',
            password: process.env.SEED_CLIENT_PASSWORD || '12345678',
            firstName: 'María',
            lastName: 'Cliente Demo',
            role: 'Cliente',
        },
    ];

    console.log(
        'Iniciando seed de configuración base (SystemSettings) y los 3 roles de prueba (Administrador, Operador, Cliente) en Microsoft SQL Server...'
    );

    const pool = await getPool();
    const hashProvider = new Argon2HashProvider();

    try {
        for (const setting of INITIAL_SYSTEM_SETTINGS) {
            await pool
                .request()
                .input('p_key_name', sql.VarChar(50), setting.keyName)
                .input('p_key_value', sql.VarChar(255), setting.keyValue)
                .input('p_description', sql.VarChar(255), setting.description)
                .execute('SP_Configuracion_UpsertParametro');
        }
        console.log(
            `Parámetros iniciales de SystemSettings registrados exitosamente (${INITIAL_SYSTEM_SETTINGS.map((s) => `${s.keyName}=${s.keyValue}`).join(', ')}).`
        );

        for (const account of demoAccounts) {
            const existingResult = await pool
                .request()
                .input('p_email', sql.VarChar(255), account.email)
                .execute<SeedUserRow>('SP_Usuarios_ObtenerPorEmail');

            const existingUser = existingResult.recordset?.[0];

            if (!existingUser) {
                const userId = crypto.randomUUID();
                const passwordHash = await hashProvider.hash(account.password);

                const createdResult = await pool
                    .request()
                    .input('p_id', sql.VarChar(36), userId)
                    .input('p_email', sql.VarChar(255), account.email)
                    .input('p_password_hash', sql.VarChar(255), passwordHash)
                    .input('p_first_name', sql.VarChar(100), account.firstName)
                    .input('p_last_name', sql.VarChar(100), account.lastName)
                    .input('p_avatar_url', sql.VarChar(500), null)
                    .input('p_role', sql.VarChar(20), account.role)
                    .input('p_is_verify', sql.Bit, true)
                    .execute<SeedUserRow>('SP_Usuarios_CrearUsuario');

                const createdUser = createdResult.recordset?.[0];
                console.log(
                    `Usuario [${account.role}] creado exitosamente: ${createdUser?.email ?? account.email}`
                );
            } else {
                await pool
                    .request()
                    .input('p_id', sql.VarChar(36), existingUser.id)
                    .input('p_is_active', sql.Bit, true)
                    .execute<SeedUserRow>('SP_Usuarios_CambiarEstadoActivo');

                await pool
                    .request()
                    .input('p_id', sql.VarChar(36), existingUser.id)
                    .input('p_is_verify', sql.Bit, true)
                    .execute('SP_Usuarios_ActualizarVerificacion');

                await pool
                    .request()
                    .input('p_id', sql.VarChar(36), existingUser.id)
                    .input('p_email', sql.VarChar(255), null)
                    .input('p_password_hash', sql.VarChar(255), null)
                    .input('p_first_name', sql.VarChar(100), account.firstName)
                    .input('p_last_name', sql.VarChar(100), account.lastName)
                    .input('p_avatar_url', sql.VarChar(500), null)
                    .input('p_role', sql.VarChar(20), account.role)
                    .execute<SeedUserRow>('SP_Usuarios_ActualizarUsuario');

                console.log(
                    `Usuario [${account.role}] verificado/actualizado exitosamente: ${existingUser.email}`
                );
            }
        }
    } finally {
        await closePool();
    }
}

seedSystemAndRoles().catch((error: unknown) => {
    console.error('Error al ejecutar el seed de configuración y roles:', error);
    process.exitCode = 1;
});
