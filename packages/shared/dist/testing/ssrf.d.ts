export declare class SsrfError extends Error {
    constructor(message: string);
}
export interface SsrfValidationResult {
    safe: boolean;
    reason?: string;
    resolvedIps?: string[];
}
/**
 * Validates a URL against SSRF threats.
 * - Checks URL scheme (only http/https allowed)
 * - Checks hostname against blocklists
 * - Resolves DNS and validates all resolved IPs
 */
export declare function validateUrlForSsrf(rawUrl: string): Promise<SsrfValidationResult>;
/**
 * Throws SsrfError if the URL fails validation.
 */
export declare function assertSafeUrl(url: string): Promise<void>;
//# sourceMappingURL=ssrf.d.ts.map