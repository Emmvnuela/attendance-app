import 'dotenv/config';
import pg from 'pg';

// Keep DATE values as 'YYYY-MM-DD' strings (no timezone shifts); numerics and bigints become numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
export default pool;
