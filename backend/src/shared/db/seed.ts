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

/**
 * Seed exclusivo para el usuario Administrador inicial del sistema ShopCart.
 * Cumple estrictamente con CONTEXT.md: invocación exclusiva de Stored Procedures
 * en Microsoft SQL Server (mssql) con parámetros fuertemente tipados.
 */
async function seedAdminUser(): Promise<void> {
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'kevin01306@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || '12345678';
    const adminFirstName = 'Administrador';
    const adminLastName = 'Sistema';
    const adminRole = 'Administrador';

    console.log('Iniciando seed de usuario Administrador en Microsoft SQL Server...');

    const pool = await getPool();
    const hashProvider = new Argon2HashProvider();

    try {
        const existingResult = await pool
            .request()
            .input('p_email', sql.VarChar(255), adminEmail)
            .execute<SeedUserRow>('SP_Usuarios_ObtenerPorEmail');

        const existingUser = existingResult.recordset?.[0];

        if (!existingUser) {
            const adminId = crypto.randomUUID();
            const passwordHash = await hashProvider.hash(adminPassword);

            const createdResult = await pool
                .request()
                .input('p_id', sql.VarChar(36), adminId)
                .input('p_email', sql.VarChar(255), adminEmail)
                .input('p_password_hash', sql.VarChar(255), passwordHash)
                .input('p_first_name', sql.VarChar(100), adminFirstName)
                .input('p_last_name', sql.VarChar(100), adminLastName)
                .input('p_avatar_url', sql.VarChar(500), null)
                .input('p_role', sql.VarChar(20), adminRole)
                .input('p_is_verify', sql.Bit, true)
                .execute<SeedUserRow>('SP_Usuarios_CrearUsuario');

            const createdUser = createdResult.recordset?.[0];
            console.log(
                `Usuario Administrador creado exitosamente: ${createdUser?.email ?? adminEmail} (Rol: ${createdUser?.role ?? adminRole})`
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
                .input('p_first_name', sql.VarChar(100), null)
                .input('p_last_name', sql.VarChar(100), null)
                .input('p_avatar_url', sql.VarChar(500), null)
                .input('p_role', sql.VarChar(20), adminRole)
                .execute<SeedUserRow>('SP_Usuarios_ActualizarUsuario');

            console.log(
                `Usuario Administrador verificado/actualizado exitosamente: ${existingUser.email} (Rol: ${adminRole})`
            );
        }
    } finally {
        await closePool();
    }
}

seedAdminUser().catch((error: unknown) => {
    console.error('Error al ejecutar el seed de usuario Administrador:', error);
    process.exitCode = 1;
});
