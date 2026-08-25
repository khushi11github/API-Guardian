import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { diffAgainstOpenApiSchema, diffJsonResponses } from '@api-guardian/shared';
import yaml from 'yaml';

export const contractController = {
  getEndpointContracts: asyncHandler(async (req: Request, res: Response) => {
    const { endpointId } = req.params;
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: { project: { select: { userId: true } } },
    });

    if (!endpoint) throw new NotFoundError('Endpoint');
    if (endpoint.project.userId !== req.user!.id) throw new ForbiddenError('Access denied');

    const contracts = await prisma.apiContract.findMany({
      where: { endpointId },
      include: { changes: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: contracts });
  }),

  uploadOpenApiSpec: asyncHandler(async (req: Request, res: Response) => {
    const { endpointId } = req.params;
    const { specContent, specType = 'OPENAPI' } = req.body;

    if (!specContent) {
      throw new ValidationError('specContent is required');
    }

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: { project: { select: { userId: true } } },
    });

    if (!endpoint) throw new NotFoundError('Endpoint');
    if (endpoint.project.userId !== req.user!.id) throw new ForbiddenError('Access denied');

    let parsedSpec: any;
    try {
      if (typeof specContent === 'object') {
        parsedSpec = specContent;
      } else if (specContent.trim().startsWith('{')) {
        parsedSpec = JSON.parse(specContent);
      } else {
        parsedSpec = yaml.parse(specContent);
      }
    } catch (err: any) {
      throw new ValidationError(`Failed to parse specification: ${err.message}`);
    }

    // Save as contract baseline
    const contract = await prisma.apiContract.create({
      data: {
        endpointId,
        spec: typeof parsedSpec === 'string' ? parsedSpec : JSON.stringify(parsedSpec, null, 2),
        specType: specType === 'OPENAPI' ? 'OPENAPI' : 'JSON_SCHEMA',
        version: `spec-${Date.now()}`,
        isBaseline: true,
      },
    });

    // Also update endpoint's expectedSchema if json schema or openapi component schema
    await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        expectedSchema: typeof parsedSpec === 'string' ? parsedSpec : JSON.stringify(parsedSpec),
      },
    });

    res.status(201).json({ success: true, data: contract, message: 'Contract uploaded and set as baseline' });
  }),

  getContractChanges: asyncHandler(async (req: Request, res: Response) => {
    const { endpointId } = req.params;
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: { project: { select: { userId: true } } },
    });

    if (!endpoint) throw new NotFoundError('Endpoint');
    if (endpoint.project.userId !== req.user!.id) throw new ForbiddenError('Access denied');

    const changes = await prisma.contractChange.findMany({
      where: { contract: { endpointId } },
      orderBy: { detectedAt: 'desc' },
      include: { contract: true },
      take: 50,
    });

    res.json({ success: true, data: changes });
  }),
};
