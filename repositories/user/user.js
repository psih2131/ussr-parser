import pool from '../../db/index.js';

class UserRepository {
  constructor() {
    this.pool = pool;
  }

  async createUser(email, passwordHash) {
    const query =
      'INSERT INTO admins (email, login, password_hash) VALUES ($1, $1, $2) RETURNING *';
    const values = [email, passwordHash];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM admins WHERE email = $1';
    const values = [email];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAdminByLogin(login) {
    const query = `
      SELECT *
      FROM admins
      WHERE login = $1 OR email = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [login]);
    return result.rows[0];
  }
}

export default UserRepository;
