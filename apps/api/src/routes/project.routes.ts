import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { endpointController } from '../controllers/endpoint.controller.js';
import { incidentController } from '../controllers/incident.controller.js';
import { analyticsController } from '../controllers/analytics.controller.js';
import { logController } from '../controllers/log.controller.js';
import { webhookController } from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { testTriggerRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// ─── Projects ────────────────────────────────────────────────
router.get('/', projectController.list);
router.post('/', projectController.create);
router.get('/:id', projectController.getById);
router.put('/:id', projectController.update);
router.delete('/:id', projectController.delete);

// ─── Endpoints (nested under project) ────────────────────────
router.get('/:projectId/endpoints', endpointController.listByProject);
router.post('/:projectId/endpoints', endpointController.create);

// ─── Incidents ────────────────────────────────────────────────
router.get('/:projectId/incidents', incidentController.list);

// ─── Analytics ───────────────────────────────────────────────
router.get('/:projectId/analytics', analyticsController.getProjectStats);
router.get('/:projectId/analytics/uptime', analyticsController.getUptimeHistory);

// ─── Logs ────────────────────────────────────────────────────
router.get('/:projectId/logs', logController.list);

// ─── Webhooks ────────────────────────────────────────────────
router.get('/:projectId/webhooks', webhookController.list);
router.post('/:projectId/webhooks', webhookController.create);
router.get('/:projectId/notifications', webhookController.listNotifications);
router.post('/:projectId/notifications', webhookController.createNotification);

export default router;
