import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { assertSafeUrl, SsrfError } from './ssrf.js';
import { evaluateAllAssertions, AssertionInput } from './assertions.js';
import {
  HttpMethod,
  TestRunStatus,
  AssertionResult,
  EndpointHeader,
  EndpointParameter,
  AuthType,
} from '../types/index.js';

export interface TestRunnerConfig {
  method: HttpMethod;
  baseUrl: string;
  path: string;
  headers?: EndpointHeader[];
  parameters?: EndpointParameter[];
  body?: string | null;
  timeoutMs?: number;
  authType?: AuthType;
  authConfig?: string | null;
  expectedStatusCode?: number;
  assertions?: Array<{
    id?: string;
    type: import('../types/index.js').AssertionType;
    field?: string | null;
    operator: import('../types/index.js').AssertionOperator;
    expected: string;
  }>;
  skipSsrfCheck?: boolean; // only used in tests
}

export interface TestRunResult {
  status: TestRunStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string>;
  errorMessage: string | null;
  assertionResults: AssertionResult[];
  requestUrl: string;
  requestMethod: HttpMethod;
}

function buildUrl(baseUrl: string, path: string, parameters: EndpointParameter[]): string {
  // Normalise baseUrl (strip trailing slash) + path (ensure leading slash)
  const base = baseUrl.replace(/\/$/, '');
  const normalPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalPath}`;

  if (!parameters || parameters.length === 0) return url;

  const params = new URLSearchParams();
  for (const { key, value } of parameters) {
    if (key) params.append(key, value);
  }
  return `${url}?${params.toString()}`;
}

function buildHeaders(
  headers: EndpointHeader[],
  authType: AuthType,
  authConfig: string | null,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const { key, value } of headers) {
    if (key) result[key] = value;
  }

  if (authType === 'BEARER' && authConfig) {
    result['Authorization'] = `Bearer ${authConfig}`;
  } else if (authType === 'BASIC' && authConfig) {
    // authConfig expected as "username:password" base64 or raw
    const encoded = Buffer.from(authConfig).toString('base64');
    result['Authorization'] = `Basic ${encoded}`;
  } else if (authType === 'API_KEY' && authConfig) {
    // authConfig expected as JSON: { header: "X-API-Key", value: "..." }
    try {
      const parsed = JSON.parse(authConfig) as { header: string; value: string };
      if (parsed.header && parsed.value) {
        result[parsed.header] = parsed.value;
      }
    } catch {
      // ignore malformed authConfig
    }
  }

  return result;
}

export class TestRunner {
  async run(config: TestRunnerConfig): Promise<TestRunResult> {
    const {
      method,
      baseUrl,
      path,
      headers = [],
      parameters = [],
      body,
      timeoutMs = 30000,
      authType = 'NONE',
      authConfig = null,
      expectedStatusCode = 200,
      assertions = [],
      skipSsrfCheck = false,
    } = config;

    const url = buildUrl(baseUrl, path, parameters);
    const requestHeaders = buildHeaders(headers, authType, authConfig);

    // SSRF protection — validate URL before making any network request
    if (!skipSsrfCheck) {
      const safeCheckUrl = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
      try {
        await assertSafeUrl(safeCheckUrl);
      } catch (err) {
        if (err instanceof SsrfError) {
          return {
            status: 'ERROR',
            statusCode: null,
            responseTimeMs: null,
            responseBody: null,
            responseHeaders: {},
            errorMessage: `SSRF Protection: ${err.message}`,
            assertionResults: [],
            requestUrl: url,
            requestMethod: method,
          };
        }
        throw err;
      }
    }

    const startTime = Date.now();
    let responseTimeMs: number | null = null;
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let responseHeaders: Record<string, string> = {};
    let errorMessage: string | null = null;
    let timedOut = false;
    let httpError: Error | null = null;

    try {
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        headers: requestHeaders,
        timeout: timeoutMs,
        validateStatus: () => true, // Don't throw on non-2xx
        maxRedirects: 5,
        decompress: true,
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          axiosConfig.data = JSON.parse(body);
          if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
            axiosConfig.headers = { ...requestHeaders, 'Content-Type': 'application/json' };
          }
        } catch {
          // Not JSON, send as raw string
          axiosConfig.data = body;
        }
      }

      const response: AxiosResponse = await axios(axiosConfig);
      responseTimeMs = Date.now() - startTime;
      statusCode = response.status;

      // Normalise response headers to Record<string, string>
      for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) {
          responseHeaders[key] = value.join(', ');
        } else if (value !== undefined) {
          responseHeaders[key] = String(value);
        }
      }

      // Stringify body
      if (typeof response.data === 'object' && response.data !== null) {
        responseBody = JSON.stringify(response.data);
      } else if (response.data !== undefined) {
        responseBody = String(response.data);
      }
    } catch (err) {
      responseTimeMs = Date.now() - startTime;
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
        timedOut = true;
        errorMessage = `Request timed out after ${timeoutMs}ms`;
      } else {
        httpError = err as Error;
        errorMessage = axiosErr.message ?? 'Unknown request error';
      }
    }

    // Always add a status code assertion if no assertions defined
    const effectiveAssertions = assertions.length > 0
      ? assertions
      : [
          {
            type: 'STATUS_CODE' as const,
            operator: 'EQUALS' as const,
            expected: String(expectedStatusCode),
          },
        ];

    const assertionInput: AssertionInput = {
      statusCode,
      responseTimeMs,
      responseBody,
      responseHeaders,
    };

    const { results: assertionResults } = timedOut || httpError
      ? { results: [] }
      : evaluateAllAssertions(effectiveAssertions, assertionInput);

    // Determine status
    let status: TestRunStatus;
    if (timedOut) {
      status = 'TIMEOUT';
    } else if (httpError) {
      status = 'ERROR';
    } else if (assertionResults.every(r => r.passed)) {
      status = 'PASSED';
    } else {
      status = 'FAILED';
    }

    return {
      status,
      statusCode,
      responseTimeMs,
      responseBody,
      responseHeaders,
      errorMessage,
      assertionResults,
      requestUrl: url,
      requestMethod: method,
    };
  }
}

// Singleton instance
export const testRunner = new TestRunner();
