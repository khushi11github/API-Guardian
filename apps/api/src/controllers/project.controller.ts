import { Request, Response } from 'express';
import { projectService } from '../services/project.service.js';
import { asyncHandler } from '../lib/errors.js';

export const projectController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: project });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const projects = await projectService.list(req.user!.id);
    res.json({ success: true, data: projects });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.getById(req.user!.id, req.params.id);
    res.json({ success: true, data: project });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.update(req.user!.id, req.params.id, req.body);
    res.json({ success: true, data: project });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await projectService.delete(req.user!.id, req.params.id);
    res.json({ success: true, data: null, message: 'Project deleted' });
  }),
};
