"""Generador enriquecido del Manual de Usuario y Guía Operativa de NUXERA con el Corpus de Identidad y Listas Negras (OFAC, SAT 69-B, PPE, ONU, UE, OpenSanctions).

Compila el documento HTML integral a PDF vectorial usando Microsoft Edge headless.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

NUXERA_ENRICHED_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>NUXERA — Manual de Usuario y Guía Operativa Integral</title>
<style>
  @page {
    size: letter;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-right {
      content: "Página " counter(page);
      font-size: 8.5pt;
      color: #64748b;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    @bottom-left {
      content: "NUXERA — Manual de Usuario y Guía Operativa v1.1 (Con Corpus de Identidad & Sanciones)";
      font-size: 8.5pt;
      color: #64748b;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
  }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 9.8pt;
    margin: 0;
    padding: 0;
  }

  /* Portada */
  .cover {
    page-break-after: always;
    padding-top: 35px;
    text-align: center;
  }
  .cover-badge {
    display: inline-block;
    background: #0f172a;
    color: #f8fafc;
    font-size: 8.5pt;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 999px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .cover-title {
    font-size: 29pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 10px 0;
  }
  .cover-subtitle {
    font-size: 12.5pt;
    color: #475569;
    max-width: 620px;
    margin: 0 auto 25px auto;
    font-weight: 400;
  }
  .cover-divider {
    width: 80px;
    height: 4px;
    background: #0f172a;
    margin: 0 auto 30px auto;
    border-radius: 2px;
  }
  .cover-meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 22px;
    max-width: 540px;
    margin: 0 auto 35px auto;
    text-align: left;
  }
  .cover-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 9pt;
  }
  .cover-meta-item strong {
    display: block;
    color: #0f172a;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .cover-meta-item span {
    color: #334155;
  }
  .cover-abstract {
    max-width: 580px;
    margin: 0 auto;
    font-size: 9.2pt;
    color: #475569;
    font-style: italic;
    background: #f1f5f9;
    padding: 14px 18px;
    border-left: 4px solid #0f172a;
    border-radius: 0 8px 8px 0;
    text-align: left;
  }

  /* Encabezados */
  h1 {
    font-size: 17pt;
    color: #0f172a;
    font-weight: 800;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5pt;
    color: #0f172a;
    font-weight: 700;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 10.2pt;
    color: #0f172a;
    font-weight: 700;
    margin-top: 10px;
    margin-bottom: 3px;
    page-break-after: avoid;
  }

  p { margin: 0 0 7px 0; }

  /* Cajas y Alertas */
  .callout {
    padding: 9px 13px;
    border-radius: 8px;
    margin: 10px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  .callout-info {
    background: #f1f5f9;
    border-left: 4px solid #0f172a;
    color: #0f172a;
  }
  .callout-success {
    background: #ecfdf5;
    border-left: 4px solid #10b981;
    color: #065f46;
  }
  .callout-warning {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }
  .callout-danger {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #991b1b;
  }

  /* Tarjetas de Solución */
  .solution-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 9px;
    page-break-inside: avoid;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .solution-title {
    font-weight: 700;
    color: #0f172a;
    font-size: 10pt;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
  }
  .solution-icon {
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    background: #e2e8f0;
    color: #0f172a;
    border-radius: 5px;
    font-size: 9pt;
    margin-right: 7px;
    font-weight: bold;
  }

  /* Flujo Vertical */
  .flow-step-container {
    position: relative;
    padding-left: 34px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .flow-step-container::before {
    content: "";
    position: absolute;
    left: 13px;
    top: 22px;
    bottom: -14px;
    width: 2px;
    background: #cbd5e1;
  }
  .flow-step-container:last-child::before {
    display: none;
  }
  .flow-step-number {
    position: absolute;
    left: 0;
    top: 0;
    width: 26px;
    height: 26px;
    background: #0f172a;
    color: #ffffff;
    border-radius: 50%;
    text-align: center;
    line-height: 26px;
    font-weight: 800;
    font-size: 9.5pt;
  }
  .flow-step-header {
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
  }
  .flow-step-body {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 5px;
  }
  .flow-step-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 6px;
    font-size: 8.8pt;
  }
  .flow-box {
    background: #ffffff;
    padding: 7px 9px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .flow-box strong {
    color: #0f172a;
    display: block;
    font-size: 8.2pt;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  /* Tablas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 8.6pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 8px;
    text-align: left;
  }
  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
  }
  tr:nth-child(even) {
    background: #f8fafc;
  }

  /* Insignias */
  .badge {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-approved { background: #dcfce7; color: #15803d; }
  .badge-review { background: #fef3c7; color: #b45309; }
  .badge-rejected { background: #fee2e2; color: #b91c1c; }
  .badge-dark { background: #0f172a; color: #ffffff; }
  .badge-blue { background: #e0f2fe; color: #0369a1; }

  .page-break { page-break-after: always; }

  ul, ol {
    margin: 3px 0 6px 0;
    padding-left: 18px;
  }
  li { margin-bottom: 2px; }
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <div class="cover-badge">Manual Operativo Oficial • Edición Completa con Corpus de Identidad</div>
  <h1 class="cover-title">NUXERA</h1>
  <div class="cover-subtitle">Plataforma Global de Inteligencia Financiera, Cumplimiento, Screening de Sanciones y Orquestación de Expedientes de Capital</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Corpus Integrado</strong>
        <span>OFAC, SAT 69-B, PPE, ONU, UE, OpenSanctions</span>
      </div>
      <div class="cover-meta-item">
        <strong>Motor de Búsqueda</strong>
        <span>Vectorial (pgvector) + Cron de Sanciones</span>
      </div>
      <div class="cover-meta-item">
        <strong>Módulos Clave</strong>
        <span>Pipeline de Crédito & Verificación de Identidad</span>
      </div>
      <div class="cover-meta-item">
        <strong>Entregable</strong>
        <span>Investment Committee Package con Dictamen KYC</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer una guía de operación vertical y exhaustiva para solicitantes de financiamiento, analistas de crédito, oficiales de cumplimiento y comités de inversión: desde la estructuración del proyecto y resolución de brechas, hasta la verificación de identidad contra listas negras globales (OFAC, SAT, ONU, UE) y la emisión del dossier ejecutivo en PDF.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad NUXERA?</h1>
<p>
  En el ecosistema de crédito corporativo, deuda privada y financiamiento estructurado, las operaciones sufren atrasos de meses o cancelaciones imprevistas por <strong>asimetría de información, debilidades en la verificación de identidad (KYC/KYB) y riesgos de lavado de dinero o sanciones internacionales</strong>.
</p>
<p>
  <strong>NUXERA unifica la estructuración financiera con un motor de inteligencia y screening de sanciones en tiempo real</strong>, resolviendo 5 grandes dolores del sector:
</p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Corpus de Identidad y Screening Global en Tiempo Real</div>
  <p><strong>El problema real:</strong> Prestar o asociarse con empresas vinculadas a listas negras (SAT Art. 69-B EFOS, personas sancionadas por la OFAC, ONU, UE o PEPs no declaradas), acarreando congelamiento de cuentas y responsabilidad penal.</p>
  <p><strong>Lo que NUXERA resuelve:</strong> Integra un <strong>Corpus de Identidad con búsqueda semántica vectorial (pgvector)</strong> que cruza al solicitante y beneficiarios contra la Lista OFAC SDN, SAT Art. 69-B, catálogo oficial de PEPs y sanciones de la ONU/UE, con actualización automática cada 4 días vía <em>SanctionAgent</em>.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Detección Automática de Brechas Documentales (Gap Analysis)</div>
  <p><strong>El problema real:</strong> Expedientes rechazados en comités de crédito por falta de avalúos, actas no protocolizadas o estados financieros no auditados.</p>
  <p><strong>Lo que NUXERA resuelve:</strong> Checklist inteligente que calcula en tiempo real el porcentaje de preparación del expediente y marca con precisión quirúrgica los requisitos faltantes por categoría.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Análisis Jurisdiccional y de Riesgo Territorial (País / Estado / Ciudad)</div>
  <p><strong>El problema real:</strong> Incertidumbre sobre el marco impositivo, certidumbre jurídica y riesgo de ejecución de garantías en la ubicación física del proyecto.</p>
  <p><strong>Lo que NUXERA resuelve:</strong> Modelo multidimensional que evalúa el contexto político, fiscal, regulatorio y macroeconómico de la jurisdicción territorial del solicitante.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Mesa de Decisión de Otorgantes (Decision Desk & Case Management)</div>
  <p><strong>El problema real:</strong> Los comités no tienen una vista unificada para contrastar riesgos, gestionar tiempos de respuesta (SLA) y formular Condiciones Precedentes (CPs).</p>
  <p><strong>Lo que NUXERA resuelve:</strong> Interfaz especializada para financiadores con matriz de riesgo, gestión de solicitudes de aclaración y fijación de términos contractuales antes del desembolso.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Paquetes de Decisión para Comités de Inversión (Investment Brief PDF)</div>
  <p><strong>El problema real:</strong> Semanas perdidas redactando memos de inversión con riesgo de omisiones graves.</p>
  <p><strong>Lo que NUXERA resuelve:</strong> Generación instantánea del expediente ejecutivo en PDF con trazabilidad inmutable de evidencias, dictamen de identidad/sanciones y estructura de colaterales.</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: EL CORPUS DE IDENTIDAD Y SCREENING VECTORIAL -->
<h1>2. El Corpus de Identidad y Motor de Sanciones</h1>
<p>
  NUXERA cuenta con una infraestructura nativa de verificación de antecedentes y listas restrictivas integrada en Supabase con soporte de búsqueda vectorial semántica:
</p>

<h2>2.1 Fuentes Oficiales Integradas en el Corpus</h2>
<table>
  <thead>
    <tr>
      <th>Fuente / Autoridad</th>
      <th>Cobertura e Información Contenida</th>
      <th>Mecanismo de Detección</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>OFAC SDN List (EE. UU.)</strong></td>
      <td>Lista de Nacionales Especialmente Designados y Personas Bloqueadas (Departamento del Tesoro de EE. UU.).</td>
      <td>Similitud Vectorial + Match Exacto</td>
    </tr>
    <tr>
      <td><strong>SAT Lista Negra (Art. 69-B)</strong></td>
      <td>Empresas que facturan operaciones simuladas (EFOS) y receptores de facturas falsas (EDOS) en México.</td>
      <td>Cruce de RFC + Denominación Social</td>
    </tr>
    <tr>
      <td><strong>SAT Personas Expuestas (PPE)</strong></td>
      <td>Registro oficial de Personas Políticamente Expuestas de México (funcionarios federales, estatales y municipales).</td>
      <td>Búsqueda Semántica Vectorial</td>
    </tr>
    <tr>
      <td><strong>Sanciones ONU (UN Security Council)</strong></td>
      <td>Personas y entidades sujetas a sanciones financieras y congelamiento de activos por el Consejo de Seguridad de la ONU.</td>
      <td>Búsqueda Global OpenSanctions</td>
    </tr>
    <tr>
      <td><strong>Sanciones de la Unión Europea (UE)</strong></td>
      <td>Registro consolidado de medidas restrictivas y sanciones financieras de la Comisión Europea.</td>
      <td>OpenSanctions / Vector Match</td>
    </tr>
    <tr>
      <td><strong>Documentos de Identidad</strong></td>
      <td>Modelos de validación de INE/IFE, Pasaporte, Cédula Profesional, CURP y Comprobantes de Domicilio.</td>
      <td>Validación Estructural & OCR</td>
    </tr>
  </tbody>
</table>

<h2>2.2 Arquitectura Técnica del Motor de Búsqueda</h2>
<ul>
  <li><strong>Almacenamiento Vectorial:</strong> Tablas <code>corpus_documents</code> y <code>corpus_chunks</code> en Supabase con extensión <code>pgvector</code>.</li>
  <li><strong>Modelos de Embeddings:</strong> Generación de vectores de alta precisión mediante <em>Gemini Embeddings</em> o <em>OpenAI text-embedding-3-small</em>.</li>
  <li><strong>Agente de Actualización Continua (SanctionAgent):</strong> Proceso en segundo plano configurado con tarea Cron (<code>0 0 */4 * *</code>) que descarga y reingesta automáticamente las listas cada 4 días.</li>
  <li><strong>Escala de Riesgo Automatizada:</strong> Clasificación instantánea en <span class="badge badge-approved">LOW (Bajo)</span>, <span class="badge badge-review">MEDIUM (Medio)</span> o <span class="badge badge-rejected">HIGH (Alto / Bloqueante)</span> con score de similitud (ej. 95%).</li>
</ul>

<div class="callout callout-info">
  <strong>Endpoint de Consulta:</strong> La API expone la ruta <code>POST /api/identity/verify</code> y <code>GET /api/identity/search</code>, accesible directamente desde la pestaña <em>"🔍 Verificar Identidad"</em> en el frontend.
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 3: FLUJO VERTICAL PASO A PASO -->
<h1>3. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  El ciclo de vida completo en NUXERA enlaza la preparación del solicitante con la verificación de identidad y la resolución final del otorgante:
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Acceso al Sistema y Selección de Espacio de Trabajo</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Ingresa al portal de NUXERA con tu cuenta asignada:</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>Espacio Solicitante (Borrower)</strong>
        Para empresas y promotores que arman su expediente de capital, suben estados financieros y garantizan transparencia.
      </div>
      <div class="flow-box">
        <strong>Espacio Otorgante (Lender / Fund)</strong>
        Para comités, analistas y fondos que revisan casos, corren screening de sanciones y autorizan líneas de crédito.
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Estructuración del Proyecto de Financiamiento (Solicitante)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Captura la tesis financiera completa del proyecto:</p>
    <ul>
      <li><strong>Monto y Uso de Fondos:</strong> Capital solicitado, plazo, tasa esperada y desglose de destino (CAPEX, refinanciamiento).</li>
      <li><strong>Estructura Societaria & Beneficiarios:</strong> Accionistas con &ge; 25% de participación, representantes legales y directores.</li>
      <li><strong>Métricas Financieras Clave:</strong> EBITDA histórico, proyecciones, margen operativo y cobertura de deuda (DSCR).</li>
      <li><strong>Ubicación Geográfica:</strong> País, estado y ciudad donde se construirá u operará el activo.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Defino los términos económicos formales de la solicitud.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Ficha del proyecto formalizada en el Pipeline de Crédito.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Carga Documental y Resolución de Brechas (Gap Analysis)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Sube la documentación organizada por carpetas temáticas:</p>
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Requisitos Clave</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Legal / Societario</strong></td>
          <td>Acta Constitutiva, Poderes Notariales, Registro Público</td>
          <td><span class="badge badge-approved">100% COMPLETO</span></td>
        </tr>
        <tr>
          <td><strong>Financiero / Fiscal</strong></td>
          <td>Estados Financieros Auditados (3 años), Opinión Cumplimiento SAT</td>
          <td><span class="badge badge-approved">100% COMPLETO</span></td>
        </tr>
        <tr>
          <td><strong>Garantías & Colaterales</strong></td>
          <td>Avalúo Comercial Vigente, Gravámenes, Fideicomiso</td>
          <td><span class="badge badge-review">1 PENDIENTE</span></td>
        </tr>
      </tbody>
    </table>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Identifico con exactitud qué falta antes de solicitar la revisión de fondos.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Expediente blindado documentalmente sin cabos sueltos.
      </div>
    </div>
  </div>
</div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Screening en el Corpus de Identidad y Sanciones (Otorgante)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el panel del Otorgante, ve a la pestaña <strong>"🔍 Verificar Identidad"</strong>.</p>
    <ol>
      <li>Introduce el nombre de la empresa, RFC o nombre de los directores / accionistas clave.</li>
      <li>Haz clic en <strong>"Verificar"</strong>. El motor vectorial consulta en milisegundos las bases de OFAC, SAT 69-B, PPE, ONU y UE.</li>
      <li>Revisa la tarjeta de riesgo (<span class="badge badge-approved">LOW</span> / <span class="badge badge-review">MEDIUM</span> / <span class="badge badge-rejected">HIGH</span>) con el score de similitud y los fragmentos coincidentes.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Blindaje penal y regulatorio contra financiamiento ilícito, lavado de dinero y operaciones con entidades sancionadas.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Certificado de Verificación de Identidad con huella de consulta vinculada al expediente.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Análisis Jurisdiccional y Negociación de Condiciones Precedentes</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el <strong>Decision Desk</strong> del Otorgante:</p>
    <ul>
      <li>Examina el riesgo territorial (país/estado/municipio) del proyecto.</li>
      <li>Formula <strong>Condiciones Precedentes al Desembolso (CPs)</strong> (ej. constitución de hipoteca en primer lugar, póliza de seguro de obra endosada al fondo).</li>
      <li>El solicitante solventa las CPs directamente en la plataforma con soporte documental.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Mitigación de riesgos legales y estructuración del contrato de crédito.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Term sheet vinculante con condiciones precedentes acordadas.
      </div>
    </div>
  </div>
</div>

<!-- PASO 6 -->
<div class="flow-step-container">
  <div class="flow-step-number">6</div>
  <div class="flow-step-header">Sesión de Comité de Inversión y Emisión del Brief Ejecutivo (PDF)</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el proceso?</strong></p>
    <ol>
      <li>Haz clic en <strong>"Generar Investment Committee Brief (PDF)"</strong>.</li>
      <li>El sistema compila el dossier ejecutivo: tesis financiera, estados contables, estructura de garantías, análisis jurisdiccional y el <strong>Dictamen Oficial de Identidad y Sanciones (OFAC/SAT/ONU)</strong>.</li>
      <li>El comité registra su votación: <span class="badge badge-approved">APROBADO</span>, <span class="badge badge-review">CONDICIONADO</span> o <span class="badge badge-rejected">DECLINADO</span> con firma de los vocales.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Formalización jurídica del financiamiento con expediente auditable de por vida.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Dossier de inversión final emitido y listo para firma y desembolso.
      </div>
    </div>
  </div>
</div>

---

<!-- CAPÍTULO 4: RESUMEN DE ENLACES Y BUENAS PRÁCTICAS -->
<h1>4. Resumen de Buenas Prácticas</h1>

<div class="callout callout-success">
  <strong>Regla de Oro de NUXERA:</strong> Ninguna solicitud de financiamiento se somete a comité de inversión sin contar con el 100% de los documentos obligatorios resueltos en el Gap Analysis y sin haber obtenido un dictamen limpio en el Corpus de Identidad y Sanciones (OFAC, SAT 69-B, PPE, ONU y UE).
</div>

</body>
</html>
"""


