import 'dotenv/config';
import sql from 'mssql';

export const mssqlConfig: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'shop_cart_db',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === 'true' : true,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE
            ? process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            : true,
        enableArithAbort: true,
    },
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let poolInstance: sql.ConnectionPool | null = null;
let connectingPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Returns a singleton connected `sql.ConnectionPool` for Microsoft SQL Server.
 */
export async function getPool(): Promise<sql.ConnectionPool> {
    if (poolInstance && poolInstance.connected) {
        return poolInstance;
    }

    if (connectingPromise) {
        return connectingPromise;
    }

    connectingPromise = new sql.ConnectionPool(mssqlConfig)
        .connect()
        .then((pool) => {
            poolInstance = pool;
            connectingPromise = null;

            pool.on('error', (err) => {
                console.error('Unexpected SQL Server Pool error:', err);
                poolInstance = null;
            });

            return pool;
        })
        .catch((err) => {
            connectingPromise = null;
            poolInstance = null;
            throw err;
        });

    return connectingPromise;
}

/**
 * Gracefully closes the singleton connection pool if active.
 */
export async function closePool(): Promise<void> {
    if (poolInstance) {
        await poolInstance.close();
        poolInstance = null;
    }
}

export { sql };
export default { sql, getPool, closePool, mssqlConfig };
