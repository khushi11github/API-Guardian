import prisma from '../prisma/client.js';
import { testRunner } from '@api-guardian/shared';
import { diffJsonResponses, diffAgainstOpenApiSchema } from '@api-guardian/shared';
import { logger } from '../lib/logger.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { incidentService } from './incident.service.js';
import { logService } from './log.service.js';
import {
  TestRun,
  TestRunStatus,
  EndpointHeader,
  EndpointParameter,
  AssertionType,
  AssertionOperator,
} from '@api-guardian/shared';
import { Prisma } from '@prisma/client';

export class TestingService {
  async runTest(
    userId: string,
    endpointId: string,
    triggeredBy: 'MANUAL' | 'SCHEDULER' = 'MANUAL',
  ): Promise<TestRun> {
    // Load endpoint with project ownership check
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        assertions: { where: { isActive: true } },
        project: { select: { userId: true, baseUrl: true, id: true } },
      },
    });

    if (!endpoint) throw new NotFoundError('Endpoint');
    if (triggeredBy === 'MANUAL' && endpoint.project.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const result = await testRunner.run({
      method: endpoint.method as any,
      baseUrl: endpoint.project.baseUrl,
      path: endpoint.path,
      headers: endpoint.headers as unknown as EndpointHeader[],
      parameters: endpoint.parameters as unknown as EndpointParameter[],
      body: endpoint.body,
      timeoutMs: endpoint.timeoutMs,
      authType: endpoint.authType as any,
      authConfig: endpoint.authConfig,
      expectedStatusCode: endpoint.expectedStatusCode,
      assertions: endpoint.assertions.map(a => ({
        id: a.id,
        type: a.type as AssertionType,
        field: a.field,
        operator: a.operator as AssertionOperator,
        expected: a.expected,
      })),
    });

    // Persist result
    const testRun = await prisma.testRun.create({
      data: {
        endpointId,
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        responseBody: result.responseBody,
        responseHeaders: result.responseHeaders as unknown as Prisma.InputJsonValue,
        errorMessage: result.errorMessage,
        assertionResults: result.assertionResults as unknown as Prisma.InputJsonValue,
        triggeredBy,
      },
    });

    // Log test run
    await logService.log({
      projectId: endpoint.project.id,
      endpointId,
      level: result.status === 'PASSED' ? 'INFO' : 'ERROR',
      service: 'testing-engine',
      message: `Test run ${result.status}: ${endpoint.method} ${endpoint.path}`,
      metadata: {
        testRunId: testRun.id,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        triggeredBy,
      },
    });

    // Contract monitoring — compare with last successful response
    if (result.status === 'PASSED' && result.responseBody) {
      await this.checkContractChanges(endpoint, result.responseBody, result.statusCode);
    }

    // Incident management
    if (result.status !== 'PASSED') {
      await incidentService.handleFailure(
        endpointId,
        endpoint.project.id,
        endpoint.project.userId,
        result,
        testRun.id,
      );
    } else {
      await incidentService.handleRecovery(endpointId, endpoint.project.id);
    }

    return testRun as unknown as TestRun;
  }

  async getResults(
    userId: string,
    endpointId: string,
    options: { page?: number; pageSize?: number; status?: TestRunStatus } = {},
  ) {
    const { page = 1, pageSize = 20, status } = options;

    // Verify ownership
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: { project: { select: { userId: true } } },
    });
    if (!endpoint) throw new NotFoundError('Endpoint');
    if (endpoint.project.userId !== userId) throw new ForbiddenError('Access denied');

    const where: Prisma.TestRunWhereInput = {
      endpointId,
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      prisma.testRun.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.testRun.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getLatestResult(endpointId: string): Promise<TestRun | null> {
    const run = await prisma.testRun.findFirst({
      where: { endpointId },
      orderBy: { timestamp: 'desc' },
    });
    return run as unknown as TestRun | null;
  }

  private async checkContractChanges(
    endpoint: { id: string; project: { id: string }; expectedSchema: string | null },
    responseBody: string,
    statusCode: number | null,
  ): Promise<void> {
    try {
      // Get the last contract baseline
      const lastContract = await prisma.apiContract.findFirst({
        where: { endpointId: endpoint.id, isBaseline: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastContract) {
        // First successful response — create baseline
        await prisma.apiContract.create({
          data: {
            endpointId: endpoint.id,
            spec: responseBody,
            specType: 'JSON_SCHEMA',
            version: '1',
            isBaseline: true,
          },
        });
        return;
      }

      // Diff against baseline
      const diff = diffJsonResponses(
        lastContract.spec,
        responseBody,
        undefined,
        statusCode ?? undefined,
      );

      if (diff.hasChanges) {
        // Save new contract version
        const newContract = await prisma.apiContract.create({
          data: {
            endpointId: endpoint.id,
            spec: responseBody,
            specType: 'JSON_SCHEMA',
            version: String(parseInt(lastContract.version) + 1),
            isBaseline: false,
          },
        });

        // Record each change
        for (const change of diff.changes) {
          await prisma.contractChange.create({
            data: {
              contractId: newContract.id,
              field: change.field,
              changeType: change.changeType,
              previousValue: change.previousValue,
              currentValue: change.currentValue,
              severity: change.severity,
            },
          });
        }

        logger.info(`Contract changes detected for endpoint ${endpoint.id}`, {
          changes: diff.changes.length,
        });
      }

      // Also validate against expected OpenAPI schema if provided
      if (endpoint.expectedSchema) {
        try {
          const schema = JSON.parse(endpoint.expectedSchema);
          const schemaDiff = diffAgainstOpenApiSchema(schema, responseBody);
          if (schemaDiff.hasChanges) {
            logger.warn(`Schema validation failures for endpoint ${endpoint.id}`, {
              changes: schemaDiff.changes,
            });
          }
        } catch {
          // Ignore schema parse errors
        }
      }
    } catch (err) {
      logger.error('Contract check failed', { error: (err as Error).message, endpointId: endpoint.id });
    }
  }
}

export const testingService = new TestingService();
