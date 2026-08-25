"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("./assertions");
describe('Assertion Evaluation Engine', () => {
    const sampleInput = {
        statusCode: 200,
        responseTimeMs: 145,
        responseBody: JSON.stringify({
            user: {
                id: 1042,
                name: 'Sarah Connor',
                role: 'admin',
                isActive: true,
                tags: ['vip', 'beta'],
            },
        }),
        responseHeaders: {
            'content-type': 'application/json; charset=utf-8',
            'x-request-id': 'req_84920',
        },
    };
    test('evaluates STATUS_CODE assertion correctly', () => {
        const resPass = (0, assertions_1.evaluateAssertion)({ type: 'STATUS_CODE', operator: 'EQUALS', expected: '200' }, sampleInput);
        expect(resPass.passed).toBe(true);
        const resFail = (0, assertions_1.evaluateAssertion)({ type: 'STATUS_CODE', operator: 'EQUALS', expected: '500' }, sampleInput);
        expect(resFail.passed).toBe(false);
    });
    test('evaluates RESPONSE_TIME assertion correctly', () => {
        const resPass = (0, assertions_1.evaluateAssertion)({ type: 'RESPONSE_TIME', operator: 'LESS_THAN', expected: '500' }, sampleInput);
        expect(resPass.passed).toBe(true);
        const resFail = (0, assertions_1.evaluateAssertion)({ type: 'RESPONSE_TIME', operator: 'LESS_THAN', expected: '100' }, sampleInput);
        expect(resFail.passed).toBe(false);
    });
    test('evaluates JSON_FIELD assertion correctly', () => {
        const resPass = (0, assertions_1.evaluateAssertion)({ type: 'JSON_FIELD', field: 'user.name', operator: 'EQUALS', expected: 'Sarah Connor' }, sampleInput);
        expect(resPass.passed).toBe(true);
        const resFieldNum = (0, assertions_1.evaluateAssertion)({ type: 'JSON_FIELD', field: 'user.id', operator: 'EQUALS', expected: '1042' }, sampleInput);
        expect(resFieldNum.passed).toBe(true);
        const resFail = (0, assertions_1.evaluateAssertion)({ type: 'JSON_FIELD', field: 'user.role', operator: 'EQUALS', expected: 'guest' }, sampleInput);
        expect(resFail.passed).toBe(false);
    });
    test('evaluates HEADER assertion correctly', () => {
        const res = (0, assertions_1.evaluateAssertion)({ type: 'HEADER', field: 'content-type', operator: 'CONTAINS', expected: 'application/json' }, sampleInput);
        expect(res.passed).toBe(true);
    });
    test('evaluates BODY_CONTAINS assertion correctly', () => {
        const resPass = (0, assertions_1.evaluateAssertion)({ type: 'BODY_CONTAINS', operator: 'CONTAINS', expected: 'Sarah Connor' }, sampleInput);
        expect(resPass.passed).toBe(true);
        const resFail = (0, assertions_1.evaluateAssertion)({ type: 'BODY_CONTAINS', operator: 'CONTAINS', expected: 'Terminator' }, sampleInput);
        expect(resFail.passed).toBe(false);
    });
    test('evaluates JSON_SCHEMA assertion correctly', () => {
        const validSchema = JSON.stringify({
            type: 'object',
            required: ['user'],
            properties: {
                user: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                    },
                },
            },
        });
        const res = (0, assertions_1.evaluateAssertion)({ type: 'JSON_SCHEMA', operator: 'MATCHES_SCHEMA', expected: validSchema }, sampleInput);
        expect(res.passed).toBe(true);
    });
});
//# sourceMappingURL=assertions.test.js.map