import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AuthenticationError } from '../utils/errors';

const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';
export const GOOGLE_OAUTH_NEXT_COOKIE = 'google_oauth_next';

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getGoogleOAuthClient = (): OAuth2Client => {
  return new OAuth2Client(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
    requiredEnv('GOOGLE_REDIRECT_URI'),
  );
};

export const buildGoogleAuthUrl = (state: string): string => {
  const client = getGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: 'online',
    include_granted_scopes: true,
    scope: GOOGLE_OAUTH_SCOPES,
    state,
    prompt: 'select_account',
  });
};

const assertValidGooglePayload = (
  payload: TokenPayload | undefined,
): TokenPayload => {
  if (!payload) {
    throw new AuthenticationError('Google account verification failed');
  }

  const issuer = payload.iss;
  if (
    issuer !== 'accounts.google.com' &&
    issuer !== 'https://accounts.google.com'
  ) {
    throw new AuthenticationError('Invalid Google token issuer');
  }

  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new AuthenticationError('Google token has expired');
  }

  if (!payload.email || !payload.sub) {
    throw new AuthenticationError(
      'Google account is missing required identity fields',
    );
  }

  if (!payload.email_verified) {
    throw new AuthenticationError('Google account email is not verified');
  }

  return payload;
};

export const verifyGoogleAuthorizationCode = async (
  code: string,
): Promise<TokenPayload> => {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new AuthenticationError('Google did not return an ID token');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: requiredEnv('GOOGLE_CLIENT_ID'),
  });

  return assertValidGooglePayload(ticket.getPayload());
};

export const normaliseNextPath = (raw: unknown): string => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return '/';
  }

  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }

  if (raw.length > 256) {
    return '/';
  }

  return raw;
};
