import prisma from '../prisma/client.js';
import { LogLevel } from '@api-guardian/shared';
import { Prisma } from '@prisma/client';

interface LogInput {
  projectId?: string | null;
  endpointId?: string | null;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class LogService {
  async log(input: LogInput): Promise<void> {
    await prisma.log.create({
      data: {
        projectId: input.projectId ?? null,
        endpointId: input.endpointId ?? null,
        level: input.level,
        service: input.service,
        message: input.message,
        metadata: (input.metadata ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async list(
    userId: string,
    filters: {
      projectId?: string;
      endpointId?: string;
      level?: LogLevel;
      search?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const { projectId, endpointId, level, search, startDate, endDate, page = 1, pageSize = 50 } = filters;

    // Build where clause (always scoped to user's projects)
    const where: Prisma.LogWhereInput = {
      ...(projectId
        ? { projectId, project: { userId } }
        : { project: { userId } }),
      ...(endpointId && { endpointId }),
      ...(level && { level }),
      ...(search && { message: { contains: search, mode: 'insensitive' } }),
      ...(startDate || endDate
        ? {
            timestamp: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          endpoint: { select: { name: true, method: true, path: true } },
        },
      }),
      prisma.log.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const logService = new LogService();
