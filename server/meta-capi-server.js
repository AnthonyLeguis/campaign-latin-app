import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const port = process.env.PORT || process.env.META_CAPI_PORT || 8787;

app.use(cors());
app.use(express.json());

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_CODE; // opcional para ambiente de pruebas
const DEFAULT_CURRENCY = process.env.META_DEFAULT_CURRENCY || 'USD';
const DEFAULT_LEAD_VALUE = process.env.META_DEFAULT_LEAD_VALUE;
const DB_HEALTH_TOKEN = process.env.DB_HEALTH_TOKEN;

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

let dbPool;

function getDbPool() {
    if (!HAS_DB_CONFIG) {
        return null;
    }

    if (!dbPool) {
        dbPool = mysql.createPool({
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            database: DB_CONFIG.database,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            ssl: DB_CONFIG.ssl ? {} : undefined,
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 10,
            idleTimeout: 60000,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        });
    }

    return dbPool;
}

function hasValidHealthToken(req) {
    if (!DB_HEALTH_TOKEN) {
        return false;
    }

    const received = req.get('x-health-token');
    return typeof received === 'string' && received === DB_HEALTH_TOKEN;
}

async function runDbReadCheck() {
    const pool = getDbPool();
    if (!pool) {
        return {
            ok: false,
            error: 'DB variables incompletas',
            details: 'Configura DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD.',
            code: 503,
        };
    }

    try {
        const [rows] = await pool.query(
            'SELECT 1 AS ok, DATABASE() AS db_name, UTC_TIMESTAMP() AS utc_now'
        );
        return {
            ok: true,
            code: 200,
            data: Array.isArray(rows) ? rows[0] : rows,
        };
    } catch (error) {
        return {
            ok: false,
            code: 502,
            error: error?.code || 'DB_READ_ERROR',
            details: error?.message || 'No se pudo consultar la base de datos.',
        };
    }
}

async function runDbWriteCheck() {
    const pool = getDbPool();
    if (!pool) {
        return {
            ok: false,
            error: 'DB variables incompletas',
            details: 'Configura DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD.',
            code: 503,
        };
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [insertResult] = await conn.query(
            `INSERT INTO call_attempts
                (domain_attacked, device_ip, country, state_region, call_diverted, reason_code, user_agent)
             VALUES
                (?, ?, ?, ?, ?, ?, ?)`,
            [
                'db-check.local',
                '127.0.0.1',
                'TEST',
                'TEST',
                0,
                'HEALTH_WRITE_TEST',
                'meta-capi-health-check',
            ]
        );

        const insertedId = insertResult?.insertId;
        const [rows] = await conn.query(
            'SELECT id, domain_attacked, call_diverted, created_at FROM call_attempts WHERE id = ? LIMIT 1',
            [insertedId]
        );

        await conn.commit();

        return {
            ok: true,
            code: 200,
            data: Array.isArray(rows) ? rows[0] : rows,
        };
    } catch (error) {
        await conn.rollback();
        return {
            ok: false,
            code: 502,
            error: error?.code || 'DB_WRITE_ERROR',
            details: error?.message || 'No se pudo insertar/leer en la base de datos.',
        };
    } finally {
        conn.release();
    }
}

