import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  APP_BASE_URL: z.string().url(), API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1), REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.string().default('info')
});
export const env = schema.parse(process.env);
