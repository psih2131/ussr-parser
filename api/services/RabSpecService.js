import RabSpecRepository from '../../repositories/parser/rab_spec.js';
import ApiErrors from '../exeptions/apiErrors.js';
import { Parser } from '../../parser/index.js';

class RabSpecService {
  constructor() {
    this.rabSpecRepository = new RabSpecRepository();
    this.parser = new Parser();
    this.statusLoad = null;
  }

  async getAll() {
    try {
      return await this.rabSpecRepository.getAll();
    } catch (error) {
      console.error(error);
      throw ApiErrors.BadRequest('Ошибка получения списка постов');
    }
  }

  async getAllFull() {
    try {
      return await this.rabSpecRepository.getAllFull();
    } catch (error) {
      console.error(error);
      throw ApiErrors.BadRequest('Ошибка получения данных для выгрузки');
    }
  }

  async getById(id) {
    try {
      const post = await this.rabSpecRepository.getById(id);
      if (!post) {
        throw ApiErrors.NotFound('Пост не найден');
      }
      return post;
    } catch (error) {
      if (error instanceof ApiErrors) throw error;
      console.error(error);
      throw ApiErrors.BadRequest('Ошибка получения поста');
    }
  }

  async deleteAll() {
    try {
      const deleted = await this.rabSpecRepository.deleteAll();
      return { deleted };
    } catch (error) {
      console.error(error);
      throw ApiErrors.BadRequest('Ошибка удаления постов');
    }
  }

  getStatus() {
    return {
      statusLoad: this.statusLoad,
    };
  }

  async start(nameParser) {
    if (this.statusLoad === 'loading') {
      return this.getStatus();
    }

    if (nameParser !== 'rab-spec') {
      throw ApiErrors.BadRequest(`Неизвестный парсер: ${nameParser}`);
    }

    this.statusLoad = 'loading';

    this.parser
      .rabochieSpecialnosti()
      .then(() => {
        this.statusLoad = 'everything is loaded';
      })
      .catch((error) => {
        console.error(error);
        this.statusLoad = 'error loading';
      });

    return this.getStatus();
  }

  // тот же парсер, но страницы, которые уже есть в базе, пропускаются
  async startMissing(nameParser) {
    if (this.statusLoad === 'loading') {
      return this.getStatus();
    }

    if (nameParser !== 'rab-spec') {
      throw ApiErrors.BadRequest(`Неизвестный парсер: ${nameParser}`);
    }

    this.statusLoad = 'loading';

    this.parser
      .rabochieSpecialnosti(null, { skipExisting: true })
      .then(() => {
        this.statusLoad = 'everything is loaded';
      })
      .catch((error) => {
        console.error(error);
        this.statusLoad = 'error loading';
      });

    return this.getStatus();
  }

  async startOne(nameParser, url) {
    if (this.statusLoad === 'loading') {
      return this.getStatus();
    }

    if (nameParser !== 'rab-spec') {
      throw ApiErrors.BadRequest(`Неизвестный парсер: ${nameParser}`);
    }

    if (!url || typeof url !== 'string') {
      throw ApiErrors.BadRequest('Не передан url');
    }

    this.statusLoad = 'loading';

    this.parser
      .rabochieSpecialnosti([url])
      .then(() => {
        this.statusLoad = 'everything is loaded';
      })
      .catch((error) => {
        console.error(error);
        this.statusLoad = 'error loading';
      });

    return this.getStatus();
  }
}

export default RabSpecService;
