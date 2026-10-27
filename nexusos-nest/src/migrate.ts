import { Db } from './common/db';
import { migrate } from './migrations';
async function main() { const db = new Db(); try { await migrate(db); } finally { await db.onModuleDestroy(); } }
main().catch(error => { console.error(error.message); process.exitCode = 1; });
