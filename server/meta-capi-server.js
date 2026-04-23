import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import geoip from 'geoip-lite';
import { isIP } from 'node:net';

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
const ATTACK_ONLINE_USER = process.env.ATTACK_ONLINE_USER || 'admin01';
const ATTACK_ONLINE_PASSWORD = process.env.ATTACK_ONLINE_PASSWORD || 'leo01';

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

function hasValidDashboardCredentials(user, password) {
    return user === ATTACK_ONLINE_USER && password === ATTACK_ONLINE_PASSWORD;
}

function getClientIp(req) {
    const clientIpHeader = req.headers['x-forwarded-for'];
    const ip = Array.isArray(clientIpHeader)
        ? clientIpHeader[0]
        : (clientIpHeader?.split(',')[0]?.trim() || req.ip || '0.0.0.0');

    return normalizeIp(ip);
}

function normalizeIp(ipAddress) {
    if (!ipAddress || typeof ipAddress !== 'string') {
        return '0.0.0.0';
    }

    let normalized = ipAddress.trim();

    if (normalized.startsWith('for=')) {
        normalized = normalized.slice(4);
    }

    normalized = normalized.replace(/^"|"$/g, '');

    if (normalized.includes(',')) {
        normalized = normalized.split(',')[0].trim();
    }

    if (normalized.startsWith('[') && normalized.includes(']')) {
        normalized = normalized.slice(1, normalized.indexOf(']'));
    }

    // Si viene IPv4 con puerto (ej: 186.88.4.211:52311), quitar puerto.
    if (/^(\d{1,3}\.){3}\d{1,3}:\d+$/.test(normalized)) {
        normalized = normalized.split(':')[0];
    }

    // Quitar zone id de IPv6 (ej: fe80::1%eth0)
    if (normalized.includes('%')) {
        normalized = normalized.split('%')[0];
    }

    if (normalized.startsWith('::ffff:')) {
        normalized = normalized.replace('::ffff:', '');
    }

    if (normalized === '::1') {
        normalized = '127.0.0.1';
    }

    return normalized;
}

