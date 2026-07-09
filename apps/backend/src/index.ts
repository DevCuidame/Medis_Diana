import { connectDatabase } from '@config/database';
import { startServer } from './server';
import { log } from '@utils/logger.util';

async function main() {
  try {
    log.info('🔄 Starting medisdiana Backend...');
    await connectDatabase();
    startServer();
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
