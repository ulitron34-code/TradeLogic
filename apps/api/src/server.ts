import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { env } from '@platform/config';
import { registerRoutes } from './routes.js';

const app = Fastify({ logger: { level: env.LOG_LEVEL } });
await app.register(sensible);
await app.register(cors, { origin: env.APP_BASE_URL, credentials: true });
await registerRoutes(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(error.statusCode ?? 500).send({
    code: error.code ?? 'INTERNAL_ERROR', message: error.message,
    trace_id: request.id, retryable: (error.statusCode ?? 500) >= 500
  });
});

await app.listen({ port: 4000, host: '0.0.0.0' });