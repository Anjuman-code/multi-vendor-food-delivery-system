import { createRequire } from 'node:module';
import path from 'node:path';

const backendRequire = createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);

backendRequire('dotenv/config');
const mongoose = backendRequire('mongoose') as typeof import('mongoose');

const ANSI = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

const paint = (color: string, message: string): string =>
  `${color}${message}${ANSI.reset}`;

const resetDatabase = async (): Promise<void> => {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    console.error(paint(ANSI.red, 'MONGODB_URI is not defined in .env'));
    process.exit(1);
  }

  try {
    console.log(paint(ANSI.cyan, 'Connecting to MongoDB...'));
    await mongoose.connect(mongodbUri);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database handle is undefined after connecting.');
    }

    console.log(paint(ANSI.cyan, 'Dropping database...'));
    await db.dropDatabase();

    console.log(paint(ANSI.green, 'Database reset completed.'));
    console.log(
      paint(
        ANSI.yellow,
        `${ANSI.bold}Next step:${ANSI.reset}${ANSI.yellow} run npm run db:seed to repopulate data.`,
      ),
    );
  } catch (error) {
    console.error(paint(ANSI.red, 'Database reset failed.'));
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

void resetDatabase();
