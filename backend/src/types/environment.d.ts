declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    MONGODB_URI?: string;
    JWT_SECRET?: string;
    JWT_EXPIRE?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_REFRESH_EXPIRE?: string;
    NODE_ENV?: "development" | "production" | "test";
  }
}
