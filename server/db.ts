

















































import sql, { type IResult, type ISqlTypeFactoryWithNoParams } from "mssql";





type SqlPoolCache = {
  pool: sql.ConnectionPool | null;
  promise: Promise<sql.ConnectionPool> | null;
};

const globalCache = global as typeof globalThis & {
  _sqlServerPool?: SqlPoolCache;
};

const cached: SqlPoolCache = globalCache._sqlServerPool ?? {
  pool: null,
  promise: null,
};

globalCache._sqlServerPool = cached;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function getSqlConfig(): sql.config {
  const connectionString = process.env.SQLSERVER_CONNECTION_STRING?.trim();
  if (connectionString) {
    return {
      connectionString,
      options: {
        encrypt: parseBool(process.env.SQLSERVER_ENCRYPT, true),
        trustServerCertificate: parseBool(
          process.env.SQLSERVER_TRUST_CERT,
          true,
        ),
      },
    };
  }

  const server = process.env.SQLSERVER_HOST?.trim();
  const database = process.env.SQLSERVER_DATABASE?.trim();
  const user = process.env.SQLSERVER_USER?.trim();
  const password = process.env.SQLSERVER_PASSWORD;
  const port = Number(process.env.SQLSERVER_PORT || "1433");

  if (!server || !database) {
    throw new Error(
      "SQL Server is not configured. Set SQLSERVER_CONNECTION_STRING or SQLSERVER_HOST and SQLSERVER_DATABASE.",
    );
  }

  return {
    server,
    database,
    user,
    password,
    port,
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30_000,
    },
    options: {
      encrypt: parseBool(process.env.SQLSERVER_ENCRYPT, true),
      trustServerCertificate: parseBool(process.env.SQLSERVER_TRUST_CERT, true),
      enableArithAbort: true,
    },
  };
}

export async function connectDB(): Promise<sql.ConnectionPool> {
  if (cached.pool) return cached.pool;

  if (!cached.promise) {
    cached.promise = new sql.ConnectionPool(getSqlConfig())
      .connect()
      .then((pool) => {
        cached.pool = pool;
        return pool;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  return cached.promise;
}

export async function closeDB(): Promise<void> {
  if (cached.pool) {
    await cached.pool.close();
  }
  cached.pool = null;
  cached.promise = null;
}

export type SqlParam = {
  name: string;
  type?: ISqlTypeFactoryWithNoParams;
  value: unknown;
};

export async function runQuery<T = unknown>(
  query: string,
  params: SqlParam[] = [],
): Promise<IResult<T>> {
  const pool = await connectDB();
  const request = pool.request();

  for (const param of params) {
    if (param.type) {
      request.input(param.name, param.type, param.value as any);
    } else {
      request.input(param.name, param.value as any);
    }
  }

  return request.query<T>(query);
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await runQuery("SELECT 1 AS ok;");
    return true;
  } catch {
    return false;
  }
}

export { sql };
