"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.setAppCurrentOrganizationId = setAppCurrentOrganizationId;
exports.clearCurrentOrganizationId = clearCurrentOrganizationId;
exports.closePool = closePool;
const pg_1 = require("pg");
let pool = null;
function getPool() {
    if (!pool) {
        pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
}
async function setAppCurrentOrganizationId(orgId) {
    const client = getPool();
    await client.query('SELECT app.set_current_organization_id($1)', [orgId]);
}
async function clearCurrentOrganizationId() {
    const client = getPool();
    await client.query("SELECT set_config('app.current_organization_id', NULL, false)");
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=connection.js.map