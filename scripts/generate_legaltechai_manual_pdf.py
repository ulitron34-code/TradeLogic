"""Generador del Manual de Usuario y Guía Operativa de LegalTech AI en formato PDF de alta calidad.

Compila un documento HTML con diseño jurídico profesional, flujo vertical paso a paso (Consulta -> Grafo Normativo -> Redacción Asistida -> Verificación Humana -> Exportación),
tablas de fuentes oficiales (SCJN, DOF, COFEPRIS, STPS), matriz de roles y exportación a PDF vectorial con Edge headless.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

LEGALTECH_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>LegalTech AI — Manual de Usuario y Guía Operativa</title>
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
      content: "LegalTech AI — Manual de Usuario y Guía Operativa v1.0";
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
    background: #451a03;
    color: #fef3c7;
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
    background: #78350f;
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
    background: #fffbeb;
    padding: 14px 18px;
    border-left: 4px solid #78350f;
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
    color: #78350f;
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
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
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
    color: #78350f;
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
    background: #fef3c7;
    color: #78350f;
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
    background: #78350f;
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
    color: #78350f;
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
  .badge-dark { background: #451a03; color: #fef3c7; }

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
  <div class="cover-badge">Manual Operativo Oficial • Versión 1.0</div>
  <h1 class="cover-title">LegalTech AI</h1>
  <div class="cover-subtitle">Plataforma de Inteligencia Jurídica, Grafo Normativo y Redacción Asistida de Proyectos Legales (SCJN · DOF · COFEPRIS · STPS)</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Materias Especializadas</strong>
        <span>Laboral, Civil, Sanitario y Administrativo</span>
      </div>
      <div class="cover-meta-item">
        <strong>Motor de Inteligencia</strong>
        <span>RAG Híbrido + Grafo Normativo SCJN/DOF</span>
      </div>
      <div class="cover-meta-item">
        <strong>Acreditación</strong>
        <span>Citas IUS Verificables & Enlaces Oficiales</span>
      </div>
      <div class="cover-meta-item">
        <strong>Entregable Central</strong>
        <span>Proyectos y Demandas Fundamentadas (DOCX/PDF)</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer una guía clara y exhaustiva para abogados postulantes, directores jurídicos y pasantes de derecho: desde la formulación de consultas jurídicas complejas y navegación del grafo normativo, hasta la redacción asistida de escritos con verificación humana obligatoria y la exportación de proyectos legalmente blindados.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad LegalTech AI?</h1>
<p>
  En la práctica jurídica mexicana, más del 70% del tiempo de un abogado se consume en <strong>búsqueda manual de precedentes, lectura de tesis dispersas en el Semanario Judicial de la Federación (SJF) y transcripción de leyes</strong>. Esto genera retrasos graves, sobrecostos para clientes y el riesgo letal de citar una tesis superada o una ley abrogada.
</p>
<p>
  <strong>LegalTech AI no es un generador de textos genérico</strong>. Es un entorno de trabajo jurídico con grounding estricto sobre fuentes oficiales que resuelve 5 grandes problemas del despacho profesional:
</p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Búsqueda Jurídica con Citas IUS Oficiales y Cero Alucinaciones</div>
  <p><strong>El problema real:</strong> Los modelos de lenguaje genéricos inventan artículos de leyes, números de registro de tesis o criterios inexistentes, arriesgando la cédula profesional del abogado.</p>
  <p><strong>Lo que LegalTech AI resuelve:</strong> Sistema RAG multi-etapa que responde exclusivamente con base en el texto oficial del Semanario Judicial de la Federación (SCJN) y Diario Oficial (DOF). Cada párrafo incluye su número de registro digital (IUS), rubro, época, tribunal emisor y liga directa a la fuente.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Grafo Normativo y Detección de Criterios Superados</div>
  <p><strong>El problema real:</strong> Citar una jurisprudencia que fue superada por contradicción de criterios o declarar un precepto legal derogado, debilitando la defensa en juicio.</p>
  <p><strong>Lo que LegalTech AI resuelve:</strong> Grafo de relaciones normativas que detecta automáticamente si una tesis está vigente, superada, interrumpida o sujeta a contradicción, alertando en rojo al redactor antes de que plasme el argumento.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Redacción Asistida de Proyectos y Demandas Base (Drafting Agent)</div>
  <p><strong>El problema real:</strong> Invertir días redactando demandas laborales, contestaciones de demanda civil, convenios ante el CFCRL o recursos administrativos desde cero.</p>
  <p><strong>Lo que LegalTech AI resuelve:</strong> El Agente Redactor estructura el proyecto legal con hechos, derecho, conceptos de violación, agravios y capítulos probatorios fundamentados de acuerdo a la teoría del caso planteada.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Especialización Sectorial Profunda (Laboral, Civil y Sanitario)</div>
  <p><strong>El problema real:</strong> Las herramientas jurídicas genéricas no dominan las particularidades del Nuevo Modelo de Justicia Laboral (STPS/CFCRL) ni la regulación sanitaria compleja (COFEPRIS/NOMs).</p>
  <p><strong>Lo que LegalTech AI resuelve:</strong> Módulos entrenados con catálogos específicos de conciliación laboral prejudicial, cálculo de liquidaciones, registros sanitarios COFEPRIS y NOMs de salud e industria.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Flujo de Verificación Humana Obligatoria (Gobernanza Profesional)</div>
  <p><strong>El problema real:</strong> El riesgo ético y procesal de presentar escritos automatizados sin revisión letrada.</p>
  <p><strong>Lo que LegalTech AI resuelve:</strong> Ningún documento se exporta como final sin pasar por la compuerta de validación del Abogado Titular (Human-in-the-loop), dejando constancia auditable de quién revisó y autorizó cada argumento.</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: FLUJO VERTICAL PASO A PASO -->
<h1>2. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  A continuación se detalla la secuencia de trabajo profesional en LegalTech AI para pasar de una duda jurídica o caso litigioso a un proyecto formalmente terminado:
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Acceso al Despacho Digital y Selección de Materia</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Ingresa con tus credenciales de despacho y selecciona el área del derecho correspondiente:</p>
    <ul>
      <li><strong>Materia Laboral:</strong> Despidos, cálculo de finiquitos, convenios de conciliación, tercerización, libertad sindical y contratos colectivos.</li>
      <li><strong>Materia Civil / Mercantil:</strong> Cumplimiento de contratos, pagarés, responsabilidad civil y arrendamiento.</li>
      <li><strong>Materia Sanitaria / Salud:</strong> Registros sanitarios COFEPRIS, permisos de importación de insumos médicos y cumplimiento de NOMs.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Enfoco el motor de búsqueda y el contexto normativo en la legislación aplicable a la rama jurídica elegida.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Entorno de trabajo contextualizado con jurisprudencia y leyes especializadas.
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Consulta Jurídica o Planteamiento de Hechos</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el panel de <strong>Inteligencia Jurídica</strong>, redacta tu consulta en lenguaje natural:</p>
    <div class="callout callout-info">
      <em>Ejemplo de Consulta:</em> "¿Cuál es el criterio jurisprudencial vigente sobre la carga de la prueba en la renuncia firmada en blanco en un juicio laboral bajo la reforma procesal de la LFT?"
    </div>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Expongo el problema jurídico sin necesidad de conocer de antemano el número IUS o la partida de la ley.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Petición lista para el pipeline RAG híbrido de alta precisión.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Recuperación y Análisis en el Grafo Normativo (SCJN / DOF)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hace el sistema?</strong></p>
    <ol>
      <li>Busca en el corpus oficial de tesis del Semanario Judicial de la Federación y leyes vigentes del DOF.</li>
      <li>Verifica en el <strong>Grafo Normativo</strong> el estado de cada criterio:</li>
    </ol>
    <table>
      <thead>
        <tr>
          <th>Registro Digital (IUS)</th>
          <th>Rubro de la Tesis</th>
          <th>Órgano / Época</th>
          <th>Estado de Vigencia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>2024512</strong></td>
          <td>Carga probatoria en materia laboral. Documentos objetados.</td>
          <td>Plenos Regionales (11a. Época)</td>
          <td><span class="badge badge-approved">JURISPRUDENCIA VIGENTE</span></td>
        </tr>
        <tr>
          <td><strong>1987411</strong></td>
          <td>Renuncia. Presunción de validez.</td>
          <td>Tribunales Colegiados (9a. Época)</td>
          <td><span class="badge badge-rejected">CRITERIO SUPERADO</span></td>
        </tr>
      </tbody>
    </table>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Certez absoluta de que los argumentos y tesis que sustentan el caso son jurídicamente válidos hoy.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Cuadro comparativo de precedentes con links directos a la SCJN.
      </div>
    </div>
  </div>
</div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Redacción Asistida del Proyecto Legal (Drafting Agent)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Haz clic en <strong>"Generar Proyecto Legal"</strong> y selecciona el tipo de escrito:</p>
    <ul>
      <li>Demanda inicial / Contestación de demanda.</li>
      <li>Recurso de revisión / Agravios en apelación.</li>
      <li>Contrato mercantil o laboral con cláusulas de protección.</li>
      <li>Escrito de desahogo de prevención ante COFEPRIS o STPS.</li>
    </ul>
    <p>El Agente Redactor redacta el documento integrando hechos, preceptos violados, conceptos de impugnación y las tesis vigentes recuperadas en el Paso 3.</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Ahorro de hasta un 80% del tiempo de redacción de borradores iniciales.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Borrador completo estructurado en estado <span class="badge badge-review">PENDIENTE DE REVISIÓN HUMANA</span>.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Compuerta de Verificación Humana y Firma Profesional</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> El abogado titular o sénior ingresa al editor del proyecto:</p>
    <ol>
      <li>Revisa cada hecho, cálculo de prestaciones y citas legales con el panel lateral de cotejo.</li>
      <li>Ajusta la redacción con su estilo profesional o incorpora pruebas específicas del cliente.</li>
      <li>Marca la casilla obligatoria: <em>"He verificado la idoneidad legal y vigencia de las fuentes citadas"</em>.</li>
      <li>Presiona <strong>"Aprobar y Firmar Dictamen"</strong>.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Control de calidad ético y procesal. La responsabilidad y el criterio jurídico final siempre quedan en manos del abogado.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Proyecto legal validado con sello de auditoría interna de despacho.
      </div>
    </div>
  </div>
</div>

<!-- PASO 6 -->
<div class="flow-step-container">
  <div class="flow-step-number">6</div>
  <div class="flow-step-header">Exportación Formal en Formato Editable (DOCX) y PDF</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el proceso?</strong></p>
    <p>
      Descarga el documento final en formato **Word (.docx)** con formato procesal listo para presentación en tribunales (márgenes, tipografía judicial, citas a pie de página estandarizadas) o en **PDF** con código QR de verificación de fuentes.
    </p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Entrega inmediata del escrito para firma del cliente o presentación física/electrónica ante el juzgado o autoridad administrativa.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Escrito legal impecable, fundamentado y blindado ante cualquier impugnación de la contraparte.
      </div>
    </div>
  </div>
</div>

---

<!-- CAPÍTULO 3: MATRIZ DE FUENTES Y MÓDULOS -->
<h1>3. Directorio de Fuentes Oficiales Integradas</h1>

<table>
  <thead>
    <tr>
      <th>Fuente Oficial</th>
      <th>Materia / Cobertura</th>
      <th>Tipo de Acceso</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>SCJN (Semanario Judicial de la Federación)</strong></td>
      <td>Jurisprudencias, Tesis Aisladas y Precedentes Obligatorios (1a a 11a Época).</td>
      <td>Datos Abiertos JSON/CSV Oficiales</td>
    </tr>
    <tr>
      <td><strong>DOF (Diario Oficial de la Federación)</strong></td>
      <td>Leyes Federales, Códigos, Reformas y Acuerdos Secretariales.</td>
      <td>Portal SIDOF Oficial Segob</td>
    </tr>
    <tr>
      <td><strong>COFEPRIS</strong></td>
      <td>Registros Sanitarios, Alertas Sanitarias y Normas Oficiales de Salud.</td>
      <td>Padrón Público de Insumos para la Salud</td>
    </tr>
    <tr>
      <td><strong>STPS / CFCRL</strong></td>
      <td>NOMs Laborales (NOM-035, NOM-037), Guías de Conciliación y Criterios Laborales.</td>
      <td>Portal Institucional del Centro Federal</td>
    </tr>
  </tbody>
</table>

---

<!-- CAPÍTULO 4: REGLAS DE ORO -->
<h1>4. Buenas Prácticas y Reglas de Oro</h1>

<div class="callout callout-success">
  <strong>Principio Rector de LegalTech AI:</strong> La inteligencia artificial procesa millones de datos en segundos y localiza el precedente exacto; el abogado analiza, juzga y asume la defensa. La tecnología potencia la labor del jurista, jamás la sustituye.
</div>

---

<!-- CAPÍTULO 5: DIFERENCIADORES FRENTE A LA COMPETENCIA -->
<h1>5. Diferenciadores Clave Frente a la Competencia y Ventajas de Mercado</h1>
<p>
  En el mercado jurídico existen dos extremos ineficientes: los buscadores tradicionales que exigen horas de lectura manual y las herramientas de IA genéricas que inventan leyes y alucinan números de tesis. <strong>LegalTech AI es el primer entorno de inteligencia jurídica en México que une RAG determinista, grafo normativo de precedentes y redacción procesal con firma auditada</strong>.
</p>

<table>
  <thead>
    <tr>
      <th>Capacidad / Requerimiento</th>
      <th>Buscador SCJN Tradicional (sjf2 / Datos abiertos)</th>
      <th>Bases de Datos Clásicas (vLex / Tirant Prime)</th>
      <th>Modelos de IA Genérica (ChatGPT / Copilot)</th>
      <th>LegalTech AI (Plataforma Especializada)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Precisión de Citas (Cero Alucinaciones)</strong></td>
      <td>Oficial (Búsqueda manual pesada)</td>
      <td>Oficial (Sin razonamiento)</td>
      <td>Altamente propenso a inventar leyes</td>
      <td><span class="badge badge-approved">Grounding Estricto SCJN/DOF</span></td>
    </tr>
    <tr>
      <td><strong>Grafo de Tesis Superadas / Vigentes</strong></td>
      <td>Manual (El abogado debe cotejar)</td>
      <td>Mención básica sin grafo</td>
      <td>No disponible (Cita tesis derogadas)</td>
      <td><span class="badge badge-approved">Detección Automática de Vigencia</span></td>
    </tr>
    <tr>
      <td><strong>Redacción de Demandas y Proyectos</strong></td>
      <td>No disponible</td>
      <td>Solo machotes y formatos fijos</td>
      <td>Prosa informal sin formato judicial</td>
      <td><span class="badge badge-approved">Drafting Agent Procesal (DOCX/PDF)</span></td>
    </tr>
    <tr>
      <td><strong>Especialización Sectorial</strong></td>
      <td>Leyes dispersas</td>
      <td>Leyes dispersas</td>
      <td>Genérico</td>
      <td><span class="badge badge-approved">Laboral (CFCRL), Civil y Sanitario</span></td>
    </tr>
    <tr>
      <td><strong>Gobernanza y Responsabilidad Letrada</strong></td>
      <td>Individual</td>
      <td>Individual</td>
      <td>Sin control de autoría</td>
      <td><span class="badge badge-approved">Compuerta Human-in-the-Loop Obligatoria</span></td>
    </tr>
  </tbody>
</table>

<div class="callout callout-info">
  <strong>¿Por qué un despacho o departamento jurídico debe contratar LegalTech AI?</strong><br>
  Porque LegalTech AI <strong>reduce el tiempo de elaboración de demandas y contestaciones en un 80%, evita el error fatal de citar criterios superados y asegura que cada proyecto entregado cuente con fundamentación oficial intachable</strong>, aumentando la tasa de éxito en litigio y la productividad del equipo legal.
</div>

</body>
</html>
"""


