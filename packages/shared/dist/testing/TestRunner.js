"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRunner = exports.TestRunner = void 0;
const axios_1 = __importDefault(require("axios"));
const ssrf_js_1 = require("./ssrf.js");
const assertions_js_1 = require("./assertions.js");
function buildUrl(baseUrl, path, parameters) {
    // Normalise baseUrl (strip trailing slash) + path (ensure leading slash)
    const base = baseUrl.replace(/\/$/, '');
    const normalPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${normalPath}`;
    if (!parameters || parameters.length === 0)
        return url;
    const params = new URLSearchParams();
    for (const { key, value } of parameters) {
        if (key)
            params.append(key, value);
    }
    return `${url}?${params.toString()}`;
}
function buildHeaders(headers, authType, authConfig) {
    const result = {};
    for (const { key, value } of headers) {
        if (key)
            result[key] = value;
    }
    if (authType === 'BEARER' && authConfig) {
        result['Authorization'] = `Bearer ${authConfig}`;
    }
    else if (authType === 'BASIC' && authConfig) {
        // authConfig expected as "username:password" base64 or raw
        const encoded = Buffer.from(authConfig).toString('base64');
        result['Authorization'] = `Basic ${encoded}`;
    }
    else if (authType === 'API_KEY' && authConfig) {
        // authConfig expected as JSON: { header: "X-API-Key", value: "..." }
        try {
            const parsed = JSON.parse(authConfig);
            if (parsed.header && parsed.value) {
                result[parsed.header] = parsed.value;
            }
        }
        catch {
            // ignore malformed authConfig
        }
    }
    return result;
}
class TestRunner {
    async run(config) {
        const { method, baseUrl, path, headers = [], parameters = [], body, timeoutMs = 30000, authType = 'NONE', authConfig = null, expectedStatusCode = 200, assertions = [], skipSsrfCheck = false, } = config;
        const url = buildUrl(baseUrl, path, parameters);
        const requestHeaders = buildHeaders(headers, authType, authConfig);
        // SSRF protection — validate URL before making any network request
        if (!skipSsrfCheck) {
            const safeCheckUrl = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
            try {
                await (0, ssrf_js_1.assertSafeUrl)(safeCheckUrl);
            }
            catch (err) {
                if (err instanceof ssrf_js_1.SsrfError) {
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
        let responseTimeMs = null;
        let statusCode = null;
        let responseBody = null;
        let responseHeaders = {};
        let errorMessage = null;
        let timedOut = false;
        let httpError = null;
        try {
            const axiosConfig = {
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
                }
                catch {
                    // Not JSON, send as raw string
                    axiosConfig.data = body;
                }
            }
            const response = await (0, axios_1.default)(axiosConfig);
            responseTimeMs = Date.now() - startTime;
            statusCode = response.status;
            // Normalise response headers to Record<string, string>
            for (const [key, value] of Object.entries(response.headers)) {
                if (Array.isArray(value)) {
                    responseHeaders[key] = value.join(', ');
                }
                else if (value !== undefined) {
                    responseHeaders[key] = String(value);
                }
            }
            // Stringify body
            if (typeof response.data === 'object' && response.data !== null) {
                responseBody = JSON.stringify(response.data);
            }
            else if (response.data !== undefined) {
                responseBody = String(response.data);
            }
        }
        catch (err) {
            responseTimeMs = Date.now() - startTime;
            const axiosErr = err;
            if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
                timedOut = true;
                errorMessage = `Request timed out after ${timeoutMs}ms`;
            }
            else {
                httpError = err;
                errorMessage = axiosErr.message ?? 'Unknown request error';
            }
        }
        // Always add a status code assertion if no assertions defined
        const effectiveAssertions = assertions.length > 0
            ? assertions
            : [
                {
                    type: 'STATUS_CODE',
                    operator: 'EQUALS',
                    expected: String(expectedStatusCode),
                },
            ];
        const assertionInput = {
            statusCode,
            responseTimeMs,
            responseBody,
            responseHeaders,
        };
        const { results: assertionResults } = timedOut || httpError
            ? { results: [] }
            : (0, assertions_js_1.evaluateAllAssertions)(effectiveAssertions, assertionInput);
        // Determine status
        let status;
        if (timedOut) {
            status = 'TIMEOUT';
        }
        else if (httpError) {
            status = 'ERROR';
        }
        else if (assertionResults.every(r => r.passed)) {
            status = 'PASSED';
        }
        else {
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
exports.TestRunner = TestRunner;
// Singleton instance
exports.testRunner = new TestRunner();
//# sourceMappingURL=TestRunner.js.map