import { Request, Response } from 'express';
import { endpointService } from '../services/endpoint.service.js';
import { testingService } from '../services/testing.service.js';
import { asyncHandler } from '../lib/errors.js';

export const endpointController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const endpoint = await endpointService.create(req.user!.id, req.params.projectId, req.body);
    res.status(201).json({ success: true, data: endpoint });
  }),

  listByProject: asyncHandler(async (req: Request, res: Response) => {
    const endpoints = await endpointService.listByProject(req.user!.id, req.params.projectId);
    res.json({ success: true, data: endpoints });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const endpoint = await endpointService.getById(req.user!.id, req.params.id);
    res.json({ success: true, data: endpoint });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const endpoint = await endpointService.update(req.user!.id, req.params.id, req.body);
    res.json({ success: true, data: endpoint });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await endpointService.delete(req.user!.id, req.params.id);
    res.json({ success: true, data: null, message: 'Endpoint deleted' });
  }),

  triggerTest: asyncHandler(async (req: Request, res: Response) => {
    const result = await testingService.runTest(req.user!.id, req.params.id, 'MANUAL');
    res.json({ success: true, data: result });
  }),

  getResults: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, status } = req.query;
    const results = await testingService.getResults(req.user!.id, req.params.id, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      status: status as any,
    });
    res.json({ success: true, data: results });
  }),

  // Assertions
  addAssertion: asyncHandler(async (req: Request, res: Response) => {
    const assertion = await endpointService.addAssertion(req.user!.id, req.params.id, req.body);
    res.status(201).json({ success: true, data: assertion });
  }),

  listAssertions: asyncHandler(async (req: Request, res: Response) => {
    const assertions = await endpointService.listAssertions(req.user!.id, req.params.id);
    res.json({ success: true, data: assertions });
  }),

  updateAssertion: asyncHandler(async (req: Request, res: Response) => {
    const assertion = await endpointService.updateAssertion(
      req.user!.id,
      req.params.id,
      req.params.assertionId,
      req.body,
    );
    res.json({ success: true, data: assertion });
  }),

  deleteAssertion: asyncHandler(async (req: Request, res: Response) => {
    await endpointService.deleteAssertion(req.user!.id, req.params.id, req.params.assertionId);
    res.json({ success: true, data: null });
  }),
};
