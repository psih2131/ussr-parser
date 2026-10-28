import AiService from '../services/AiService.js';
import ApiErrors from '../exeptions/apiErrors.js';

class AiController {
  constructor() {
    this.aiService = new AiService();
  }

  async enrichRabSpec(req, res, next) {
    try {
      const { data, id } = req.body;

      if (data == null || data === '') {
        throw ApiErrors.BadRequest('Нет данных для запроса');
      }

      if (id == null || id === '') {
        throw ApiErrors.BadRequest('Нет id поста');
      }

      const result = await this.aiService.deepseekRequest(id, data);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async enrichRabSpecAll(req, res, next) {
    try {
      const status = await this.aiService.enrichAllRabSpec();

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEnrichStatus(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          'rab-spec': this.aiService.getStatus(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AiController;
