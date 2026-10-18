import RabSpecService from '../services/RabSpecService.js';

class ParserController {
  constructor() {
    this.rabSpecService = new RabSpecService();
  }

  async getRabSpecAll(req, res, next) {
    try {
      const posts = await this.rabSpecService.getAll();

      return res.status(200).json({
        success: true,
        data: { posts },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRabSpecById(req, res, next) {
    try {
      const post = await this.rabSpecService.getById(req.params.id);

      return res.status(200).json({
        success: true,
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRabSpecAll(req, res, next) {
    try {
      const result = await this.rabSpecService.deleteAll();

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async start(req, res, next) {
    try {
      const { name } = req.params;
      const status = await this.rabSpecService.start(name);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async startOne(req, res, next) {
    try {
      const { name } = req.params;
      const { url } = req.body;
      const status = await this.rabSpecService.startOne(name, url);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          'rab-spec': this.rabSpecService.getStatus(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ParserController;
