import { Router } from 'express';
import { endpointController } from '../controllers/endpoint.controller.js';
import { analyticsController } from '../controllers/analytics.controller.js';
import { incidentController } from '../controllers/incident.controller.js';
import { webhookController } from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { testTriggerRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();
router.use(authenticate);

// ─── Endpoint CRUD ────────────────────────────────────────────
router.get('/:id', endpointController.getById);
router.put('/:id', endpointController.update);
router.delete('/:id', endpointController.delete);

// ─── Test trigger + results ───────────────────────────────────
router.post('/:id/test', testTriggerRateLimiter, endpointController.triggerTest);
router.get('/:id/results', endpointController.getResults);

// ─── Assertions ───────────────────────────────────────────────
router.get('/:id/assertions', endpointController.listAssertions);
router.post('/:id/assertions', endpointController.addAssertion);
router.put('/:id/assertions/:assertionId', endpointController.updateAssertion);
router.delete('/:id/assertions/:assertionId', endpointController.deleteAssertion);

// ─── Analytics per endpoint ───────────────────────────────────
router.get('/:endpointId/analytics/response-time', analyticsController.getResponseTimeHistory);

export default router;