def generate_legaltech_pdf(output_pdf: Path) -> bool:
    """Genera el archivo PDF a partir del HTML usando Microsoft Edge headless."""
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
    temp_html.write_text(LEGALTECH_HTML, encoding="utf-8")
    
    cmd = [
        str(edge_exe),
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf.resolve()}",
        str(temp_html.resolve())
    ]
    
    print(f"Ejecutando generación de PDF de LegalTech AI: {output_pdf.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    if temp_html.exists():
        temp_html.unlink()
        
    if output_pdf.exists() and output_pdf.stat().st_size > 5000:
        size_kb = round(output_pdf.stat().st_size / 1024, 1)
        print(f"PDF de LegalTech AI generado con éxito ({size_kb} KB): {output_pdf}")
        return True
    else:
        print(f"Error al generar PDF: {res.stderr}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el manual de LegalTech AI en PDF")
    parser.add_argument("--downloads", type=Path, default=Path(os.path.expanduser(r"~\Downloads")))
    parser.add_argument("--usb_legal", type=Path, default=Path(r"E:\legaltechai"))
    parser.add_argument("--desktop", type=Path, default=Path(os.path.expanduser(r"~\OneDrive\Escritorio\Respaldo Negocios\LegalTechAI")))
    args = parser.parse_args()
    
    pdf_name = "LegalTechAI_Manual_Usuario_Guia_Operativa_v1.pdf"
    md_name = "LegalTechAI_Manual_Usuario_Guia_Operativa_v1.md"
    
    # 1. Generar en USB
    args.usb_legal.mkdir(parents=True, exist_ok=True)
    usb_pdf = args.usb_legal / pdf_name
    success = generate_legaltech_pdf(usb_pdf)
    
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
        
        # 4. Guardar versión Markdown limpia
        md_content = f"""# LegalTech AI — Manual de Usuario y Guía Operativa

**Versión:** 1.0  
**Fecha:** 19 de agosto de 2026  
**Fuentes Oficiales:** SCJN (SJF), DOF, COFEPRIS y STPS / CFCRL  
**Especialización:** Derecho Laboral, Civil, Sanitario y Administrativo  
**Motor de Inteligencia:** RAG Híbrido (Denso BGE-M3 + Léxico BM25) + Grafo Normativo de Precedentes  

---

## 1. ¿Qué Resuelve de Verdad LegalTech AI?

LegalTech AI es la plataforma de inteligencia jurídica y redacción asistida diseñada para despachos y departamentos jurídicos en México. Resuelve los 5 grandes problemas del ejercicio legal:

1. **Búsqueda Jurídica con Citas IUS Oficiales**: Recupera tesis y jurisprudencias del Semanario Judicial de la Federación con citas exactas, rubro, época y enlace oficial sin alucinaciones.
2. **Grafo Normativo y Detección de Criterios Superados**: Alerta automáticamente si una tesis citada fue superada por contradicción de criterios o si un artículo fue reformado en el DOF.
3. **Redacción Asistida de Proyectos y Demandas (Drafting Agent)**: Estructura demandas, contestaciones, convenios y recursos con fundamentación jurídica en minutos.
4. **Especialización en Derecho Laboral, Civil y Sanitario**: Incluye módulos entrenados para el Nuevo Modelo Laboral (STPS/CFCRL) y trámites sanitarios ante COFEPRIS.
5. **Compuerta de Verificación Humana Obligatoria**: La IA propone el borrador y el abogado titular revisa, ajusta y firma con constancia de autoría profesional.

---

## 2. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: Acceso y Materia] ➔ [Paso 2: Consulta Jurídica] ➔ [Paso 3: Grafo Normativo SCJN/DOF]
➔ [Paso 4: Redacción con Drafting Agent] ➔ [Paso 5: Verificación Humana] ➔ [Paso 6: Exportación DOCX/PDF]
```

### Paso 1 — Acceso al Despacho Digital y Selección de Materia
- Ingreso por despacho con roles (Admin, Abogado Sénior, Pasante) y selección de materia (Laboral, Civil, Sanitario).

### Paso 2 — Formulación de Consulta Jurídica o Planteamiento de Hechos
- Captura de preguntas o hipótesis en lenguaje natural.

### Paso 3 — Recuperación y Validación en el Grafo Normativo
- Cruce automático contra el Semanario Judicial de la Federación y detección de vigencia de tesis (Vigente vs. Superada).

### Paso 4 — Redacción Asistida del Proyecto Legal
- El Agente Redactor genera el borrador de la demanda o escrito estructurado con hechos, agravios y fundamentación.

### Paso 5 — Compuerta de Verificación Humana y Firma
- Revisión letrada obligatoria, cotejo de citas y firma de responsabilidad profesional del abogado.

### Paso 6 — Exportación en DOCX Editable y PDF
- Descarga del escrito con formato judicial procesal listo para presentación ante tribunales.
"""
        (args.usb_legal / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versiones Markdown guardadas en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
