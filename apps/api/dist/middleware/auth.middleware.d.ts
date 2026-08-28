import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
            };
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function authenticateWithUser(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Verifies that the authenticated user owns the given project.
 */
export declare function requireProjectOwnership(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map