export type OfficialSourceAuthority = 'SNICE' | 'COFEPRIS' | 'SENASICA' | 'SEMARNAT' | 'SAT' | 'ANAM' | 'DOF';
export type OfficialSourceDefinition = { authority: OfficialSourceAuthority; key: string; title: string; url: string; scope: 'REGULATORY_CATALOG' | 'ORIGIN_RULES' | 'LEGAL_PUBLICATION' | 'PROCEDURE' };

/** Entry points only. Records still require a source version and effective dates. */
export const OFFICIAL_SOURCE_DEFINITIONS: readonly OfficialSourceDefinition[] = [
  { authority: 'SNICE', key: 'tigie-compendium', title: 'Compendio de Regulaciones de la TIGIE', url: 'https://www.snice.gob.mx/cs/avi/snice/mca.html', scope: 'REGULATORY_CATALOG' },
  { authority: 'SNICE', key: 'nom-catalog', title: 'NOM y Anexo 2.4.1', url: 'https://www.snice.gob.mx/cs/avi/snice/drrnas.noms.acercade.html', scope: 'REGULATORY_CATALOG' },
  { authority: 'SNICE', key: 'origin-calculator', title: 'Calculadora de Origen T-MEC', url: 'https://www.snice.gob.mx/cs/avi/snice/hce.calc.origen2020.html', scope: 'ORIGIN_RULES' },
  { authority: 'SNICE', key: 'origin-agreements', title: 'Tratados y reglas de origen', url: 'https://www.snice.gob.mx/cs/avi/snice/drrnas.origen.acercade.html', scope: 'ORIGIN_RULES' },
  { authority: 'COFEPRIS', key: 'sanitary-import-permit', title: 'Permiso sanitario de importación', url: 'https://www.gob.mx/cofepris/acciones-y-programas/permiso-sanitario-de-importacion-de-productos-y-servicios-tramites', scope: 'PROCEDURE' },
  { authority: 'SENASICA', key: 'import-procedures', title: 'Importación SENASICA', url: 'https://www.gob.mx/senasica/documentos/importacion-111189', scope: 'PROCEDURE' },
  { authority: 'SEMARNAT', key: 'cites-procedure', title: 'Trámite SEMARNAT-08-053', url: 'https://www.gob.mx/semarnat/documentos/tramite-semarnat-08-053', scope: 'PROCEDURE' },
  { authority: 'SAT', key: 'customs-law', title: 'Ley Aduanera', url: 'https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461174790895&ssbinary=true', scope: 'LEGAL_PUBLICATION' },
  { authority: 'ANAM', key: 'temporary-import', title: 'Importación temporal', url: 'https://anam.gob.mx/importacion-temporal/', scope: 'PROCEDURE' },
  { authority: 'DOF', key: 'official-gazette', title: 'Diario Oficial de la Federación', url: 'https://dof.gob.mx/', scope: 'LEGAL_PUBLICATION' },
] as const;
export function findOfficialSource(key: string) { return OFFICIAL_SOURCE_DEFINITIONS.find(source => source.key === key) ?? null; }
