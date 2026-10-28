import express from 'express';
import ParserController from '../controllers/ParserController.js';
import adminAuthMiddleware from '../middleware/adminAuthMiddleware.js';

const router = express.Router();
const parserController = new ParserController();

router.use(adminAuthMiddleware);

// рабочие специальности
router.get('/rab-spec', parserController.getRabSpecAll.bind(parserController));
router.get('/rab-spec/export', parserController.getRabSpecExport.bind(parserController));
router.delete('/rab-spec', parserController.deleteRabSpecAll.bind(parserController));
router.get('/rab-spec/:id', parserController.getRabSpecById.bind(parserController));

// запуск / статус по имени парсера (например rab-spec)
router.post('/start/:name', parserController.start.bind(parserController));
router.post('/start-one/:name', parserController.startOne.bind(parserController));
router.get('/status', parserController.getStatus.bind(parserController));

export default router;