function sha256(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function isAllowedIpFormat(ipAddress) {
    return typeof ipAddress === 'string' && isIP(ipAddress) !== 0;
}

async function ensureAllowedIpsTable(pool) {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS allowed_ips (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            ip_address VARCHAR(45) NOT NULL,
            label VARCHAR(120) DEFAULT NULL,
            note VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_allowed_ips_ip_address (ip_address)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
}

async function isAllowedIp(pool, ipAddress) {
    if (!isAllowedIpFormat(ipAddress)) {
        return false;
    }

    await ensureAllowedIpsTable(pool);
    const [rows] = await pool.query(
        'SELECT id FROM allowed_ips WHERE ip_address = ? LIMIT 1',
        [ipAddress]
    );

    return Array.isArray(rows) && rows.length > 0;
}

async function getAllowedIpList(pool) {
    await ensureAllowedIpsTable(pool);
    const [rows] = await pool.query(
        `SELECT id, ip_address, label, note, created_at, updated_at
         FROM allowed_ips
         ORDER BY updated_at DESC, id DESC`
    );

    return Array.isArray(rows) ? rows : [];
}

async function ensureMetaEventDedupTable(pool) {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS meta_event_dedup (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            event_id VARCHAR(100) NOT NULL,
            event_name VARCHAR(64) NOT NULL,
            client_ip VARCHAR(45) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_meta_event_dedup_event_id (event_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
}

async function reserveMetaEventId(pool, eventName, eventId, clientIp) {
    if (eventName !== 'Lead' || !eventId) {
        return { deduped: false };
    }

    await ensureMetaEventDedupTable(pool);
    const [result] = await pool.query(
        `INSERT IGNORE INTO meta_event_dedup (event_id, event_name, client_ip)
         VALUES (?, ?, ?)`,
        [String(eventId), String(eventName), clientIp || null]
    );

    const inserted = Number(result?.affectedRows || 0) > 0;
    return { deduped: !inserted };
}

function normalizePhoneNumber(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const cleaned = value.replace(/[^\d+]/g, '');
    if (!cleaned) {
        return '';
    }

    if (cleaned.startsWith('+')) {
        return `+${cleaned.slice(1).replace(/\D/g, '')}`;
    }

    return `+${cleaned.replace(/\D/g, '')}`;
}

function pickRandom(list) {
    if (!Array.isArray(list) || list.length === 0) {
        return '';
    }

    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
}

function geolocateIp(ipAddress) {
    const normalizedIp = normalizeIp(ipAddress);

    if (!normalizedIp || normalizedIp === '0.0.0.0') {
        return { country: null, state: null };
    }

    if (normalizedIp.startsWith('127.') || normalizedIp === 'localhost') {
        return { country: null, state: null };
    }

    try {
        const geo = geoip.lookup(normalizedIp);
        if (!geo) {
            return { country: null, state: null, source: 'ip_lookup' };
        }

        const country = geo.country || null;
        const state = geo.region || geo.city || null;

        return { country, state, source: 'ip_lookup' };
    } catch (error) {
        return { country: null, state: null, source: 'ip_lookup' };
    }
}

async function resolveGeolocation(ipAddress) {
    return geolocateIp(ipAddress);
}

async function updateLatestAttemptGeo(pool, { domainAttacked, clientIp, visitorHash, geo }) {
    if (!geo || (!geo.country && !geo.state)) {
        return { updated: 0 };
    }

    const params = [domainAttacked, clientIp];
    let whereByFingerprint = '';
    if (visitorHash) {
        whereByFingerprint = ' OR fingerprint_hash = ?';
        params.push(visitorHash);
    }

    const [rows] = await pool.query(
        `SELECT id, country, state_region
         FROM call_attempts
         WHERE domain_attacked = ?
           AND created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
           AND (device_ip = ?${whereByFingerprint})
         ORDER BY id DESC
         LIMIT 1`,
        params
    );

    const latest = Array.isArray(rows) ? rows[0] : null;
    if (!latest) {
        return { updated: 0 };
    }

    const country = geo.country || latest.country || null;
    const state = geo.state || latest.state_region || null;

    if (country === latest.country && state === latest.state_region) {
        return { updated: 0 };
    }

    await pool.query(
        `UPDATE call_attempts
         SET country = ?, state_region = ?
         WHERE id = ?`,
        [country, state, latest.id]
    );

    return { updated: 1 };
}

async function insertBlockedEntry(pool, {
    domainAttacked,
    clientIp,
    visitorHash,
    geo,
    userAgent,
}) {
    const ipHash = clientIp ? sha256(clientIp) : null;

    await pool.query(
        `INSERT INTO call_attempts
            (domain_attacked, device_ip, ip_hash, fingerprint_hash, country, state_region, call_diverted, reason_code, user_agent)
         VALUES
            (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
            domainAttacked,
            clientIp,
            ipHash,
            visitorHash,
            geo?.country || null,
            geo?.state || null,
            'BLOCKED_ON_ENTRY',
            userAgent || null,
        ]
    );
}

async function ensureClientLeadsTable(pool) {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS client_leads (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            full_name VARCHAR(120) NOT NULL,
            phone VARCHAR(25) NOT NULL,
            zip_code VARCHAR(12) NOT NULL,
            age_range VARCHAR(32) DEFAULT NULL,
            intro_answer VARCHAR(32) DEFAULT NULL,
            domain_attacked VARCHAR(255) DEFAULT NULL,
            device_ip VARCHAR(45) DEFAULT NULL,
            country VARCHAR(80) DEFAULT NULL,
            state_region VARCHAR(120) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_client_leads_created_at (created_at),
            KEY idx_client_leads_domain_created_at (domain_attacked, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
}

async function insertClientLead(pool, {
    fullName,
    phone,
    zipCode,
    ageRange,
    introAnswer,
    domainAttacked,
    clientIp,
    geo,
}) {
    await ensureClientLeadsTable(pool);
    await pool.query(
        `INSERT INTO client_leads
            (full_name, phone, zip_code, age_range, intro_answer, domain_attacked, device_ip, country, state_region)
         VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
            fullName,
            phone,
            zipCode,
            ageRange || null,
            introAnswer || null,
            domainAttacked || null,
            clientIp || null,
            geo?.country || null,
            geo?.state || null,
        ]
    );
}

async function getClientLeads(pool, limit = 200) {
    await ensureClientLeadsTable(pool);
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.trunc(limit))) : 200;
    const [rows] = await pool.query(
        `SELECT id, full_name, phone, zip_code, age_range, intro_answer, domain_attacked, device_ip, country, state_region, created_at, updated_at
         FROM client_leads
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`
    );

    return Array.isArray(rows) ? rows : [];
}

async function getClientLeadById(pool, id) {
    await ensureClientLeadsTable(pool);
    const [rows] = await pool.query(
        `SELECT id, full_name, phone, zip_code, age_range, intro_answer, domain_attacked, device_ip, country, state_region, created_at, updated_at
         FROM client_leads
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return Array.isArray(rows) ? rows[0] : null;
}

async function updateClientLead(pool, id, data) {
    await ensureClientLeadsTable(pool);
    const fullName = String(data?.fullName || '').trim();
    const phone = normalizePhoneNumber(String(data?.phone || '').trim());
    const zipCode = String(data?.zipCode || '').replace(/\D/g, '').slice(0, 5);
    const ageRange = String(data?.ageRange || '').trim();
    const introAnswer = String(data?.introAnswer || '').trim();

    if (!fullName) {
        return {
            ok: false,
            code: 400,
            error: 'Invalid name',
            details: 'El nombre es requerido.',
        };
    }

    if (phone.replace(/\D/g, '').length !== 10 && phone.replace(/\D/g, '').length !== 11) {
        return {
            ok: false,
            code: 400,
            error: 'Invalid phone',
            details: 'Se requiere un teléfono válido.',
        };
    }

    if (zipCode.length !== 5) {
        return {
            ok: false,
            code: 400,
            error: 'Invalid ZIP',
            details: 'Se requiere un código postal válido de 5 dígitos.',
        };
    }

    const [result] = await pool.query(
        `UPDATE client_leads
         SET full_name = ?, phone = ?, zip_code = ?, age_range = ?, intro_answer = ?
         WHERE id = ?`,
        [fullName, phone, zipCode, ageRange || null, introAnswer || null, id]
    );

    if (Number(result?.affectedRows || 0) === 0) {
        return {
            ok: false,
            code: 404,
            error: 'Lead not found',
            details: 'No se encontró el cliente a editar.',
        };
    }

    return {
        ok: true,
        code: 200,
        data: await getClientLeadById(pool, id),
    };
}

async function deleteClientLead(pool, id) {
    await ensureClientLeadsTable(pool);
    const [result] = await pool.query(
        'DELETE FROM client_leads WHERE id = ? LIMIT 1',
        [id]
    );

    if (Number(result?.affectedRows || 0) === 0) {
        return {
            ok: false,
            code: 404,
            error: 'Lead not found',
            details: 'No se encontró el cliente a eliminar.',
        };
    }

    return {
        ok: true,
        code: 200,
    };
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

        const client_ip_address = getClientIp(req);
        const client_user_agent = req.get('user-agent');

        if (event_name === 'Lead') {
            const pool = getDbPool();
            if (!pool) {
                return res.status(503).json({
                    error: 'DB no configurada',
                    details: 'No se puede validar Lead sin conexión a base de datos.',
                });
            }

            try {
                if (await isAllowedIp(pool, client_ip_address)) {
                    const dedupResult = await reserveMetaEventId(pool, event_name, event_id, client_ip_address);
                    if (dedupResult.deduped) {
                        return res.json({ success: true, deduped: true, allowlisted: true });
                    }

                    let finalCustomData = (custom_data && typeof custom_data === 'object') ? { ...custom_data } : undefined;

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

                    console.log('[meta-capi-server] ✅ Evento enviado a Meta exitosamente (allowlist)');
                    return res.json({ success: true, meta: body, allowlisted: true });
                }

                const [leadAuthRows] = await pool.query(
                    `SELECT call_diverted, created_at
                     FROM call_attempts
                     WHERE device_ip = ?
                     ORDER BY id DESC
                     LIMIT 1`,
                    [client_ip_address]
                );

                const latestAttempt = Array.isArray(leadAuthRows) ? leadAuthRows[0] : null;
                const isFreshAttempt = latestAttempt?.created_at
                    ? (Date.now() - new Date(latestAttempt.created_at).getTime()) <= 2 * 60 * 1000
                    : false;

                if (!latestAttempt || latestAttempt.call_diverted === 1 || !isFreshAttempt) {
                    return res.status(403).json({
                        error: 'Lead blocked',
                        details: 'Lead rechazado por política anti-abuso.',
                    });
                }

                const dedupResult = await reserveMetaEventId(pool, event_name, event_id, client_ip_address);
                if (dedupResult.deduped) {
                    return res.json({ success: true, deduped: true });
                }
            } catch (dbError) {
                console.error('[meta-capi-server] Error validando autorización de Lead', dbError);
                return res.status(502).json({
                    error: 'Lead validation failed',
                    details: dbError?.message || 'No se pudo validar autorización de Lead.',
                });
            }
        }

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

app.post('/meta-capi/call-status', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const domainAttacked = String(req.body?.domain || req.get('origin') || '').trim().toLowerCase();
    const visitorId = String(req.body?.visitorId || '').trim();

    if (!domainAttacked) {
        return res.status(400).json({
            error: 'Parámetros inválidos',
            details: 'domain es requerido.',
        });
    }

    const clientIp = getClientIp(req);
    const visitorHash = visitorId ? sha256(visitorId) : null;

    if (await isAllowedIp(pool, clientIp)) {
        return res.json({
            status: 'ok',
            isBlocked: false,
            allowedIp: true,
        });
    }

    try {
        const params = [domainAttacked, clientIp];
        let whereByFingerprint = '';
        if (visitorHash) {
            whereByFingerprint = ' OR fingerprint_hash = ?';
            params.push(visitorHash);
        }

        const [rows] = await pool.query(
            `SELECT id
             FROM call_attempts
             WHERE domain_attacked = ?
               AND created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
               AND (device_ip = ?${whereByFingerprint})
             ORDER BY id DESC
             LIMIT 1`,
            params
        );

        return res.json({
            status: 'ok',
            isBlocked: Array.isArray(rows) && rows.length > 0,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error consultando estado de llamada', error);
        return res.status(502).json({
            error: 'DB call status failed',
            details: error?.message || 'No se pudo consultar estado de llamada.',
        });
    }
});

app.post('/meta-capi/resolve-call', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const domainAttacked = String(req.body?.domain || req.get('origin') || '').trim().toLowerCase();
    const realNumber = normalizePhoneNumber(req.body?.realNumber || '');
    const visitorId = String(req.body?.visitorId || '').trim();

    if (!domainAttacked || !realNumber) {
        return res.status(400).json({
            error: 'Parámetros inválidos',
            details: 'domain y realNumber son requeridos.',
        });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.get('user-agent') || null;
    const visitorHash = visitorId ? sha256(visitorId) : null;
    const ipHash = clientIp ? sha256(clientIp) : null;

    if (await isAllowedIp(pool, clientIp)) {
        const geo = await resolveGeolocation(clientIp);
        return res.json({
            status: 'ok',
            callDiverted: false,
            callBlocked: false,
            destinationNumber: realNumber,
            allowLead: true,
            reasonCode: 'ALLOWLISTED',
            geo,
            geoSource: 'allowlist',
        });
    }

    let shouldDivert = false;
    let reasonCode = 'FIRST_ATTEMPT';

    try {
        const params = [domainAttacked, clientIp];
        let whereByFingerprint = '';
        if (visitorHash) {
            whereByFingerprint = ' OR fingerprint_hash = ?';
            params.push(visitorHash);
        }

        const [rows] = await pool.query(
            `SELECT id
             FROM call_attempts
             WHERE domain_attacked = ?
               AND created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
               AND (device_ip = ?${whereByFingerprint})
             ORDER BY id DESC
             LIMIT 1`,
            params
        );

        if (Array.isArray(rows) && rows.length > 0) {
            shouldDivert = true;
            reasonCode = visitorHash ? 'REPEAT_IP_OR_DEVICE' : 'REPEAT_IP';
        }
    } catch (error) {
        console.error('[meta-capi-server] Error consultando historial de intentos', error);
        return res.status(502).json({
            error: 'DB lookup failed',
            details: error?.message || 'No se pudo consultar historial de intentos.',
        });
    }

    const destinationNumber = realNumber;

    const geo = await resolveGeolocation(clientIp);

    try {
        await pool.query(
            `INSERT INTO call_attempts
                (domain_attacked, device_ip, ip_hash, fingerprint_hash, country, state_region, call_diverted, destination_number, source_number, reason_code, user_agent)
             VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                domainAttacked,
                clientIp,
                ipHash,
                visitorHash,
                geo.country,
                geo.state,
                shouldDivert ? 1 : 0,
                shouldDivert ? null : destinationNumber,
                realNumber,
                reasonCode,
                userAgent,
            ]
        );
    } catch (error) {
        console.error('[meta-capi-server] Error guardando intento de llamada', error);
        return res.status(502).json({
            error: 'DB insert failed',
            details: error?.message || 'No se pudo registrar el intento de llamada.',
        });
    }

    return res.json({
        status: 'ok',
        callDiverted: shouldDivert,
        callBlocked: shouldDivert,
        destinationNumber: shouldDivert ? null : destinationNumber,
        allowLead: !shouldDivert,
        reasonCode,
        geo,
        geoSource: geo?.source || 'ip_lookup',
    });
});

