import 'dotenv/config';
import mysql from 'mysql2/promise';
import geoip from 'geoip-lite';

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true',
};

const HAS_DB_CONFIG = Boolean(
    DB_CONFIG.host && DB_CONFIG.database && DB_CONFIG.user && DB_CONFIG.password
);

if (!HAS_DB_CONFIG) {
    console.error('❌ DB_CONFIG incompleta. Configura las variables de entorno DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.');
    process.exit(1);
}

function geolocateIp(ipAddress) {
    if (!ipAddress || ipAddress === '0.0.0.0') {
        return { country: null, state: null };
    }

    if (ipAddress.startsWith('127.') || ipAddress === 'localhost') {
        return { country: null, state: null };
    }

    try {
        const geo = geoip.lookup(ipAddress);
        if (!geo) {
            return { country: null, state: null };
        }

        const country = geo.country || null;
        const state = geo.timezone ? geo.timezone.split('/')[1] || null : null;

        return { country, state };
    } catch (error) {
        return { country: null, state: null };
    }
}

async function backfillGeolocation() {
    let pool;

    try {
        pool = mysql.createPool({
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            database: DB_CONFIG.database,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            ssl: DB_CONFIG.ssl ? {} : undefined,
            waitForConnections: true,
            connectionLimit: 5,
        });

        console.log('📡 Conectando a base de datos...');
        const connection = await pool.getConnection();
        console.log('✅ Conectado a DB\n');

        // Obtener intentos sin geolocalización
        console.log('🔍 Buscando registros sin País/Estado...');
        const [rows] = await connection.query(
            `SELECT id, device_ip, country, state_region FROM call_attempts 
             WHERE country IS NULL OR state_region IS NULL
             ORDER BY created_at DESC`
        );

        console.log(`📊 Encontrados ${rows.length} registros sin datos de geolocalización\n`);

        if (rows.length === 0) {
            console.log('✨ No hay registros que actualizar. Todo está completo.');
            connection.release();
            await pool.end();
            process.exit(0);
        }

        let updated = 0;
        let errors = 0;

        // Procesar cada registro
        for (const row of rows) {
            const { id, device_ip } = row;
            const geo = geolocateIp(device_ip);

            try {
                await connection.query(
                    `UPDATE call_attempts SET country = ?, state_region = ? WHERE id = ?`,
                    [geo.country, geo.state, id]
                );
                updated++;
                console.log(
                    `✅ [${updated}/${rows.length}] ID:${id} IP:${device_ip} → ${geo.country}/${geo.state || 'N/A'}`
                );
            } catch (err) {
                errors++;
                console.error(
                    `❌ [${updated + errors}/${rows.length}] ID:${id} Error: ${err.message}`
                );
            }
        }

        console.log(`\n📈 Resumen:`);
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log(`   📊 Total: ${rows.length}`);

        connection.release();
        await pool.end();
        process.exit(updated > 0 ? 0 : 1);
    } catch (error) {
        console.error('❌ Error en script:', error.message);
        if (pool) {
            await pool.end();
        }
        process.exit(1);
    }
}

backfillGeolocation();
