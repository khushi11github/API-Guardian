import { ContractDiffResult, ContractChangeType, IncidentSeverity } from '../types/index.js';

// ─── Types ────────────────────────────────────────────────────
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

interface SchemaShape {
  [field: string]: string; // field -> type string
}

// ─── Utilities ────────────────────────────────────────────────
function getType(value: JsonValue): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function flattenObject(obj: JsonValue, prefix = ''): SchemaShape {
  const result: SchemaShape = {};

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    result[prefix || 'root'] = getType(obj);
    return result;
  }

  for (const [key, value] of Object.entries(obj as JsonObject)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = getType(value);
    }
  }

  return result;
}

function severity(changeType: ContractChangeType): IncidentSeverity {
  switch (changeType) {
    case 'FIELD_REMOVED':
      return 'HIGH';
    case 'TYPE_CHANGED':
      return 'HIGH';
    case 'STATUS_CODE_CHANGED':
      return 'CRITICAL';
    case 'REQUIRED_FIELD_MISSING':
      return 'CRITICAL';
    case 'FIELD_ADDED':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

// ─── Main differ ─────────────────────────────────────────────
export function diffJsonResponses(
  previous: string | null,
  current: string | null,
  previousStatusCode?: number,
  currentStatusCode?: number,
): ContractDiffResult {
  const changes: ContractDiffResult['changes'] = [];

  // Status code change
  if (
    previousStatusCode !== undefined &&
    currentStatusCode !== undefined &&
    previousStatusCode !== currentStatusCode
  ) {
    changes.push({
      field: '__statusCode',
      changeType: 'STATUS_CODE_CHANGED',
      previousValue: String(previousStatusCode),
      currentValue: String(currentStatusCode),
      severity: severity('STATUS_CODE_CHANGED'),
    });
  }

  let prevObj: JsonValue | null = null;
  let currObj: JsonValue | null = null;

  try {
    if (previous) prevObj = JSON.parse(previous);
  } catch {
    // Not JSON — skip body comparison
  }

  try {
    if (current) currObj = JSON.parse(current);
  } catch {
    // Not JSON — skip body comparison
  }

  if (prevObj === null && currObj === null) {
    return { hasChanges: changes.length > 0, changes };
  }

  const prevShape = prevObj !== null ? flattenObject(prevObj) : {};
  const currShape = currObj !== null ? flattenObject(currObj) : {};

  const allFields = new Set([...Object.keys(prevShape), ...Object.keys(currShape)]);

  for (const field of allFields) {
    const prevType = prevShape[field];
    const currType = currShape[field];

    if (prevType !== undefined && currType === undefined) {
      changes.push({
        field,
        changeType: 'FIELD_REMOVED',
        previousValue: prevType,
        currentValue: null,
        severity: severity('FIELD_REMOVED'),
      });
    } else if (prevType === undefined && currType !== undefined) {
      changes.push({
        field,
        changeType: 'FIELD_ADDED',
        previousValue: null,
        currentValue: currType,
        severity: severity('FIELD_ADDED'),
      });
    } else if (prevType !== currType) {
      changes.push({
        field,
        changeType: 'TYPE_CHANGED',
        previousValue: prevType,
        currentValue: currType,
        severity: severity('TYPE_CHANGED'),
      });
    }
  }

  return { hasChanges: changes.length > 0, changes };
}

/**
 * Diff an observed response against an OpenAPI schema.
 * Checks that all required fields are present and types match.
 */
export function diffAgainstOpenApiSchema(
  schema: Record<string, unknown>,
  responseBody: string | null,
): ContractDiffResult {
  const changes: ContractDiffResult['changes'] = [];

  let parsed: JsonValue | null = null;
  try {
    if (responseBody) parsed = JSON.parse(responseBody);
  } catch {
    return {
      hasChanges: false,
      changes: [],
    };
  }

  if (!schema.properties || typeof schema.properties !== 'object') {
    return { hasChanges: false, changes: [] };
  }

  const properties = schema.properties as Record<string, { type?: string }>;
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];

  const body = parsed as JsonObject | null;

  for (const [field, def] of Object.entries(properties)) {
    const actualValue = body?.[field];
    const isPresent = body !== null && field in body;

    if (!isPresent && required.includes(field)) {
      changes.push({
        field,
        changeType: 'REQUIRED_FIELD_MISSING',
        previousValue: def.type ?? 'unknown',
        currentValue: null,
        severity: severity('REQUIRED_FIELD_MISSING'),
      });
      continue;
    }

    if (isPresent && def.type) {
      const actualType = getType(actualValue as JsonValue);
      const expectedType = def.type.toLowerCase();
      // OpenAPI uses "integer"/"number" — normalise
      const normActual = actualType === 'number' ? (Number.isInteger(actualValue) ? 'integer' : 'number') : actualType;
      if (normActual !== expectedType && !(expectedType === 'number' && normActual === 'integer')) {
        changes.push({
          field,
          changeType: 'TYPE_CHANGED',
          previousValue: expectedType,
          currentValue: actualType,
          severity: severity('TYPE_CHANGED'),
        });
      }
    }
  }

  return { hasChanges: changes.length > 0, changes };
}
