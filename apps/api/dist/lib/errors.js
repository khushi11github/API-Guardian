"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
// Express global error handler
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    if (err instanceof AppError && err.isOperational) {
        const response = {
            success: false,
            error: err.message,
            code: err.code,
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // Unexpected errors
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
    });
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errors.js.map