import { Request, Response } from 'express';
import { asyncHandler } from '../lib/errors.js';
import prisma from '../prisma/client.js';
import crypto from 'crypto';

export const webhookController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { url, events, enabled } = req.body;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await prisma.webhook.create({
      data: {
        projectId,
        userId: req.user!.id,
        url,
        secret,
        events: events ?? ['incident.created', 'incident.resolved'],
        enabled: enabled ?? true,
      },
    });

    res.status(201).json({ success: true, data: webhook });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
    const webhooks = await prisma.webhook.findMany({ where: { projectId } });
    res.json({ success: true, data: webhooks });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }
    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.url && { url: req.body.url }),
        ...(req.body.events && { events: req.body.events }),
        ...(req.body.enabled !== undefined && { enabled: req.body.enabled }),
      },
    });
    res.json({ success: true, data: updated });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  }),

  // Notification configs
  createNotification: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: req.user!.id,
        projectId,
        type: req.body.type,
        config: req.body.config,
        enabled: req.body.enabled ?? true,
      },
    });
    res.status(201).json({ success: true, data: notification });
  }),

  listNotifications: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
    const notifications = await prisma.notification.findMany({ where: { projectId } });
    res.json({ success: true, data: notifications });
  }),
};
