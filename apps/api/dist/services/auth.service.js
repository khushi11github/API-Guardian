"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_js_1 = __importDefault(require("../prisma/client.js"));
const errors_js_1 = require("../lib/errors.js");
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
function signAccessToken(userId, email) {
    return jsonwebtoken_1.default.sign({ sub: userId, email }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
function signRefreshToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
}
class AuthService {
    async register(dto) {
        const existing = await client_js_1.default.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        if (existing) {
            throw new errors_js_1.ConflictError('An account with this email already exists');
        }
        const passwordHash = await argon2_1.default.hash(dto.password, {
            type: argon2_1.default.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1,
        });
        const user = await client_js_1.default.user.create({
            data: {
                email: dto.email.toLowerCase().trim(),
                name: dto.name.trim(),
                passwordHash,
            },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        const tokens = {
            accessToken: signAccessToken(user.id, user.email),
            refreshToken: signRefreshToken(user.id),
        };
        return { user, tokens };
    }
    async login(dto) {
        const user = await client_js_1.default.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        if (!user) {
            // Prevent timing attacks — always hash even if user not found
            await argon2_1.default.hash('dummy-password');
            throw new errors_js_1.UnauthorizedError('Invalid email or password');
        }
        const validPassword = await argon2_1.default.verify(user.passwordHash, dto.password);
        if (!validPassword) {
            throw new errors_js_1.UnauthorizedError('Invalid email or password');
        }
        const tokens = {
            accessToken: signAccessToken(user.id, user.email),
            refreshToken: signRefreshToken(user.id),
        };
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
            },
            tokens,
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
            const user = await client_js_1.default.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true },
            });
            if (!user) {
                throw new errors_js_1.UnauthorizedError('User not found');
            }
            return {
                accessToken: signAccessToken(user.id, user.email),
                refreshToken: signRefreshToken(user.id),
            };
        }
        catch (err) {
            if (err instanceof errors_js_1.UnauthorizedError)
                throw err;
            throw new errors_js_1.UnauthorizedError('Invalid refresh token');
        }
    }
    async getProfile(userId) {
        const user = await client_js_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        if (!user)
            throw new errors_js_1.UnauthorizedError('User not found');
        return user;
    }
    async updateProfile(userId, updates) {
        const user = await client_js_1.default.user.update({
            where: { id: userId },
            data: {
                ...(updates.name && { name: updates.name.trim() }),
            },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        return user;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await client_js_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_js_1.UnauthorizedError('User not found');
        const valid = await argon2_1.default.verify(user.passwordHash, currentPassword);
        if (!valid)
            throw new errors_js_1.UnauthorizedError('Current password is incorrect');
        const newHash = await argon2_1.default.hash(newPassword, {
            type: argon2_1.default.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1,
        });
        await client_js_1.default.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map