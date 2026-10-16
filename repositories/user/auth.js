import pool from '../../db/index.js';

class AuthRepository {
  constructor() {
    this.pool = pool;
  }

  async createSession({ adminId, token, expiresAt }) {
    const query = `
      INSERT INTO admin_sessions (admin_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await this.pool.query(query, [adminId, token, expiresAt]);
    return result.rows[0];
  }

  async deleteByToken(token) {
    const query = 'DELETE FROM admin_sessions WHERE token = $1';
    await this.pool.query(query, [token]);
    return true;
  }

  async findValidByToken(token) {
    const query = `
      SELECT
        s.id,
        s.token,
        s.expires_at,
        s.admin_id,
        a.id AS admin_pk,
        a.name AS admin_name,
        a.login AS admin_login,
        a.email AS admin_email
      FROM admin_sessions s
      INNER JOIN admins a ON a.id = s.admin_id
      WHERE s.token = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `;
    const result = await this.pool.query(query, [token]);
    return result.rows[0];
  }
}

export default AuthRepository;
