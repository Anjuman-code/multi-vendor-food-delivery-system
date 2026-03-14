declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: "development" | "production" | "test";
    MONGODB_URI?: string;

    JWT_ACCESS_SECRET?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_ACCESS_EXPIRY?: string;
    JWT_REFRESH_EXPIRY?: string;

    BCRYPT_ROUNDS?: string;
    MAX_LOGIN_ATTEMPTS?: string;
    ACCOUNT_LOCK_DURATION?: string;
    PASSWORD_RESET_EXPIRY?: string;
    EMAIL_VERIFICATION_EXPIRY?: string;

    EMAIL_ADDRESS?: string;
    EMAIL_PASSWORD?: string;

    FRONTEND_URL?: string;

    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    CLOUDINARY_FOLDER?: string;
  }
}
