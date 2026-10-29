import pool from '../../db/index.js';

const LIST_COLUMNS = `
  id,
  url,
  title,
  parser_load,
  ai_load,
  parser_logs,
  created_at,
  updated_at
`;

class RabSpecRepository {
  constructor() {
    this.pool = pool;
  }

  async create({
    url,
    title = null,
    parser_load = false,
    post_data = {},
    parser_logs = null,
  }) {
    const query = `
      INSERT INTO rab_spec (url, title, parser_load, post_data, parser_logs)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      url,
      title,
      parser_load,
      JSON.stringify(post_data),
      parser_logs,
    ]);
    return result.rows[0];
  }

  async getAll() {
    const query = `
      SELECT ${LIST_COLUMNS}
      FROM rab_spec
      ORDER BY id DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAllWithPostData() {
    const query = `
      SELECT id, post_data
      FROM rab_spec
      ORDER BY id ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAllFull() {
    const query = `
      SELECT *
      FROM rab_spec
      ORDER BY id DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getById(id) {
    const query = `
      SELECT *
      FROM rab_spec
      WHERE id = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getByUrl(url) {
    const query = `
      SELECT *
      FROM rab_spec
      WHERE url = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [url]);
    return result.rows[0] || null;
  }

  // есть ли пост с таким адресом (хвостовой слэш не учитываем)
  async existsByUrl(url) {
    const query = `
      SELECT id
      FROM rab_spec
      WHERE rtrim(url, '/') = rtrim($1, '/')
      LIMIT 1
    `;
    const result = await this.pool.query(query, [url]);
    return Boolean(result.rows[0]);
  }

  async updateById(id, {
    title = null,
    parser_load = false,
    post_data = {},
    parser_logs = null,
  }) {
    const query = `
      UPDATE rab_spec
      SET
        title = $2,
        parser_load = $3,
        post_data = $4,
        parser_logs = $5,
        updated_at = current_timestamp
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      id,
      title,
      parser_load,
      JSON.stringify(post_data),
      parser_logs,
    ]);
    return result.rows[0] || null;
  }

  async updateAiData(id, ai_data) {
    const query = `
      UPDATE rab_spec
      SET
        ai_data = $2,
        ai_load = true,
        updated_at = current_timestamp
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      id,
      JSON.stringify(ai_data),
    ]);
    return result.rows[0] || null;
  }

  async updateAiLoad(id, ai_load) {
    const query = `
      UPDATE rab_spec
      SET
        ai_load = $2,
        updated_at = current_timestamp
      WHERE id = $1
      RETURNING id
    `;
    const result = await this.pool.query(query, [id, ai_load]);
    return result.rows[0] || null;
  }

  async deleteAll() {
    const query = `
      DELETE FROM rab_spec
      RETURNING id
    `;
    const result = await this.pool.query(query);
    return result.rowCount;
  }

  async deleteById(id) {
    const query = `
      DELETE FROM rab_spec
      WHERE id = $1
      RETURNING id
    `;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByUrl(url) {
    const query = `
      DELETE FROM rab_spec
      WHERE url = $1
      RETURNING id
    `;
    const result = await this.pool.query(query, [url]);
    return result.rowCount > 0;
  }
}

export default RabSpecRepository;
