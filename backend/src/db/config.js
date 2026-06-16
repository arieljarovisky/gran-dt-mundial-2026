import dotenv from 'dotenv';

dotenv.config();

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

export function getDbConfig({ withDatabase = true } = {}) {
  const url =
    process.env.MYSQL_PUBLIC_URL ||
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL;

  let config;

  if (url?.startsWith('mysql://')) {
    config = parseDatabaseUrl(url);
  } else {
    config = {
      host:
        process.env.MYSQLHOST ||
        process.env.DB_HOST ||
        'localhost',
      port: Number(
        process.env.MYSQLPORT ||
          process.env.DB_PORT ||
          3306
      ),
      user:
        process.env.MYSQLUSER ||
        process.env.DB_USER ||
        'root',
      password:
        process.env.MYSQLPASSWORD ||
        process.env.DB_PASSWORD ||
        '',
      database:
        process.env.MYSQLDATABASE ||
        process.env.DB_NAME ||
        'railway',
    };
  }

  if (!withDatabase) {
    const { database: _db, ...withoutDb } = config;
    return applySsl(withoutDb);
  }

  return applySsl(config);
}

function applySsl(config) {
  const isRemote =
    config.host &&
    config.host !== 'localhost' &&
    config.host !== '127.0.0.1';

  const sslEnabled =
    process.env.DB_SSL === 'true' ||
    (isRemote && process.env.DB_SSL !== 'false');

  if (sslEnabled) {
    return { ...config, ssl: { rejectUnauthorized: false } };
  }

  return config;
}

export function getDbName() {
  const url =
    process.env.MYSQL_PUBLIC_URL ||
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL;

  if (url?.startsWith('mysql://')) {
    return parseDatabaseUrl(url).database;
  }

  return (
    process.env.MYSQLDATABASE ||
    process.env.DB_NAME ||
    'railway'
  );
}

export function isRailwayDb() {
  return Boolean(
    process.env.MYSQL_PUBLIC_URL ||
      process.env.MYSQL_URL ||
      process.env.MYSQLHOST ||
      process.env.MYSQLDATABASE
  );
}
