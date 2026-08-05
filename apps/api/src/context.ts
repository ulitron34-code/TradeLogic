import { db } from '@platform/db';

export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEV_ORG_ID = '00000000-0000-4000-8000-000000000010';

export async function ensureDevContext() {
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