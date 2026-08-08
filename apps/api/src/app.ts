import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { env } from '@platform/config';
import { registerRoutes, type RouteDependencies } from './routes.js';

export async function buildApp(dependencies: RouteDependencies = {}) {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });
  await app.register(sensible);
  await app.register(cors, { origin: env.APP_BASE_URL, credentials: true });
  await registerRoutes(app, dependencies);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message,
      trace_id: request.id,
      retryable: (error.statusCode ?? 500) >= 500,
    });
  });

  return app;
}