app.post('/meta-capi/attack-online/logs', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const user = String(req.body?.user || '').trim();
    const password = String(req.body?.password || '');
    if (!hasValidDashboardCredentials(user, password)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const limitRaw = Number(req.body?.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 20), 500) : 200;

    try {
        const [rows] = await pool.query(
            `SELECT
                grouped.domain_attacked,
                grouped.device_ip,
                grouped.country,
                grouped.state_region,
                grouped.diverted_count,
                grouped.total_attempts,
                grouped.last_attempt_at,
                CASE
                    WHEN grouped.total_attempts = 1 THEN 'FIRST_ATTEMPT'
                    ELSE latest.reason_code
                END AS last_reason_code
             FROM (
                SELECT
                    domain_attacked,
                    device_ip,
                    MAX(country) AS country,
                    MAX(state_region) AS state_region,
                    SUM(CASE WHEN call_diverted = 1 THEN 1 ELSE 0 END) AS diverted_count,
                    COUNT(*) AS total_attempts,
                    MAX(created_at) AS last_attempt_at
                 FROM call_attempts
                 WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
                 GROUP BY domain_attacked, device_ip
             ) AS grouped
             LEFT JOIN call_attempts AS latest
               ON latest.id = (
                    SELECT ca.id
                    FROM call_attempts ca
                    WHERE ca.domain_attacked = grouped.domain_attacked
                      AND ca.device_ip = grouped.device_ip
                      AND ca.created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
                    ORDER BY ca.created_at DESC, ca.id DESC
                    LIMIT 1
               )
             ORDER BY grouped.last_attempt_at DESC
             LIMIT ?`,
            [limit]
        );

        const [statsRows] = await pool.query(
            `SELECT
                COUNT(*) AS total_events_week,
                SUM(CASE WHEN call_diverted = 1 THEN 1 ELSE 0 END) AS total_diverted_week,
                COUNT(DISTINCT device_ip) AS unique_ips_week,
                COUNT(DISTINCT CONCAT(domain_attacked, '|', device_ip)) AS grouped_rows_week
             FROM call_attempts
             WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)`
        );

        return res.json({
            status: 'ok',
            generated_at: new Date().toISOString(),
            total: Array.isArray(rows) ? rows.length : 0,
            stats: Array.isArray(statsRows) && statsRows[0] ? statsRows[0] : {},
            rows: Array.isArray(rows) ? rows : [],
        });
    } catch (error) {
        console.error('[meta-capi-server] Error consultando logs attack-online', error);
        return res.status(502).json({
            error: 'DB logs query failed',
            details: error?.message || 'No se pudieron consultar los logs de ataque.',
        });
    }
});

