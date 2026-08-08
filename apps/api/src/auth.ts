import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { env } from '@platform/config';
import { db as defaultDb } from '@platform/db';

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type AuthContext = {
  user: { id: string; email: string; displayName: string };
  organization: {
    id: string;
    name: string;
    type: string;
    taxId: string | null;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  };
  roles: readonly [string];
};

let jwks: JWTVerifyGetKey | undefined;

function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL));
  return jwks;
}

export function extractBearerToken(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  }
  return token;
}

async function verifySupabaseToken(token: string) {
  try {
    return await jwtVerify(token, getJwks(), {
      issuer: new URL('/auth/v1', env.SUPABASE_URL).toString(),
    });
  } catch {
    throw new AuthError(401, 'INVALID_TOKEN', 'Token verification failed');
  }
}

// El id de auth.users de Supabase es la clave estable; el email puede cambiar,
// asi que el join preferido es por authUserId y el email solo sirve para
// vincular la primera vez (p.ej. usuarios creados por el seed local).
async function findOrProvisionUser(db: typeof defaultDb, authUserId: string, email: string) {
  const byAuthId = await db.user.findUnique({ where: { authUserId } });
  if (byAuthId) return byAuthId;

  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    return db.user.update({ where: { id: byEmail.id }, data: { authUserId } });
  }

  return db.user.create({ data: { authUserId, email, displayName: email.split('@')[0] ?? email } });
}

export async function resolveAuthContext(
  authorizationHeader: string | undefined,
  db: typeof defaultDb = defaultDb,
): Promise<AuthContext> {
  const token = extractBearerToken(authorizationHeader);
  const { payload } = await verifySupabaseToken(token);

  const authUserId = typeof payload.sub === 'string' ? payload.sub : undefined;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  if (!authUserId || !email) {
    throw new AuthError(401, 'INVALID_TOKEN', 'Token is missing subject or email claims');
  }

  const user = await findOrProvisionUser(db, authUserId, email);

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!membership) {
    throw new AuthError(403, 'NO_ORGANIZATION_MEMBERSHIP', 'User has no organization membership');
  }

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    organization: membership.organization,
    roles: [membership.role] as const,
  };
}
