import prisma from '../prisma/client.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { projectService } from './project.service.js';
import { schedulerService } from './scheduler.service.js';
import {
  CreateEndpointDto,
  UpdateEndpointDto,
  Endpoint,
  CreateAssertionDto,
  Assertion,
} from '@api-guardian/shared';
import { Prisma } from '@prisma/client';

export class EndpointService {
  async create(userId: string, projectId: string, dto: CreateEndpointDto): Promise<Endpoint> {
    await projectService.verifyOwnership(userId, projectId);

    const endpoint = await prisma.endpoint.create({
      data: {
        projectId,
        name: dto.name.trim(),
        method: dto.method ?? 'GET',
        path: dto.path.trim(),
        description: dto.description?.trim() ?? null,
        headers: (dto.headers ?? []) as unknown as Prisma.InputJsonValue,
        parameters: (dto.parameters ?? []) as unknown as Prisma.InputJsonValue,
        body: dto.body ?? null,
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        expectedSchema: dto.expectedSchema ?? null,
        timeoutMs: dto.timeoutMs ?? 30000,
        schedule: dto.schedule ?? 'MANUAL',
        authType: dto.authType ?? 'NONE',
        authConfig: dto.authConfig ?? null,
      },
      include: { assertions: true },
    });

    // Schedule monitoring if not MANUAL
    if (endpoint.schedule !== 'MANUAL') {
      await schedulerService.scheduleEndpoint(endpoint.id, endpoint.schedule);
    }

    return endpoint as unknown as Endpoint;
  }

  async listByProject(userId: string, projectId: string): Promise<Endpoint[]> {
    await projectService.verifyOwnership(userId, projectId);

    const endpoints = await prisma.endpoint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        assertions: true,
        _count: { select: { testRuns: true, incidents: true } },
      },
    });
    return endpoints as unknown as Endpoint[];
  }

  async getById(userId: string, endpointId: string): Promise<Endpoint> {
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        assertions: true,
        project: { select: { userId: true } },
      },
    });

    if (!endpoint) throw new NotFoundError('Endpoint');
    if (endpoint.project.userId !== userId) throw new ForbiddenError('Access denied');

    return endpoint as unknown as Endpoint;
  }

  async update(userId: string, endpointId: string, dto: UpdateEndpointDto): Promise<Endpoint> {
    const existing = await this.getById(userId, endpointId);

    const endpoint = await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.method && { method: dto.method }),
        ...(dto.path && { path: dto.path.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.headers !== undefined && { headers: dto.headers as unknown as Prisma.InputJsonValue }),
        ...(dto.parameters !== undefined && { parameters: dto.parameters as unknown as Prisma.InputJsonValue }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.expectedStatusCode !== undefined && { expectedStatusCode: dto.expectedStatusCode }),
        ...(dto.expectedSchema !== undefined && { expectedSchema: dto.expectedSchema }),
        ...(dto.timeoutMs !== undefined && { timeoutMs: dto.timeoutMs }),
        ...(dto.schedule !== undefined && { schedule: dto.schedule }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.authType !== undefined && { authType: dto.authType }),
        ...(dto.authConfig !== undefined && { authConfig: dto.authConfig }),
      },
      include: { assertions: true },
    });

    // Update scheduler if schedule changed
    if (dto.schedule && dto.schedule !== existing.schedule) {
      if (dto.schedule === 'MANUAL') {
        await schedulerService.unscheduleEndpoint(endpointId);
      } else {
        await schedulerService.scheduleEndpoint(endpointId, dto.schedule);
      }
    }

    // Pause/resume on isActive change
    if (dto.isActive === false) {
      await schedulerService.unscheduleEndpoint(endpointId);
    } else if (dto.isActive === true && endpoint.schedule !== 'MANUAL') {
      await schedulerService.scheduleEndpoint(endpointId, endpoint.schedule);
    }

    return endpoint as unknown as Endpoint;
  }

  async delete(userId: string, endpointId: string): Promise<void> {
    await this.getById(userId, endpointId);
    await schedulerService.unscheduleEndpoint(endpointId);
    await prisma.endpoint.delete({ where: { id: endpointId } });
  }

  // ─── Assertions ─────────────────────────────────────────────
  async addAssertion(userId: string, endpointId: string, dto: CreateAssertionDto): Promise<Assertion> {
    await this.getById(userId, endpointId);
    const assertion = await prisma.assertion.create({
      data: {
        endpointId,
        type: dto.type,
        field: dto.field ?? null,
        operator: dto.operator,
        expected: dto.expected,
      },
    });
    return assertion as unknown as Assertion;
  }

  async updateAssertion(
    userId: string,
    endpointId: string,
    assertionId: string,
    dto: Partial<CreateAssertionDto>,
  ): Promise<Assertion> {
    await this.getById(userId, endpointId);
    const assertion = await prisma.assertion.update({
      where: { id: assertionId },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.field !== undefined && { field: dto.field ?? null }),
        ...(dto.operator && { operator: dto.operator }),
        ...(dto.expected !== undefined && { expected: dto.expected }),
      },
    });
    return assertion as unknown as Assertion;
  }

  async deleteAssertion(userId: string, endpointId: string, assertionId: string): Promise<void> {
    await this.getById(userId, endpointId);
    await prisma.assertion.delete({ where: { id: assertionId } });
  }

  async listAssertions(userId: string, endpointId: string): Promise<Assertion[]> {
    await this.getById(userId, endpointId);
    const assertions = await prisma.assertion.findMany({
      where: { endpointId, isActive: true },
    });
    return assertions as unknown as Assertion[];
  }
}

export const endpointService = new EndpointService();