app.post('/meta-capi/attack-online/reset-blocked', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const user = String(req.body?.user || '').trim();
    const password = String(req.body?.password || '');
    if (!hasValidDashboardCredentials(user, password)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const scope = String(req.body?.scope || 'all').trim().toLowerCase();
    if (scope !== 'all' && scope !== 'blocked') {
        return res.status(400).json({
            error: 'Invalid scope',
            details: 'scope debe ser all o blocked.',
        });
    }

    try {
        const [result] = scope === 'blocked'
            ? await pool.query(
                `DELETE FROM call_attempts
                 WHERE call_diverted = 1
                    OR reason_code = 'BLOCKED_ON_ENTRY'`
            )
            : await pool.query('DELETE FROM call_attempts');

        return res.json({
            status: 'ok',
            scope,
            deletedRows: Number(result?.affectedRows || 0),
        });
    } catch (error) {
        console.error('[meta-capi-server] Error reiniciando registros de bloqueo', error);
        return res.status(502).json({
            error: 'Attack reset failed',
            details: error?.message || 'No se pudo reiniciar los registros de bloqueo.',
        });
    }
});

app.post('/meta-capi/session-geo', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const domainAttacked = String(req.body?.domain || req.get('origin') || '').trim().toLowerCase();
    const visitorId = String(req.body?.visitorId || '').trim();

    if (!domainAttacked) {
        return res.status(400).json({
            error: 'Parámetros inválidos',
            details: 'domain es requerido.',
        });
    }

    const clientIp = getClientIp(req);
    const visitorHash = visitorId ? sha256(visitorId) : null;
    const geo = await resolveGeolocation(clientIp);

    if (await isAllowedIp(pool, clientIp)) {
        return res.json({
            status: 'ok',
            updated: 0,
            geo,
            geoSource: 'allowlist',
            allowedIp: true,
        });
    }

    try {
        const result = await updateLatestAttemptGeo(pool, {
            domainAttacked,
            clientIp,
            visitorHash,
            geo,
        });

        return res.json({
            status: 'ok',
            updated: result.updated,
            geo,
            geoSource: geo?.source || 'ip_lookup',
        });
    } catch (error) {
        console.error('[meta-capi-server] Error guardando geo de sesión', error);
        return res.status(502).json({
            error: 'Session geo failed',
            details: error?.message || 'No se pudo guardar la geolocalización de sesión.',
        });
    }
});

