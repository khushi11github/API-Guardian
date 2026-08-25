import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  AssertionResult,
  AssertionType,
  AssertionOperator,
  Assertion,
  TestRunStatus,
} from '../types/index.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface AssertionInput {
  statusCode: number | null;
  responseTimeMs: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string>;
}

function getJsonField(body: string | null, field: string): unknown {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body);
    const parts = field.split('.');
    let current: unknown = parsed;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  } catch {
    return undefined;
  }
}

function compare(actual: unknown, operator: AssertionOperator, expected: string): boolean {
  const expectedNum = parseFloat(expected);
  const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));

  switch (operator) {
    case 'EQUALS':
      // Try numeric comparison, fallback to string
      if (!isNaN(expectedNum) && !isNaN(actualNum)) {
        return actualNum === expectedNum;
      }
      return String(actual) === expected;

    case 'NOT_EQUALS':
      if (!isNaN(expectedNum) && !isNaN(actualNum)) {
        return actualNum !== expectedNum;
      }
      return String(actual) !== expected;

    case 'LESS_THAN':
      return actualNum < expectedNum;

    case 'GREATER_THAN':
      return actualNum > expectedNum;

    case 'LESS_THAN_OR_EQUAL':
      return actualNum <= expectedNum;

    case 'GREATER_THAN_OR_EQUAL':
      return actualNum >= expectedNum;

    case 'CONTAINS':
      return String(actual).includes(expected);

    case 'NOT_CONTAINS':
      return !String(actual).includes(expected);

    case 'EXISTS':
      return actual !== undefined && actual !== null;

    case 'NOT_EXISTS':
      return actual === undefined || actual === null;

    case 'MATCHES_SCHEMA':
      // Expected is a JSON schema string
      try {
        const schema = JSON.parse(expected);
        const validate = ajv.compile(schema);
        return validate(actual) as boolean;
      } catch {
        return false;
      }

    default:
      return false;
  }
}

export function evaluateAssertion(
  assertion: {
    type: AssertionType;
    field?: string | null;
    operator: AssertionOperator;
    expected: string;
    id?: string;
  },
  input: AssertionInput,
): AssertionResult {
  let actual: unknown;
  let passed = false;
  let message = '';

  try {
    switch (assertion.type) {
      case 'STATUS_CODE': {
        actual = input.statusCode;
        passed = compare(actual, assertion.operator, assertion.expected);
        message = passed
          ? `Status code ${actual} ${assertion.operator.toLowerCase()} ${assertion.expected}`
          : `Expected status ${assertion.operator.toLowerCase()} ${assertion.expected}, got ${actual}`;
        break;
      }

      case 'RESPONSE_TIME': {
        actual = input.responseTimeMs;
        passed = compare(actual, assertion.operator, assertion.expected);
        message = passed
          ? `Response time ${actual}ms ${assertion.operator.toLowerCase()} ${assertion.expected}ms`
          : `Expected response time ${assertion.operator.toLowerCase()} ${assertion.expected}ms, got ${actual}ms`;
        break;
      }

      case 'JSON_FIELD': {
        if (!assertion.field) {
          return {
            assertionId: assertion.id,
            type: assertion.type,
            operator: assertion.operator,
            expected: assertion.expected,
            actual: 'undefined',
            passed: false,
            message: 'JSON_FIELD assertion requires a field path',
          };
        }
        actual = getJsonField(input.responseBody, assertion.field);
        passed = compare(actual, assertion.operator, assertion.expected);
        message = passed
          ? `Field "${assertion.field}" (${JSON.stringify(actual)}) ${assertion.operator.toLowerCase()} "${assertion.expected}"`
          : `Field "${assertion.field}" expected ${assertion.operator.toLowerCase()} "${assertion.expected}", got ${JSON.stringify(actual)}`;
        break;
      }

      case 'JSON_SCHEMA': {
        if (!input.responseBody) {
          passed = false;
          message = 'Response body is empty, cannot validate schema';
          actual = null;
          break;
        }
        try {
          const schema = JSON.parse(assertion.expected);
          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(input.responseBody);
          } catch {
            passed = false;
            message = 'Response body is not valid JSON';
            actual = input.responseBody;
            break;
          }
          const validate = ajv.compile(schema);
          const valid = validate(parsedBody);
          passed = valid as boolean;
          actual = parsedBody;
          if (passed) {
            message = 'Response body matches JSON schema';
          } else {
            const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ');
            message = `Schema validation failed: ${errors}`;
          }
        } catch (e) {
          passed = false;
          message = `Invalid JSON schema: ${(e as Error).message}`;
          actual = assertion.expected;
        }
        break;
      }

      case 'HEADER': {
        if (!assertion.field) {
          return {
            assertionId: assertion.id,
            type: assertion.type,
            operator: assertion.operator,
            expected: assertion.expected,
            actual: 'undefined',
            passed: false,
            message: 'HEADER assertion requires a header name in the field',
          };
        }
        const headerName = assertion.field.toLowerCase();
        actual = Object.entries(input.responseHeaders).find(
          ([k]) => k.toLowerCase() === headerName,
        )?.[1];
        passed = compare(actual, assertion.operator, assertion.expected);
        message = passed
          ? `Header "${assertion.field}" (${actual}) ${assertion.operator.toLowerCase()} "${assertion.expected}"`
          : `Header "${assertion.field}" expected ${assertion.operator.toLowerCase()} "${assertion.expected}", got "${actual}"`;
        break;
      }

      case 'BODY_CONTAINS': {
        actual = input.responseBody ?? '';
        passed = String(actual).includes(assertion.expected);
        message = passed
          ? `Response body contains "${assertion.expected}"`
          : `Response body does not contain "${assertion.expected}"`;
        break;
      }

      case 'BODY_NOT_CONTAINS': {
        actual = input.responseBody ?? '';
        passed = !String(actual).includes(assertion.expected);
        message = passed
          ? `Response body does not contain "${assertion.expected}"`
          : `Response body contains "${assertion.expected}" (expected it not to)`;
        break;
      }

      default:
        passed = false;
        message = `Unknown assertion type: ${assertion.type}`;
        actual = 'unknown';
    }
  } catch (err) {
    passed = false;
    message = `Assertion evaluation error: ${(err as Error).message}`;
    actual = 'error';
  }

  return {
    assertionId: assertion.id,
    type: assertion.type,
    field: assertion.field ?? undefined,
    operator: assertion.operator,
    expected: assertion.expected,
    actual: JSON.stringify(actual),
    passed,
    message,
  };
}

export function evaluateAllAssertions(
  assertions: Array<{
    id?: string;
    type: AssertionType;
    field?: string | null;
    operator: AssertionOperator;
    expected: string;
  }>,
  input: AssertionInput,
): { results: AssertionResult[]; allPassed: boolean } {
  const results = assertions.map(a => evaluateAssertion(a, input));
  const allPassed = results.every(r => r.passed);
  return { results, allPassed };
}

export function deriveTestStatus(
  httpError: Error | null,
  timedOut: boolean,
  assertionResults: AssertionResult[],
): TestRunStatus {
  if (timedOut) return 'TIMEOUT';
  if (httpError) return 'ERROR';
  const allPassed = assertionResults.every(r => r.passed);
  return allPassed ? 'PASSED' : 'FAILED';
}
