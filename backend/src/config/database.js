import { Sequelize } from 'sequelize';
import configs from './config.cjs';

// Reuse the SAME config file the migration CLI uses, so the app and the
// migrations can never drift apart on credentials or naming conventions.
const env = process.env.NODE_ENV || 'development';
const config = configs[env];

export const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    // Log every SQL statement in development — genuinely useful for learning
    // what Sequelize actually sends to Postgres. Silent in production.
    logging: env === 'development' ? console.log : false,
    define: config.define,
  },
);

/**
 * Opens the connection and fails loudly if the database is unreachable.
 * Better to crash at boot with a clear message than to serve requests that
 * all fail later with confusing errors.
 */
export async function connectDatabase() {
  await sequelize.authenticate();
  console.log(`[db] connected to ${config.database} at ${config.host}:${config.port}`);
}

export default sequelize;
