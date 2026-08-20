import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnexo6CatalogCsv, matchAnexo6Criteria } from './anexo6Catalog.js';

const sampleCsv = `criterio_id,fraccion_arancelaria,nico,rubro,criterio_texto,publicacion_dof,vigente
01/2024,8471.30.01,00,"Tabletas electrónicas con módulo celular integrado","Deben clasificarse en la subpartida 8471.30 como máquinas automáticas para tratamiento de datos portátiles y no en la 8517.12 como teléfonos celulares.",2024-01-15,true
02/2024,8504.40.99,99,"Fuentes de poder modulares para servidores de cómputo","Las fuentes de alimentación de corriente continua con conmutación inteligente corresponden a la subpartida 8504.40.",2024-02-20,true`;

test('parses Anexo 6 catalog CSV correctly', () => {
  const records = parseAnexo6CatalogCsv(sampleCsv);
  assert.equal(records.length, 2);
  assert.equal(records[0]?.criterioId, '01/2024');
  assert.equal(records[0]?.tariffCode, '8471.30.01');
  assert.equal(records[0]?.vigente, true);
});

test('detects binding criterion for tablet device in 8471', () => {
  const records = parseAnexo6CatalogCsv(sampleCsv);
  const result = matchAnexo6Criteria('8471.30.01', 'Tableta electrónica con pantalla táctil y ranura sim celular', records);

  assert.equal(result.hasBindingCriterion, true);
  assert.equal(result.criteria.length, 1);
  assert.equal(result.criteria[0]?.criterioId, '01/2024');
});

test('returns no binding criteria for unrelated goods', () => {
  const records = parseAnexo6CatalogCsv(sampleCsv);
  const result = matchAnexo6Criteria('6204.42.01', 'Vestido de algodón para dama', records);

  assert.equal(result.hasBindingCriterion, false);
  assert.equal(result.criteria.length, 0);
});
