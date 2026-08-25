import { Request, Response } from 'express';
import { logService } from '../services/log.service.js';
import { asyncHandler } from '../lib/errors.js';

export const logController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, endpointId, level, search, startDate, endDate, page, pageSize } = req.query;

    const result = await logService.list(req.user!.id, {
      projectId: projectId as string | undefined,
      endpointId: endpointId as string | undefined,
      level: level as any,
      search: search as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50,
    });

    res.json({ success: true, data: result });
  }),
};
