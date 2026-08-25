import { AiAnalysisInput, AiAnalysisOutput, IncidentSeverity } from '@api-guardian/shared';
import { logger } from '../lib/logger.js';

// ─── Provider interface ──────────────────────────────────────
interface AiProvider {
  analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput>;
}

// ─── Mock provider (default, no API key needed) ─────────────
class MockAiProvider implements AiProvider {
  async analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput> {
    const { testRun, endpoint, recentHistory } = input;

    const failedCount = recentHistory.filter(r => r.status !== 'PASSED').length;
    const isRecurring = failedCount > 2;

    let probableCause = '';
    let summary = '';
    let evidence: string[] = [];
    let suggestedActions: string[] = [];
    let severity: IncidentSeverity = 'MEDIUM';
    let confidence = 0.7;

    const sc = testRun.statusCode;

    if (testRun.status === 'TIMEOUT') {
      summary = `${endpoint.method} ${endpoint.path} is timing out consistently.`;
      probableCause = 'The server is taking too long to respond, suggesting resource exhaustion, deadlocks, or slow database queries.';
      evidence = [
        `Request timed out after ${testRun.responseTimeMs}ms`,
        isRecurring ? `This has occurred ${failedCount} times in recent history` : 'This may be a transient issue',
      ];
      suggestedActions = [
        'Check server CPU and memory utilization',
        'Review slow query logs in the database',
        'Look for connection pool exhaustion',
        'Check if a long-running background job is blocking resources',
        'Consider increasing the timeout threshold if this is expected behavior',
      ];
      severity = isRecurring ? 'CRITICAL' : 'HIGH';
      confidence = isRecurring ? 0.85 : 0.65;
    } else if (sc === 500) {
      summary = `Internal server error on ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'An unhandled exception occurred on the server, possibly due to a null reference, database connection issue, or a code regression.';
      evidence = [
        `HTTP 500 status code returned`,
        testRun.errorMessage ? `Error: ${testRun.errorMessage}` : 'No error details in response',
        isRecurring ? `Recurring: failed ${failedCount}/${recentHistory.length} recent checks` : 'Isolated failure',
      ];
      suggestedActions = [
        'Check server error logs for stack traces',
        'Verify database connectivity and connection pool status',
        'Check if a recent deployment introduced a regression',
        'Look for unhandled promise rejections or null dereferences',
        'Review recent code changes to this endpoint',
      ];
      severity = isRecurring ? 'CRITICAL' : 'HIGH';
      confidence = 0.78;
    } else if (sc === 503) {
      summary = `Service unavailable on ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'The service is either overloaded, in a deployment cycle, or a downstream dependency is unreachable.';
      evidence = [
        `HTTP 503 returned`,
        'Service unavailable responses often indicate load balancer issues or service downtime',
      ];
      suggestedActions = [
        'Check if a deployment or restart is in progress',
        'Verify load balancer health checks',
        'Inspect downstream service dependencies',
        'Check infrastructure health dashboards',
      ];
      severity = 'CRITICAL';
      confidence = 0.8;
    } else if (sc === 401 || sc === 403) {
      summary = `Authentication/authorization failure on ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'The request is being rejected due to missing, expired, or insufficient credentials.';
      evidence = [
        `HTTP ${sc} status code`,
        'This could indicate an expired API key, rotated secret, or changed permissions',
      ];
      suggestedActions = [
        'Verify the API key or token is still valid',
        'Check if credentials were recently rotated',
        'Confirm the user/service account has required permissions',
        'Review recent IAM or access control changes',
      ];
      severity = 'HIGH';
      confidence = 0.9;
    } else if (sc === 404) {
      summary = `Endpoint not found: ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'The endpoint path may have changed, been removed, or the base URL is incorrect.';
      evidence = [
        `HTTP 404 returned`,
        `Endpoint path: ${endpoint.path}`,
      ];
      suggestedActions = [
        'Verify the endpoint path matches the current API version',
        'Check if the endpoint was deprecated or removed in a recent release',
        'Confirm the base URL is correct for the target environment',
        'Review API changelog or release notes',
      ];
      severity = 'HIGH';
      confidence = 0.85;
    } else if (testRun.status === 'FAILED') {
      // Assertion failures
      const failedAssertions = testRun.assertionResults.filter(a => !a.passed);
      summary = `${failedAssertions.length} assertion(s) failed on ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'The API response does not match the expected contract, indicating a change in response structure, data, or business logic.';
      evidence = failedAssertions.map(a => `Assertion failed: ${a.message}`);
      suggestedActions = [
        'Review the failing assertion expectations vs actual values',
        'Check if the API response schema changed in a recent deployment',
        'Verify data integrity in the underlying database',
        'Check for feature flags or A/B tests affecting response shape',
      ];
      severity = 'MEDIUM';
      confidence = 0.75;
    } else {
      summary = `Unexpected failure on ${endpoint.method} ${endpoint.path}.`;
      probableCause = 'The cause is unclear from available data.';
      evidence = [];
      suggestedActions = ['Review server logs for more context'];
      severity = 'LOW';
      confidence = 0.4;
    }

    // Simulate AI "thinking time"
    await new Promise(r => setTimeout(r, 300));

    return { summary, probableCause, confidence, evidence, suggestedActions, severity };
  }
}

// ─── OpenAI provider ────────────────────────────────────────
class OpenAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput> {
    const prompt = buildPrompt(input);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert API reliability engineer. Analyze API failures and return structured JSON root-cause analysis.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = json.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content) as AiAnalysisOutput;
  }
}

// ─── Anthropic provider ─────────────────────────────────────
class AnthropicProvider implements AiProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput> {
    const prompt = buildPrompt(input);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
        ],
        system: 'You are an expert API reliability engineer. Analyze API failures and return structured JSON root-cause analysis. Always respond with valid JSON.',
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const json = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = json.content[0]?.text;
    if (!text) throw new Error('Empty response from Anthropic');

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Anthropic response');

    return JSON.parse(jsonMatch[0]) as AiAnalysisOutput;
  }
}

// ─── Prompt builder ─────────────────────────────────────────
function buildPrompt(input: AiAnalysisInput): string {
  return `Analyze this API failure and return a JSON root-cause analysis.

ENDPOINT: ${input.endpoint.method} ${input.endpoint.path}
EXPECTED STATUS: ${input.endpoint.expectedStatusCode}
ACTUAL STATUS: ${input.testRun.statusCode ?? 'N/A'}
RESULT: ${input.testRun.status}
RESPONSE TIME: ${input.testRun.responseTimeMs}ms
ERROR: ${input.testRun.errorMessage ?? 'none'}
RESPONSE BODY (first 500 chars): ${input.testRun.responseBody?.slice(0, 500) ?? 'empty'}
FAILED ASSERTIONS: ${JSON.stringify(input.testRun.assertionResults.filter(a => !a.passed))}
RECENT HISTORY (last 10): ${JSON.stringify(input.recentHistory.map(r => ({ status: r.status, statusCode: r.statusCode, responseTimeMs: r.responseTimeMs })))}

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief one-sentence description of the failure",
  "probableCause": "Detailed explanation of what likely caused the failure",
  "confidence": 0.85,
  "evidence": ["Evidence point 1", "Evidence point 2"],
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "severity": "HIGH"
}

severity must be one of: LOW, MEDIUM, HIGH, CRITICAL
confidence must be between 0 and 1`;
}

// ─── Factory ────────────────────────────────────────────────
function createProvider(): { provider: AiProvider; name: string } {
  const aiProvider = process.env.AI_PROVIDER ?? 'mock';

  switch (aiProvider.toLowerCase()) {
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        logger.warn('OPENAI_API_KEY not set, falling back to mock provider');
        return { provider: new MockAiProvider(), name: 'mock' };
      }
      return { provider: new OpenAiProvider(key), name: 'openai' };
    }
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        logger.warn('ANTHROPIC_API_KEY not set, falling back to mock provider');
        return { provider: new MockAiProvider(), name: 'mock' };
      }
      return { provider: new AnthropicProvider(key), name: 'anthropic' };
    }
    case 'mock':
    default:
      return { provider: new MockAiProvider(), name: 'mock' };
  }
}

// ─── AI Service (main export) ────────────────────────────────
class AIService {
  private readonly providerInstance: AiProvider;
  public readonly providerName: string;

  constructor() {
    const { provider, name } = createProvider();
    this.providerInstance = provider;
    this.providerName = name;
  }

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisOutput> {
    logger.info(`Running AI analysis with provider: ${this.providerName}`);
    return this.providerInstance.analyze(input);
  }
}

export const aiService = new AIService();