def generate_nuxera_enriched_pdf(output_pdf: Path) -> bool:
    """Genera el archivo PDF enriquecido a partir del HTML usando Microsoft Edge headless."""
    edge_paths = [
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    ]
    edge_exe = None
    for p in edge_paths:
        if p.exists():
            edge_exe = p
            break
            
    if not edge_exe:
        edge_cmd = shutil.which("msedge.exe") or shutil.which("msedge")
        if edge_cmd:
            edge_exe = Path(edge_cmd)
            
    if not edge_exe:
        print("Error: No se encontró msedge.exe en el sistema.")
        return False
        
    temp_html = output_pdf.parent / f"temp_{output_pdf.stem}.html"
    temp_html.write_text(NUXERA_ENRICHED_HTML, encoding="utf-8")
    
    cmd = [
        str(edge_exe),
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf.resolve()}",
        str(temp_html.resolve())
    ]
    
    print(f"Ejecutando generación de PDF enriquecido de NUXERA: {output_pdf.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    if temp_html.exists():
        temp_html.unlink()
        
    if output_pdf.exists() and output_pdf.stat().st_size > 5000:
        size_kb = round(output_pdf.stat().st_size / 1024, 1)
        print(f"PDF enriquecido de NUXERA generado con éxito ({size_kb} KB): {output_pdf}")
        return True
    else:
        print(f"Error al generar PDF: {res.stderr}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el manual enriquecido de NUXERA en PDF")
    parser.add_argument("--downloads", type=Path, default=Path(os.path.expanduser(r"~\Downloads")))
    parser.add_argument("--usb_nuxera", type=Path, default=Path(r"E:\nuxera_backup_20260819"))
    parser.add_argument("--desktop", type=Path, default=Path(os.path.expanduser(r"~\OneDrive\Escritorio\Respaldo Negocios\NUXERA")))
    args = parser.parse_args()
    
    pdf_name = "NUXERA_Manual_Usuario_Guia_Operativa_v1.pdf"
    md_name = "NUXERA_Manual_Usuario_Guia_Operativa_v1.md"
    
    # 1. Generar en USB
    args.usb_nuxera.mkdir(parents=True, exist_ok=True)
    usb_pdf = args.usb_nuxera / pdf_name
    success = generate_nuxera_enriched_pdf(usb_pdf)
    
    if success:
        # 2. Copiar a Descargas
        args.downloads.mkdir(parents=True, exist_ok=True)
        downloads_pdf = args.downloads / pdf_name
        shutil.copy2(usb_pdf, downloads_pdf)
        print(f"Copiado a Descargas: {downloads_pdf}")
        
        # 3. Copiar a Escritorio
        args.desktop.mkdir(parents=True, exist_ok=True)
        desktop_pdf = args.desktop / pdf_name
        shutil.copy2(usb_pdf, desktop_pdf)
        print(f"Copiado a Escritorio: {desktop_pdf}")
        
        # 4. Guardar versión Markdown enriquecida
        md_content = f"""# NUXERA — Manual de Usuario y Guía Operativa Integral

**Versión:** 1.1 (Con Corpus de Identidad, SAT 69-B, PPE, OFAC, ONU y UE)  
**Fecha:** 19 de agosto de 2026  
**Alcance:** Inteligencia Financiera, Screening de Sanciones, Expedientes de Crédito y Comités  
**Motor de Búsqueda:** Vectorial (pgvector con Gemini / OpenAI Embeddings) + SanctionAgent Cron (cada 4 días)  

---

## 1. ¿Qué Resuelve de Verdad NUXERA?

NUXERA es la plataforma integral para estructurar, auditar, verificar antecedentes y decidir operaciones de financiamiento y capital privado. Resuelve los 5 grandes dolores del sector:

1. **Corpus de Identidad y Screening Global en Tiempo Real**: Cruza al solicitante y beneficiarios contra la lista OFAC (EE. UU.), SAT Art. 69-B (EFOS/EDOS), Personas Políticamente Expuestas (PPE) y sanciones de la ONU y Unión Europea mediante búsqueda semántica vectorial (`pgvector`).
2. **Detección Automática de Brechas (Gap Analysis)**: Señala con exactitud los documentos o datos faltantes antes de comités de inversión.
3. **Análisis Jurisdiccional y Territorial de Riesgo**: Modela variables de país, estado y ciudad para dimensionar la certidumbre jurídica del proyecto.
4. **Mesa de Decisión para Otorgantes (Decision Desk)**: Interfaz ejecutiva para fondos y bancos con gestión de SLAs y fijación de Condiciones Precedentes (CPs).
5. **Dossier Ejecutivo para Comités (Investment Brief PDF)**: Generación instantánea del reporte formal con trazabilidad inmutable y certificado de screening KYC/KYB.

---

## 2. El Corpus de Identidad y Motor de Sanciones

### Fuentes Oficiales Incluidas:
* **OFAC SDN List:** Lista de personas y entidades sancionadas por el Departamento del Tesoro de EE. UU.
* **SAT Lista Negra (Art. 69-B):** Empresas de facturación simulada (EFOS/EDOS) en México.
* **SAT Personas Políticamente Expuestas (PPE):** Catálogo oficial de funcionarios públicos de los 3 niveles de gobierno.
* **Sanciones ONU (Consejo de Seguridad):** Medidas restrictivas internacionales.
* **Sanciones de la Unión Europea (UE):** Registro consolidado de sanciones financieras de la Comisión Europea.
* **Modelos de Documentos de Identidad:** Validaciones de INE, Pasaporte, Cédula Profesional, CURP y Comprobantes.

### Arquitectura Técnica:
* **Tablas en Supabase:** `corpus_documents` y `corpus_chunks` con embeddings vectoriales.
* **SanctionAgent Cron (`0 0 */4 * *`):** Actualización automática programada cada 4 días sin intervención humana.
* **Clasificación de Riesgo:** Indicador visual en semáforo: `LOW` (Bajo), `MEDIUM` (Medio) o `HIGH` (Alto / Bloqueante) con score de similitud (ej. 95%).

---

## 3. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: Acceso por Rol] ➔ [Paso 2: Estructuración del Proyecto] ➔ [Paso 3: Carga y Gap Analysis]
➔ [Paso 4: Screening de Identidad y Sanciones (OFAC/SAT/ONU)] ➔ [Paso 5: Decision Desk y CPs] ➔ [Paso 6: Comité y Dossier PDF]
```

### Paso 1 — Ingreso al Sistema y Selección de Rol
- Acceso diferenciado para Solicitantes (Borrowers/Sponsors) y Otorgantes (Lenders/Funds).

### Paso 2 — Estructuración del Proyecto Financiero
- Captura de monto, uso de fondos, métricas financieras (EBITDA, DSCR), estructura societaria y garantías.

### Paso 3 — Carga Documental y Resolución de Brechas
- Subida de actas, balances auditados, avalúos y verificación de completitud documental al 100%.

### Paso 4 — Verificación en el Corpus de Identidad (Pestaña "Verificar Identidad")
- Ejecución de búsqueda semántica vectorial en `/api/identity/verify` contra OFAC, SAT 69-B, PPE, ONU y UE, con emisión de dictamen certificado.

### Paso 5 — Mesa de Decisión y Condiciones Precedentes (CPs)
- Análisis de riesgo territorial, garantías y fijación de condiciones obligatorias previas al desembolso.

### Paso 6 — Emisión del Paquete de Decisión y Sesión de Comité
- Descarga del Investment Committee Brief en PDF con dictamen de identidad adjunto y registro de la votación formal.
"""
        (args.usb_nuxera / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versión enriquecida de Markdown guardada en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
