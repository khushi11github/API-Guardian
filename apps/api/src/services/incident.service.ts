import prisma from '../prisma/client.js';
import { logger } from '../lib/logger.js';
import { notificationService } from './notification.service.js';
import { Incident, IncidentSeverity, IncidentStatus, TestRunStatus } from '@api-guardian/shared';

interface FailureContext {
  status: TestRunStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

function determineSeverity(statusCode: number | null, failureCount: number): IncidentSeverity {
  if (statusCode === null) return 'HIGH';
  if (statusCode >= 500) return failureCount >= 5 ? 'CRITICAL' : 'HIGH';
  if (statusCode >= 400) return 'MEDIUM';
  return failureCount >= 10 ? 'HIGH' : 'MEDIUM';
}

export class IncidentService {
  async handleFailure(
    endpointId: string,
    projectId: string,
    userId: string,
    ctx: FailureContext,
    testRunId: string,
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { consecutiveFailureThreshold: true },
    });
    const threshold = project?.consecutiveFailureThreshold ?? 3;

    // Count consecutive failures
    const recentRuns = await prisma.testRun.findMany({
      where: { endpointId },
      orderBy: { timestamp: 'desc' },
      take: threshold,
      select: { status: true },
    });

    const consecutiveFails = recentRuns.filter(r => r.status !== 'PASSED').length;

    // Find existing open incident
    const existingIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existingIncident) {
      // Update existing incident
      await prisma.incident.update({
        where: { id: existingIncident.id },
        data: {
          failureCount: { increment: 1 },
          affectedChecks: { increment: 1 },
          severity: determineSeverity(ctx.statusCode, existingIncident.failureCount + 1),
          errorMessage: ctx.errorMessage ?? existingIncident.errorMessage,
        },
      });
    } else if (consecutiveFails >= threshold) {
      // Create new incident
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: endpointId },
        select: { name: true, method: true, path: true },
      });

      const severity = determineSeverity(ctx.statusCode, consecutiveFails);
      const incident = await prisma.incident.create({
        data: {
          endpointId,
          projectId,
          title: `${endpoint?.method ?? 'HTTP'} ${endpoint?.path ?? endpointId} is failing`,
          severity,
          status: 'OPEN',
          errorMessage: ctx.errorMessage ?? `HTTP ${ctx.statusCode}`,
          failureCount: consecutiveFails,
          affectedChecks: consecutiveFails,
        },
      });

      logger.warn(`Incident created: ${incident.id}`, { endpointId, severity });

      // Notify
      await notificationService.notifyIncident(projectId, incident.id, {
        incidentId: incident.id,
        endpointId,
        endpointName: endpoint?.name ?? endpointId,
        method: endpoint?.method ?? 'GET',
        path: endpoint?.path ?? '/',
        statusCode: ctx.statusCode,
        failureCount: consecutiveFails,
        severity,
        startedAt: new Date().toISOString(),
        errorMessage: ctx.errorMessage,
      });
    }
  }

  async handleRecovery(endpointId: string, projectId: string): Promise<void> {
    const openIncidents = await prisma.incident.findMany({
      where: {
        endpointId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
    });

    for (const incident of openIncidents) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      logger.info(`Incident resolved: ${incident.id}`, { endpointId });

      // Notify recovery
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: endpointId },
        select: { name: true, method: true, path: true },
      });

      await notificationService.notifyRecovery(projectId, {
        incidentId: incident.id,
        endpointId,
        endpointName: endpoint?.name ?? endpointId,
        method: endpoint?.method ?? 'GET',
        path: endpoint?.path ?? '/',
        resolvedAt: new Date().toISOString(),
      });
    }
  }

  async list(userId: string, projectId: string, status?: IncidentStatus) {
    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== userId) return [];

    return prisma.incident.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      include: {
        endpoint: { select: { name: true, method: true, path: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getById(userId: string, incidentId: string) {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        endpoint: { select: { name: true, method: true, path: true } },
        project: { select: { userId: true, name: true } },
      },
    });
    if (!incident || incident.project.userId !== userId) return null;
    return incident;
  }

  async update(userId: string, incidentId: string, status: IncidentStatus) {
    const incident = await this.getById(userId, incidentId);
    if (!incident) return null;

    return prisma.incident.update({
      where: { id: incidentId },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });
  }
}

export const incidentService = new IncidentService();
