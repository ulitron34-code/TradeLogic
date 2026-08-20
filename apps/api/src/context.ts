import { env } from '@platform/config';
import { db } from '@platform/db';

export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEV_ORG_ID = '00000000-0000-4000-8000-000000000010';

// Bypass de autenticacion para desarrollo local sin Supabase Auth
// configurado, o para pruebas puntuales sobre un despliegue real con
// ALLOW_DEV_BYPASS_IN_PRODUCTION=true puesto a proposito (temporal, revertir
// despues de la prueba).
export async function ensureDevContext() {
  if (env.NODE_ENV === 'production' && !env.ALLOW_DEV_BYPASS_IN_PRODUCTION) {
    throw new Error('ensureDevContext requires ALLOW_DEV_BYPASS_IN_PRODUCTION=true when NODE_ENV=production');
  }

  const user = await db.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: {
      id: DEV_USER_ID,
      email: 'owner@example.local',
      displayName: 'Owner local',
    },
  });

  const organization = await db.organization.upsert({
    where: { id: DEV_ORG_ID },
    update: {},
    create: {
      id: DEV_ORG_ID,
      name: 'Organizacion piloto',
      type: 'IMPORTER',
    },
  });

  await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  return { user, organization, roles: ['OWNER'] as const };
}