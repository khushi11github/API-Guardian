import prisma from '../prisma/client.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { CreateProjectDto, UpdateProjectDto, Project } from '@api-guardian/shared';

export class ProjectService {
  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        baseUrl: dto.baseUrl.trim().replace(/\/$/, ''),
        environment: dto.environment,
      },
    });
    return project as unknown as Project;
  }

  async list(userId: string): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return projects as unknown as Project[];
  }

  async getById(userId: string, projectId: string): Promise<Project> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundError('Project');
    if (project.userId !== userId) throw new ForbiddenError('Access denied');

    return project as unknown as Project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.getById(userId, projectId); // Ownership check

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.baseUrl && { baseUrl: dto.baseUrl.trim().replace(/\/$/, '') }),
        ...(dto.environment && { environment: dto.environment }),
        ...(dto.consecutiveFailureThreshold !== undefined && {
          consecutiveFailureThreshold: dto.consecutiveFailureThreshold,
        }),
      },
    });
    return project as unknown as Project;
  }

  async delete(userId: string, projectId: string): Promise<void> {
    await this.getById(userId, projectId); // Ownership check
    await prisma.project.delete({ where: { id: projectId } });
  }

  async verifyOwnership(userId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) throw new NotFoundError('Project');
    if (project.userId !== userId) throw new ForbiddenError('Access denied');
  }
}

export const projectService = new ProjectService();
