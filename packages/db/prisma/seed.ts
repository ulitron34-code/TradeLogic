import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const db = new PrismaClient();
const userId = '00000000-0000-4000-8000-000000000001';
const organizationId = '00000000-0000-4000-8000-000000000010';
const validFrom = new Date('2026-01-01T00:00:00.000Z');

const FALLBACK_TARIFF_CODES = [
  { countryCode: 'MX', code: '3926.90.99', nico: '99', description: 'Las demas manufacturas de plastico y articulos de polimeros no expresados ni comprendidos en otra parte.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
  { countryCode: 'MX', code: '7318.15.99', nico: '99', description: 'Tornillos, pernos y articulos similares de hierro o acero, incluso con sus tuercas y arandelas.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
  { countryCode: 'MX', code: '8504.40.99', nico: '99', description: 'Convertidores electricos estaticos, modulos electronicos de potencia y fuentes de alimentacion.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
  { countryCode: 'MX', code: '8536.50.99', nico: '99', description: 'Interruptores, conectores, sensores y aparatos electricos para corte o conexion de circuitos.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
  { countryCode: 'MX', code: '6204.62.99', nico: '99', description: 'Prendas textiles para mujer o nina de algodon, pantalones y articulos similares.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
  { countryCode: 'MX', code: '9026.20.99', nico: '99', description: 'Instrumentos y aparatos para medida o control de presion de liquidos o gases.', validFrom, sourceVersion: 'LIGIE-MX-2026-seed' },
];

async function loadTariffCodesFromCorpus(): Promise<Array<{ countryCode: string; code: string; nico: string; description: string; validFrom: Date; sourceVersion: string }>> {
  const candidatePaths = [
    path.resolve('data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv'),
    path.resolve('E:/ADUANA/MVP_Tecnico/data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv'),
  ];
  for (const candidate of candidatePaths) {
    try {
      const content = await readFile(candidate, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) continue;
      const header = lines[0].split(',');
      const codeIdx = header.findIndex(h => h.trim() === 'code');
      const nicoIdx = header.findIndex(h => h.trim() === 'nico');
      const descIdx = header.findIndex(h => h.trim() === 'description');
      const validFromIdx = header.findIndex(h => h.trim() === 'validFrom');
      const sourceVersionIdx = header.findIndex(h => h.trim() === 'sourceVersion');
      if (codeIdx < 0 || descIdx < 0) continue;
      const records: Array<{ countryCode: string; code: string; nico: string; description: string; validFrom: Date; sourceVersion: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]!.split(',');
        const code = cols[codeIdx]?.trim();
        const description = cols[descIdx]?.trim();
        if (!code || !description) continue;
        const validFromRaw = cols[validFromIdx]?.trim() || '2026-01-01T00:00:00.000Z';
        records.push({
          countryCode: 'MX',
          code,
          nico: cols[nicoIdx]?.trim() || '',
          description,
          validFrom: new Date(validFromRaw),
          sourceVersion: cols[sourceVersionIdx]?.trim() || 'LIGIE-MX-2026-corpus',
        });
      }
      if (records.length > 0) {
        console.log(`seed: loaded ${records.length} tariff codes from corpus CSV`);
        return records;
      }
    } catch {
      // ignore and try next path
    }
  }
  console.log('seed: corpus CSV not found, using fallback tariff codes');
  return FALLBACK_TARIFF_CODES.map(c => ({ ...c, validFrom: new Date(c.validFrom) }));
}

async function main(){
  const user=await db.user.upsert({where:{id:userId},update:{},create:{id:userId,email:'owner@example.local',displayName:'Owner local'}});
  const org=await db.organization.upsert({where:{id:organizationId},update:{},create:{id:organizationId,name:'Organizacion piloto',type:'IMPORTER'}});
  await db.membership.upsert({
    where:{userId_organizationId:{userId:user.id,organizationId:org.id}},
    update:{role:'OWNER'},
    create:{userId:user.id,organizationId:org.id,role:'OWNER'}
  });

  const tariffCodes = await loadTariffCodesFromCorpus();
  await db.tariffCode.createMany({
    skipDuplicates: true,
    data: tariffCodes,
  });
  console.log(`seed: inserted ${tariffCodes.length} tariff codes`);

  await seedRegulatoryRequirementsFromCorpus();
}

async function seedRegulatoryRequirementsFromCorpus() {
  const candidatePaths = [
    path.resolve('corpus/senasica/regulatory-catalog.csv'),
    path.resolve('E:/ADUANA/MVP_Tecnico/corpus/senasica/regulatory-catalog.csv'),
  ];
  for (const candidate of candidatePaths) {
    try {
      const content = await readFile(candidate, 'utf8');
      const { parseRegulatoryCatalogCsv, validateRegulatoryCatalog } = await import('@platform/domain');
      const { persistRegulatoryCatalog } = await import('@platform/db');
      const records = parseRegulatoryCatalogCsv(content, { sourceVersion: 'SENASICA-CORPUS-SEED' });
      const validation = validateRegulatoryCatalog(records, { requireOfficialSource: false });
      if (validation.errors.length > 0) {
        console.log(`seed: regulatory catalog validation errors: ${validation.errors.slice(0, 5).join('; ')}...`);
        continue;
      }
      const result = await persistRegulatoryCatalog(db, validation.records.map(record => ({ ...record, authority: record.authority as import('@prisma/client').SourceAuthority })));
      console.log(`seed: inserted ${result.inserted} regulatory requirements from corpus`);
      return;
    } catch {
      // try next path
    }
  }
  console.log('seed: no regulatory catalog CSV found in corpus');
}
main().finally(()=>db.$disconnect());