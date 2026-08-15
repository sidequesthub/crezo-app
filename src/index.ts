import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

if (process.env.VERCEL !== '1') {
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Crezo API running on http://0.0.0.0:${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });
}

export default app;
