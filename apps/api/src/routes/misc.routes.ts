import { Router } from 'express';
import { incidentController } from '../controllers/incident.controller.js';
import { analyticsController } from '../controllers/analytics.controller.js';
import { logController } from '../controllers/log.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/incidents/:id', incidentController.getById);
router.put('/incidents/:id', incidentController.update);
router.post('/incidents/test-runs/:testRunId/analyze', incidentController.analyzeWithAi);
router.get('/analytics/dashboard', analyticsController.getDashboard);
router.get('/logs', logController.list);

export default router;
