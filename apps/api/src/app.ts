import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './lib/errors.js';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import endpointRoutes from './routes/endpoint.routes.js';
import contractRoutes from './routes/contract.routes.js';
import miscRoutes from './routes/misc.routes.js';

export function createApp() {
  const app = express();

  // Security & standard middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check (public)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'api-guardian',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Apply general rate limiter
  app.use('/api', apiRateLimiter);

  // Mount API routers
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/endpoints', endpointRoutes);
  app.use('/api', contractRoutes);
  app.use('/api', miscRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.path}`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
