import express from 'express';
import AiController from '../controllers/AiController.js';
import adminAuthMiddleware from '../middleware/adminAuthMiddleware.js';

const router = express.Router();
const aiController = new AiController();

router.use(adminAuthMiddleware);

router.post('/rab-spec/enrich', aiController.enrichRabSpec.bind(aiController));
router.post('/rab-spec/enrich-all', aiController.enrichRabSpecAll.bind(aiController));
router.get('/rab-spec/status', aiController.getEnrichStatus.bind(aiController));

export default router;
