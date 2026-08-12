import { buildApp } from './app.js';

const app = await buildApp();
const address = await app.listen({ port: 4000, host: '0.0.0.0' });
console.log('api listening', { address });
