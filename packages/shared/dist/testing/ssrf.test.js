"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ssrf_1 = require("./ssrf");
describe('SSRF Protection Security Engine', () => {
    test('blocks localhost and loopback IPv4', async () => {
        const r1 = await (0, ssrf_1.validateUrlForSsrf)('http://localhost:3000/api');
        expect(r1.safe).toBe(false);
        const r2 = await (0, ssrf_1.validateUrlForSsrf)('http://127.0.0.1:8080/secrets');
        expect(r2.safe).toBe(false);
        const r3 = await (0, ssrf_1.validateUrlForSsrf)('http://127.0.1.1/internal');
        expect(r3.safe).toBe(false);
    });
    test('blocks private RFC 1918 IPv4 ranges', async () => {
        const r10 = await (0, ssrf_1.validateUrlForSsrf)('http://10.0.0.1/admin');
        expect(r10.safe).toBe(false);
        const r172 = await (0, ssrf_1.validateUrlForSsrf)('http://172.16.0.5/metrics');
        expect(r172.safe).toBe(false);
        const r192 = await (0, ssrf_1.validateUrlForSsrf)('http://192.168.1.1/router');
        expect(r192.safe).toBe(false);
    });
    test('blocks cloud metadata endpoints', async () => {
        const rAws = await (0, ssrf_1.validateUrlForSsrf)('http://169.254.169.254/latest/meta-data/');
        expect(rAws.safe).toBe(false);
        const rGcp = await (0, ssrf_1.validateUrlForSsrf)('http://metadata.google.internal/computeMetadata/v1/');
        expect(rGcp.safe).toBe(false);
    });
    test('rejects non-HTTP protocols like file:// or gopher://', async () => {
        const rFile = await (0, ssrf_1.validateUrlForSsrf)('file:///etc/passwd');
        expect(rFile.safe).toBe(false);
        const rGopher = await (0, ssrf_1.validateUrlForSsrf)('gopher://127.0.0.1:70');
        expect(rGopher.safe).toBe(false);
    });
    test('permits public external hostnames', async () => {
        const res = await (0, ssrf_1.validateUrlForSsrf)('https://httpbin.org/get');
        expect(res.safe).toBe(true);
    });
});
//# sourceMappingURL=ssrf.test.js.map