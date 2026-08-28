import { Request, Response } from 'express';
export declare const authController: {
    register: (req: Request, res: Response, next: import("express").NextFunction) => void;
    login: (req: Request, res: Response, next: import("express").NextFunction) => void;
    refresh: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    changePassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
};
//# sourceMappingURL=auth.controller.d.ts.map