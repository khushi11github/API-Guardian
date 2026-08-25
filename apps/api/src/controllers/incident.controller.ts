import { Request, Response } from 'express';
import { incidentService } from '../services/incident.service.js';
import { asyncHandler } from '../lib/errors.js';
import { aiService } from '../services/ai.service.js';
import prisma from '../prisma/client.js';
import { AiAnalysisInput } from '@api-guardian/shared';

export const incidentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    const incidents = await incidentService.list(req.user!.id, req.params.projectId, status as any);
    res.json({ success: true, data: incidents });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const incident = await incidentService.getById(req.user!.id, req.params.id);
    res.json({ success: true, data: incident });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const incident = await incidentService.update(req.user!.id, req.params.id, req.body.status);
    res.json({ success: true, data: incident });
  }),

  analyzeWithAi: asyncHandler(async (req: Request, res: Response) => {
    const { testRunId } = req.params;

    // Check for cached analysis
    const cached = await prisma.aiAnalysis.findFirst({
      where: { testRunId },
      orderBy: { createdAt: 'desc' },
    });

    // Load test run + endpoint
    const testRun = await prisma.testRun.findUnique({
      where: { id: testRunId },
      include: {
        endpoint: {
          include: {
            project: { select: { userId: true } },
          },
        },
      },
    });

    if (!testRun) {
      res.status(404).json({ success: false, error: 'Test run not found' });
      return;
    }

    if (testRun.endpoint.project.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (cached && cached.createdAt > new Date(Date.now() - 5 * 60 * 1000)) {
      // Return cached if < 5 minutes old
      res.json({ success: true, data: cached, cached: true });
      return;
    }

    // Get recent history
    const recentHistory = await prisma.testRun.findMany({
      where: { endpointId: testRun.endpointId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { id: true, status: true, statusCode: true, responseTimeMs: true, errorMessage: true, timestamp: true },
    });

    const input: AiAnalysisInput = {
      endpoint: {
        name: testRun.endpoint.name,
        method: testRun.endpoint.method as any,
        path: testRun.endpoint.path,
        expectedStatusCode: testRun.endpoint.expectedStatusCode,
      },
      testRun: {
        status: testRun.status as any,
        statusCode: testRun.statusCode,
        responseTimeMs: testRun.responseTimeMs,
        responseBody: testRun.responseBody,
        responseHeaders: testRun.responseHeaders as Record<string, string>,
        errorMessage: testRun.errorMessage,
        assertionResults: testRun.assertionResults as any,
      },
      recentHistory: recentHistory as any,
      recentFailures: recentHistory.filter(r => r.status !== 'PASSED') as any,
    };

    const output = await aiService.analyze(input);

    // Save analysis
    const analysis = await prisma.aiAnalysis.create({
      data: {
        testRunId,
        summary: output.summary,
        probableCause: output.probableCause,
        confidence: output.confidence,
        evidence: output.evidence,
        suggestedActions: output.suggestedActions,
        severity: output.severity,
        provider: aiService.providerName,
      },
    });

    res.json({ success: true, data: analysis, cached: false });
  }),
};
