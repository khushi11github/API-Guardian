import { diffJsonResponses, diffAgainstOpenApiSchema } from './differ';

describe('Contract Differ Engine', () => {
  test('detects field type changes', () => {
    const prev = JSON.stringify({ id: 1042, name: 'Sarah' });
    const curr = JSON.stringify({ id: '1042', name: 'Sarah' });

    const diff = diffJsonResponses(prev, curr);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'id',
          changeType: 'TYPE_CHANGED',
          previousValue: 'number',
          currentValue: 'string',
        }),
      ])
    );
  });

  test('detects removed fields', () => {
    const prev = JSON.stringify({ id: 1042, role: 'admin', name: 'Sarah' });
    const curr = JSON.stringify({ id: 1042, name: 'Sarah' });

    const diff = diffJsonResponses(prev, curr);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'role',
          changeType: 'FIELD_REMOVED',
        }),
      ])
    );
  });

  test('detects status code changes', () => {
    const diff = diffJsonResponses(null, null, 200, 500);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '__statusCode',
          changeType: 'STATUS_CODE_CHANGED',
          previousValue: '200',
          currentValue: '500',
        }),
      ])
    );
  });

  test('diffs against OpenAPI schema with required properties', () => {
    const schema = {
      type: 'object',
      required: ['id', 'email', 'name'],
      properties: {
        id: { type: 'integer' },
        email: { type: 'string' },
        name: { type: 'string' },
      },
    };

    const actualMissingEmail = JSON.stringify({
      id: 1042,
      name: 'Sarah',
    });

    const diff = diffAgainstOpenApiSchema(schema, actualMissingEmail);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          changeType: 'REQUIRED_FIELD_MISSING',
        }),
      ])
    );
  });
});
