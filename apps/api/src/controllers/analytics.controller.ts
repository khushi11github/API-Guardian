import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { asyncHandler } from '../lib/errors.js';

export const analyticsController = {
  getDashboard: asyncHandler(async (req: Request, res: Response) => {
    const stats = await analyticsService.getDashboardStats(req.user!.id);
    res.json({ success: true, data: stats });
  }),

  getProjectStats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await analyticsService.getProjectStats(req.user!.id, req.params.projectId);
    res.json({ success: true, data: stats });
  }),

  getResponseTimeHistory: asyncHandler(async (req: Request, res: Response) => {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    const data = await analyticsService.getResponseTimeHistory(req.user!.id, req.params.endpointId, hours);
    res.json({ success: true, data });
  }),

  getUptimeHistory: asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await analyticsService.getUptimeHistory(req.user!.id, req.params.projectId, days);
    res.json({ success: true, data });
  }),
};