app.get('/meta-capi/allowed-ips', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    if (!hasValidDashboardCredentials(String(req.query?.user || ''), String(req.query?.password || ''))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const rows = await getAllowedIpList(pool);
        return res.json({ status: 'ok', rows });
    } catch (error) {
        console.error('[meta-capi-server] Error consultando IPs permitidas', error);
        return res.status(502).json({
            error: 'Allowed IPs list failed',
            details: error?.message || 'No se pudo consultar las IPs permitidas.',
        });
    }
});

app.post('/meta-capi/allowed-ips', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const user = String(req.body?.user || '').trim();
    const password = String(req.body?.password || '');
    if (!hasValidDashboardCredentials(user, password)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const ipAddress = normalizeIp(String(req.body?.ipAddress || '').trim());
    const label = String(req.body?.label || '').trim();
    const note = String(req.body?.note || '').trim();

    if (!isAllowedIpFormat(ipAddress)) {
        return res.status(400).json({
            error: 'Invalid IP',
            details: 'Se requiere una IP IPv4 valida.',
        });
    }

    try {
        await ensureAllowedIpsTable(pool);
        const [result] = await pool.query(
            `INSERT INTO allowed_ips (ip_address, label, note)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                note = VALUES(note),
                updated_at = CURRENT_TIMESTAMP`,
            [ipAddress, label || null, note || null]
        );

        return res.json({
            status: 'ok',
            insertedId: result?.insertId || null,
            ipAddress,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error guardando IP permitida', error);
        return res.status(502).json({
            error: 'Allowed IP save failed',
            details: error?.message || 'No se pudo guardar la IP permitida.',
        });
    }
});

app.put('/meta-capi/allowed-ips/:id', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const user = String(req.body?.user || '').trim();
    const password = String(req.body?.password || '');
    if (!hasValidDashboardCredentials(user, password)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = Number(req.params.id);
    const ipAddress = normalizeIp(String(req.body?.ipAddress || '').trim());
    const label = String(req.body?.label || '').trim();
    const note = String(req.body?.note || '').trim();

    if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    if (!isAllowedIpFormat(ipAddress)) {
        return res.status(400).json({
            error: 'Invalid IP',
            details: 'Se requiere una IP IPv4 valida.',
        });
    }

    try {
        await ensureAllowedIpsTable(pool);
        await pool.query(
            `UPDATE allowed_ips
             SET ip_address = ?, label = ?, note = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [ipAddress, label || null, note || null, id]
        );

        return res.json({ status: 'ok', id, ipAddress });
    } catch (error) {
        console.error('[meta-capi-server] Error actualizando IP permitida', error);
        return res.status(502).json({
            error: 'Allowed IP update failed',
            details: error?.message || 'No se pudo actualizar la IP permitida.',
        });
    }
});

app.delete('/meta-capi/allowed-ips/:id', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const user = String(req.body?.user || '').trim();
    const password = String(req.body?.password || '');
    if (!hasValidDashboardCredentials(user, password)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        await ensureAllowedIpsTable(pool);
        await pool.query('DELETE FROM allowed_ips WHERE id = ?', [id]);
        return res.json({ status: 'ok', id });
    } catch (error) {
        console.error('[meta-capi-server] Error borrando IP permitida', error);
        return res.status(502).json({
            error: 'Allowed IP delete failed',
            details: error?.message || 'No se pudo borrar la IP permitida.',
        });
    }
});

// DIAGNOSTICO: Endpoint para debuggear problemas de IP permitida
app.post('/meta-capi/diagnose-ip', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    try {
        const clientIp = getClientIp(req);
        const rawIpFromHeader = req.headers['x-forwarded-for'] || req.ip || 'unknown';

        await ensureAllowedIpsTable(pool);
        const [allowedIps] = await pool.query(
            'SELECT id, ip_address, label FROM allowed_ips ORDER BY created_at DESC LIMIT 10'
        );

        const isAllowed = await isAllowedIp(pool, clientIp);

        return res.json({
            detected_ip_normalized: clientIp,
            raw_ip_from_header: rawIpFromHeader,
            is_allowed: isAllowed,
            allowed_ips_list: Array.isArray(allowedIps) ? allowedIps : [],
            message: 'Usa esta info para debuggear por que tu IP no esta siendo permitida',
        });
    } catch (error) {
        console.error('[meta-capi-server] Error en diagnostico de IP', error);
        return res.status(502).json({
            error: 'Diagnosis failed',
            details: error?.message,
        });
    }
});

app.post('/meta-capi/blocked-entry', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const domainAttacked = String(req.body?.domain || req.get('origin') || '').trim().toLowerCase();
    const visitorId = String(req.body?.visitorId || '').trim();

    if (!domainAttacked) {
        return res.status(400).json({
            error: 'Parámetros inválidos',
            details: 'domain es requerido.',
        });
    }

    const clientIp = getClientIp(req);
    const visitorHash = visitorId ? sha256(visitorId) : null;
    const geo = await resolveGeolocation(clientIp);
    const userAgent = req.get('user-agent') || null;

    if (await isAllowedIp(pool, clientIp)) {
        return res.json({
            status: 'ok',
            inserted: false,
            alreadyLogged: false,
            allowedIp: true,
            geo,
            geoSource: 'allowlist',
        });
    }

    try {
        const params = [domainAttacked, clientIp];
        let whereByFingerprint = '';
        if (visitorHash) {
            whereByFingerprint = ' OR fingerprint_hash = ?';
            params.push(visitorHash);
        }

        const [rows] = await pool.query(
            `SELECT id
             FROM call_attempts
             WHERE domain_attacked = ?
               AND created_at >= (UTC_TIMESTAMP() - INTERVAL 30 MINUTE)
               AND reason_code = 'BLOCKED_ON_ENTRY'
               AND (device_ip = ?${whereByFingerprint})
             ORDER BY id DESC
             LIMIT 1`,
            params
        );

        if (Array.isArray(rows) && rows.length > 0) {
            return res.json({
                status: 'ok',
                inserted: false,
                alreadyLogged: true,
                geo,
                geoSource: geo?.source || 'ip_lookup',
            });
        }

        await insertBlockedEntry(pool, {
            domainAttacked,
            clientIp,
            visitorHash,
            geo,
            userAgent,
        });

        return res.json({
            status: 'ok',
            inserted: true,
            alreadyLogged: false,
            geo,
            geoSource: geo?.source || 'ip_lookup',
        });
    } catch (error) {
        console.error('[meta-capi-server] Error registrando entrada bloqueada', error);
        return res.status(502).json({
            error: 'Blocked entry failed',
            details: error?.message || 'No se pudo registrar la entrada bloqueada.',
        });
    }
});

app.post('/meta-capi/client-leads', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    const fullName = String(req.body?.fullName || '').trim();
    const phone = normalizePhoneNumber(String(req.body?.phone || '').trim());
    const zipCode = String(req.body?.zipCode || '').replace(/\D/g, '').slice(0, 5);
    const ageRange = String(req.body?.ageRange || '').trim();
    const introAnswer = String(req.body?.introAnswer || '').trim();
    const domainAttacked = String(req.body?.domain || req.get('origin') || '').trim().toLowerCase();

    if (!fullName) {
        return res.status(400).json({
            error: 'Invalid name',
            details: 'El nombre es requerido.',
        });
    }

    if (phone.replace(/\D/g, '').length !== 10 && phone.replace(/\D/g, '').length !== 11) {
        return res.status(400).json({
            error: 'Invalid phone',
            details: 'Se requiere un teléfono válido.',
        });
    }

    if (zipCode.length !== 5) {
        return res.status(400).json({
            error: 'Invalid ZIP',
            details: 'Se requiere un código postal válido de 5 dígitos.',
        });
    }

    try {
        const clientIp = getClientIp(req);
        const geo = await resolveGeolocation(clientIp);

        await insertClientLead(pool, {
            fullName,
            phone,
            zipCode,
            ageRange,
            introAnswer,
            domainAttacked,
            clientIp,
            geo,
        });

        return res.json({
            status: 'ok',
            country: geo?.country || null,
            state_region: geo?.state || null,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error guardando client lead', error);
        return res.status(502).json({
            error: 'Client lead save failed',
            details: error?.message || 'No se pudo guardar el lead del cliente.',
        });
    }
});

app.get('/meta-capi/client-leads', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    if (!hasValidDashboardCredentials(String(req.query?.user || ''), String(req.query?.password || ''))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Number(req.query?.limit || 200);

    try {
        const rows = await getClientLeads(pool, limit);
        return res.json({
            status: 'ok',
            rows,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error consultando client leads', error);
        return res.status(502).json({
            error: 'Client leads list failed',
            details: error?.message || 'No se pudo consultar el listado de clientes.',
        });
    }
});

app.put('/meta-capi/client-leads/:id', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    if (!hasValidDashboardCredentials(String(req.query?.user || ''), String(req.query?.password || ''))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = Number(req.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'Invalid lead id',
            details: 'El identificador del cliente no es válido.',
        });
    }

    try {
        const result = await updateClientLead(pool, id, req.body || {});

        if (!result.ok) {
            return res.status(result.code).json({
                error: result.error,
                details: result.details,
            });
        }

        return res.json({
            status: 'ok',
            row: result.data,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error actualizando client lead', error);
        return res.status(502).json({
            error: 'Client lead update failed',
            details: error?.message || 'No se pudo actualizar el cliente.',
        });
    }
});

app.delete('/meta-capi/client-leads/:id', async (req, res) => {
    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    if (!hasValidDashboardCredentials(String(req.query?.user || ''), String(req.query?.password || ''))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = Number(req.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'Invalid lead id',
            details: 'El identificador del cliente no es válido.',
        });
    }

    try {
        const result = await deleteClientLead(pool, id);

        if (!result.ok) {
            return res.status(result.code).json({
                error: result.error,
                details: result.details,
            });
        }

        return res.json({ status: 'ok' });
    } catch (error) {
        console.error('[meta-capi-server] Error eliminando client lead', error);
        return res.status(502).json({
            error: 'Client lead delete failed',
            details: error?.message || 'No se pudo eliminar el cliente.',
        });
    }
});

app.post('/meta-capi/backfill-geolocation', async (req, res) => {
    if (!hasValidHealthToken(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getDbPool();
    if (!pool) {
        return res.status(503).json({
            error: 'DB no configurada',
            details: 'Faltan variables DB_* en el backend.',
        });
    }

    try {
        // Buscar registros sin país o estado
        const [rows] = await pool.query(
            `SELECT id, device_ip FROM call_attempts 
             WHERE country IS NULL OR state_region IS NULL
             ORDER BY created_at DESC`
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.json({
                status: 'ok',
                message: 'No hay registros para actualizar',
                updated: 0,
                errors: 0,
            });
        }

        let updated = 0;
        let errors = 0;

        // Procesar cada registro
        for (const row of rows) {
            try {
                const geo = geolocateIp(row.device_ip);
                await pool.query(
                    `UPDATE call_attempts SET country = ?, state_region = ? WHERE id = ?`,
                    [geo.country, geo.state, row.id]
                );
                updated++;
            } catch (err) {
                errors++;
                console.error(`[backfill-geolocation] Error actualizando ID ${row.id}:`, err.message);
            }
        }

        return res.json({
            status: 'ok',
            message: `Backfill completado: ${updated} actualizados, ${errors} errores`,
            total_found: rows.length,
            updated,
            errors,
        });
    } catch (error) {
        console.error('[meta-capi-server] Error en backfill-geolocation', error);
        return res.status(502).json({
            error: 'Backfill failed',
            details: error?.message || 'Error al actualizar la geolocalización.',
        });
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
