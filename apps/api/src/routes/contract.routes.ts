import { Router } from 'express';
import { contractController } from '../controllers/contract.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/endpoints/:endpointId/contracts', contractController.getEndpointContracts);
router.post('/endpoints/:endpointId/contracts', contractController.uploadOpenApiSpec);
router.get('/endpoints/:endpointId/contracts/changes', contractController.getContractChanges);

export default router;
