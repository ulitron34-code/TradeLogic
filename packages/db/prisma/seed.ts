import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const userId = '00000000-0000-4000-8000-000000000001';
const organizationId = '00000000-0000-4000-8000-000000000010';
async function main(){
  const user=await db.user.upsert({where:{id:userId},update:{},create:{id:userId,email:'owner@example.local',displayName:'Owner local'}});
  const org=await db.organization.upsert({where:{id:organizationId},update:{},create:{id:organizationId,name:'Organizacion piloto',type:'IMPORTER'}});
  await db.membership.upsert({
    where:{userId_organizationId:{userId:user.id,organizationId:org.id}},
    update:{role:'OWNER'},
    create:{userId:user.id,organizationId:org.id,role:'OWNER'}
  });
}
main().finally(()=>db.$disconnect());