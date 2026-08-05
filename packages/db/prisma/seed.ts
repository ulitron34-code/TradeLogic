import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const userId = '00000000-0000-4000-8000-000000000001';
const organizationId = '00000000-0000-4000-8000-000000000010';
const validFrom = new Date('2026-01-01T00:00:00.000Z');

async function main(){
  const user=await db.user.upsert({where:{id:userId},update:{},create:{id:userId,email:'owner@example.local',displayName:'Owner local'}});
  const org=await db.organization.upsert({where:{id:organizationId},update:{},create:{id:organizationId,name:'Organizacion piloto',type:'IMPORTER'}});
  await db.membership.upsert({
    where:{userId_organizationId:{userId:user.id,organizationId:org.id}},
    update:{role:'OWNER'},
    create:{userId:user.id,organizationId:org.id,role:'OWNER'}
  });

  await db.tariffCode.createMany({
    skipDuplicates: true,
    data: [
      {
        countryCode: 'MX',
        code: '3926.90.99',
        nico: '99',
        description: 'Las demas manufacturas de plastico y articulos de polimeros no expresados ni comprendidos en otra parte.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
      {
        countryCode: 'MX',
        code: '7318.15.99',
        nico: '99',
        description: 'Tornillos, pernos y articulos similares de hierro o acero, incluso con sus tuercas y arandelas.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
      {
        countryCode: 'MX',
        code: '8504.40.99',
        nico: '99',
        description: 'Convertidores electricos estaticos, modulos electronicos de potencia y fuentes de alimentacion.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
      {
        countryCode: 'MX',
        code: '8536.50.99',
        nico: '99',
        description: 'Interruptores, conectores, sensores y aparatos electricos para corte o conexion de circuitos.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
      {
        countryCode: 'MX',
        code: '6204.62.99',
        nico: '99',
        description: 'Prendas textiles para mujer o nina de algodon, pantalones y articulos similares.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
      {
        countryCode: 'MX',
        code: '9026.20.99',
        nico: '99',
        description: 'Instrumentos y aparatos para medida o control de presion de liquidos o gases.',
        validFrom,
        sourceVersion: 'LIGIE-MX-2026-seed',
      },
    ],
  });
}
main().finally(()=>db.$disconnect());