if (!PIXEL_ID) {
    console.warn('[meta-capi-server] META_PIXEL_ID no está definido. Configúralo en tu entorno.');
}
if (!ACCESS_TOKEN) {
    console.warn('[meta-capi-server] META_CAPI_TOKEN no está definido. Configúralo en tu entorno.');
}
if (!HAS_DB_CONFIG) {
    console.warn('[meta-capi-server] Variables DB incompletas. Health checks de DB devolverán error hasta configurar DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
}
if (!DB_HEALTH_TOKEN) {
    console.warn('[meta-capi-server] DB_HEALTH_TOKEN no está definido. Los endpoints de diagnóstico DB quedarán protegidos y no responderán hasta configurarlo.');
}

app.post('/meta-capi/event', async (req, res) => {
    console.log(`[meta-capi-server] 📥 Evento recibido: ${req.body?.event_name || 'PageView'}`);

    try {
        if (!PIXEL_ID || !ACCESS_TOKEN) {
            return res.status(500).json({
                error: 'Meta CAPI no configurado',
                details: 'Define META_PIXEL_ID y META_CAPI_TOKEN en las variables de entorno.'
            });
        }

        const {
            event_name = 'PageView',
            event_id,
            event_time,
            custom_data,
            action_source = 'website'
        } = req.body || {};

        let finalCustomData = (custom_data && typeof custom_data === 'object') ? { ...custom_data } : undefined;

        // Meta recomienda enviar value + currency (divisa) en eventos con valor.
        // En particular, es común que 'Lead' se configure sin estos campos (y Meta lo marca como warning).
        if (event_name === 'Lead') {
            const parsed = DEFAULT_LEAD_VALUE != null && DEFAULT_LEAD_VALUE !== '' ? Number(DEFAULT_LEAD_VALUE) : 0;
            const safeValue = Number.isFinite(parsed) ? parsed : 0;

            if (!finalCustomData) {
                finalCustomData = { value: safeValue, currency: DEFAULT_CURRENCY };
            } else {
                if (finalCustomData.value == null) finalCustomData.value = safeValue;
                if (finalCustomData.currency == null) finalCustomData.currency = DEFAULT_CURRENCY;
            }
        }

        const clientIpHeader = req.headers['x-forwarded-for'];
        const client_ip_address = Array.isArray(clientIpHeader)
            ? clientIpHeader[0]
            : (clientIpHeader?.split(',')[0]?.trim() || req.ip);
        const client_user_agent = req.get('user-agent');

        const payload = {
            data: [
                {
                    event_name,
                    event_time: event_time || Math.floor(Date.now() / 1000),
                    event_id,
                    action_source,
                    custom_data: finalCustomData,
                    user_data: {
                        client_ip_address,
                        client_user_agent,
                    },
                },
            ],
        };

        if (TEST_EVENT_CODE) {
            payload.test_event_code = TEST_EVENT_CODE;
        }

        const response = await fetch(`https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const body = await response.json();

        if (!response.ok) {
            console.error('[meta-capi-server] ❌ Error al enviar evento', body);
            return res.status(502).json({ error: 'Meta API error', details: body });
        }

        console.log(`[meta-capi-server] ✅ Evento enviado a Meta exitosamente`);
        res.json({ success: true, meta: body });
    } catch (error) {
        console.error('[meta-capi-server] Error inesperado', error);
        res.status(500).json({ error: 'Unexpected error', details: error?.message });
    }
});

app.get('/meta-capi/health', (_req, res) => {
    res.json({ status: 'ok', pixel: !!PIXEL_ID, token: !!ACCESS_TOKEN });
});

app.get('/meta-capi/health-db', async (req, res) => {
    if (!hasValidHealthToken(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await runDbReadCheck();
    if (!result.ok) {
        return res.status(result.code).json(result);
    }

    return res.json({
        status: 'ok',
        db: result.data,
    });
});

app.post('/meta-capi/health-db/write-test', async (req, res) => {
    if (!hasValidHealthToken(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await runDbWriteCheck();
    if (!result.ok) {
        return res.status(result.code).json(result);
    }

    return res.json({
        status: 'ok',
        inserted_row: result.data,
    });
});

async function startupDbCheck() {
    const result = await runDbReadCheck();
    if (!result.ok) {
        console.error('[meta-capi-server] ❌ DB startup check failed', {
            error: result.error,
            details: result.details,
        });
        return;
    }

    console.log('[meta-capi-server] ✅ DB startup check OK', result.data);
}

app.listen(port, () => {
    console.log(`[meta-capi-server] Escuchando en http://localhost:${port}`);
    void startupDbCheck();
});
