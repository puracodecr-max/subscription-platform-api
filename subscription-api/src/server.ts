import { env } from './config/env';
import { testDatabaseConnection } from './database/pool';
import { createApp } from './app';

async function bootstrap() {
  if (env.VERIFY_DB_ON_START) {
    await testDatabaseConnection();
    console.info('Database connection verified');
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`Subscription API running on port ${env.PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Subscription API', error);
  process.exit(1);
});
