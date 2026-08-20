"""Generador del Manual de Usuario y Guía Operativa de Global Resilience OS en formato PDF de alta calidad.

Compila un documento HTML con diseño de inteligencia geopolítica, flujo vertical paso a paso,
tablas de impacto por vertical, perfiles de recuperación, matriz de escenarios y exportación a PDF vectorial con Edge headless.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

GR_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Global Resilience OS — Manual de Usuario y Guía Operativa</title>
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
      content: "Global Resilience OS — Manual de Usuario y Guía Operativa v1.0";
      font-size: 8.5pt;
      color: #64748b;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
  }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  /* Portada */
  .cover {
    page-break-after: always;
    padding-top: 40px;
    text-align: center;
  }
  .cover-badge {
    display: inline-block;
    background: #0f172a;
    color: #38bdf8;
    font-size: 9pt;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 999px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
    border: 1px solid #1e293b;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 12px 0;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    max-width: 620px;
    margin: 0 auto 30px auto;
    font-weight: 400;
  }
  .cover-divider {
    width: 80px;
    height: 4px;
    background: #0284c7;
    margin: 0 auto 35px auto;
    border-radius: 2px;
  }
  .cover-meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 25px;
    max-width: 540px;
    margin: 0 auto 40px auto;
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
    font-size: 9.5pt;
    color: #475569;
    font-style: italic;
    background: #f0f9ff;
    padding: 14px 18px;
    border-left: 4px solid #0284c7;
    border-radius: 0 8px 8px 0;
    text-align: left;
  }

  /* Encabezados y Secciones */
  h1 {
    font-size: 18pt;
    color: #0f172a;
    font-weight: 800;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 13pt;
    color: #0369a1;
    font-weight: 700;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 10.5pt;
    color: #0f172a;
    font-weight: 700;
    margin-top: 12px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 8px 0;
  }

  /* Cajas de llamada y Alertas */
  .callout {
    padding: 10px 14px;
    border-radius: 8px;
    margin: 12px 0;
    font-size: 9.2pt;
    page-break-inside: avoid;
  }
  .callout-info {
    background: #f0f9ff;
    border-left: 4px solid #0284c7;
    color: #0369a1;
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
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .solution-title {
    font-weight: 700;
    color: #0369a1;
    font-size: 10.5pt;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
  }
  .solution-icon {
    display: inline-block;
    width: 22px;
    height: 22px;
    line-height: 22px;
    text-align: center;
    background: #e0f2fe;
    color: #0369a1;
    border-radius: 6px;
    font-size: 9.5pt;
    margin-right: 8px;
    font-weight: bold;
  }

  /* Flujo Vertical */
  .flow-step-container {
    position: relative;
    padding-left: 36px;
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .flow-step-container::before {
    content: "";
    position: absolute;
    left: 14px;
    top: 24px;
    bottom: -16px;
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
    width: 28px;
    height: 28px;
    background: #0284c7;
    color: #ffffff;
    border-radius: 50%;
    text-align: center;
    line-height: 28px;
    font-weight: 800;
    font-size: 10pt;
    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
  }
  .flow-step-header {
    font-size: 11.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .flow-step-body {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    margin-top: 6px;
  }
  .flow-step-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 8px;
    font-size: 9pt;
  }
  .flow-box {
    background: #ffffff;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .flow-box strong {
    color: #0369a1;
    display: block;
    font-size: 8.5pt;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  /* Tablas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8.8pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
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
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-approved { background: #dcfce7; color: #15803d; }
  .badge-review { background: #fef3c7; color: #b45309; }
  .badge-rejected { background: #fee2e2; color: #b91c1c; }
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-dark { background: #0f172a; color: #38bdf8; }

  .page-break {
    page-break-after: always;
  }

  ul, ol {
    margin: 4px 0 8px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 3px;
  }
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <div class="cover-badge">Manual Operativo Oficial • Versión 1.0</div>
  <h1 class="cover-title">Global Resilience OS</h1>
  <div class="cover-subtitle">Plataforma de Inteligencia de Riesgo Sistémico y Continuidad para Infraestructura Crítica y Cadenas de Suministro Globales</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Arquitectura</strong>
        <span>Híbrida Standalone + API REST</span>
      </div>
      <div class="cover-meta-item">
        <strong>Capa Transversal</strong>
        <span>Monitoreo de Cables Submarinos</span>
      </div>
      <div class="cover-meta-item">
        <strong>Verticales Críticas</strong>
        <span>12 Commodities & Cadenas Clave</span>
      </div>
      <div class="cover-meta-item">
        <strong>Entregable Central</strong>
        <span>Executive Intelligence Brief (PDF)</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer una guía de navegación vertical y operativa para directores de riesgo, gestores de fondos de infraestructura y analistas geopolíticos: desde la visualización del mapa mundial de cables submarinos, hasta la simulación de cortes, cálculo de cascadas de impacto, reserva de capacidad alternativa y exportación del informe ejecutivo de resiliencia.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad Global Resilience OS?</h1>
<p>
  El 99% del tráfico de internet, transacciones financieras globales ($10+ billones de dólares diarios) y telemetría de comercio exterior viaja a través de <strong>cables submarinos de fibra óptica</strong>. Sin embargo, las empresas de energía, minería, logística y semiconductores modelan sus riesgos de suministro de forma aislada, sin considerar el impacto de una disrupción masiva de telecomunicaciones en estrechos geopolíticos (Mar Rojo, Malaca, Canal de la Mancha, Taiwán).
</p>
<p>
  <strong>Global Resilience OS es la primera plataforma que une la infraestructura física digital con las cadenas de suministro de 12 materias primas críticas</strong>, resolviendo 5 problemas estratégicos:
</p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Visibilidad Total de Infraestructura Crítica Submarina</div>
  <p><strong>El problema real:</strong> Los comités de riesgo desconocen qué cables submarinos transportan sus datos operativos y transacciones entre nodos continentales clave.</p>
  <p><strong>Lo que la plataforma resuelve:</strong> Mapa mundial interactivo en matriz de puntos que visualiza rutas de cables submarinos, estaciones de amarre (*landing stations*) y zonas de alta vulnerabilidad sísmica o geopolítica.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Simulación Determinista de Cascadas de Impacto (12 Verticales)</div>
  <p><strong>El problema real:</strong> Cuando se corta un cable en el Mar Rojo, nadie sabe con precisión cómo afectará el suministro de LNG a Europa o de semiconductores a América.</p>
  <p><strong>Lo que la plataforma resuelve:</strong> El **Impact Engine** calcula el efecto dominó en 12 verticales estratégicas: Petróleo, LNG, Gas, Petroquímica, Electricidad, Cobre, Litio, Níquel, Cobalto, Trigo, Semiconductores y Acero.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Modelado de Recuperación y Tiempo Medio de Reparación (MTTR)</div>
  <p><strong>El problema real:</strong> Reparar un cable submarino toma semanas o meses (dependiendo de la disponibilidad de barcos cableros), pero las empresas asumen recuperaciones instantáneas.</p>
  <p><strong>Lo que la plataforma resuelve:</strong> Genera perfiles temporales de degradación y curvas de recuperación (*Recovery Curves*) considerando capacidades remanentes y rutas terrestres alternas.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Marketplace de Capacidad Alternativa y Cobertura (*Capacity Reserve*)</div>
  <p><strong>El problema real:</strong> Tras un incidente, el costo del ancho de banda de respaldo se dispara en el mercado spot (*price surge*).</p>
  <p><strong>Lo que la plataforma resuelve:</strong> Módulo de simulación de contratos de reserva y reenvío dinámico de tráfico (*rerouting capacity*) para garantizar continuidad operativa a costo predecible.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Sala de Crisis Ejecutiva (Decision Room) y Brief en PDF</div>
  <p><strong>El problema real:</strong> En situaciones de emergencia, los reportes tardan días en compilarse y no llegan a tiempo a la alta dirección.</p>
  <p><strong>Lo que la plataforma resuelve:</strong> Generación instantánea del **Executive Resilience Brief en PDF** con matriz de riesgo, recomendaciones de mitigación y estimación de pérdidas financieras.</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: FLUJO VERTICAL PASO A PASO -->
<h1>2. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  A continuación se describe la secuencia operativa para realizar un análisis de resiliencia sistémica en la plataforma:
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Exploración del Mapa Mundial de Infraestructura (World Map)</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Al abrir la aplicación, visualiza el mapa interactivo global en la pantalla principal.</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Identifico la ubicación geográfica de cables submarinos, capacidad en Tbps, estaciones de amarre y nodos de interconexión transoceánicos.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Línea base de conectividad y reconocimiento visual de puntos de fallo único (*Single Points of Failure*).
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Selección o Creación de Escenario de Disrupción</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el <strong>Scenario Builder</strong>, selecciona un escenario predefinido o diseña uno personalizado:</p>
    <ul>
      <li><strong>Corte en el Mar Rojo:</strong> Simula la ruptura simultánea de 4 cables estratégicos en el estrecho de Bab el-Mandeb.</li>
      <li><strong>Disrupción en el Estrecho de Malaca:</strong> Afectación del tráfico digital y logístico entre Asia Oriental y Europa.</li>
      <li><strong>Falla Transatlántica Mayor:</strong> Ruptura de enlaces de ultra-alta capacidad entre Nueva York y Londres.</li>
      <li><strong>Escenario Personalizado:</strong> Haz clic sobre cualquier cable o estación en el mapa para declararlo inactivo.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Parametrizo la hipótesis de crisis con severidad, duración estimada y regiones afectadas.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Escenario activo configurado y listo para ejecución en el motor de impacto.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Ejecución del Impact Engine (Cascada por Vertical)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Presiona <em>"Simulate Impact"</em> y observa el cálculo determinista del motor:</p>
    <table>
      <thead>
        <tr>
          <th>Vertical Crítica</th>
          <th>Nivel de Exposición</th>
          <th>Mecanismo de Afectación</th>
          <th>Tiempo Estimado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>LNG & Gas Natural</strong></td>
          <td><span class="badge badge-rejected">CRÍTICO (88%)</span></td>
          <td>Falla en telemetría de buques metaneros y terminales portuarias.</td>
          <td>Inmediato (0 - 4 hrs)</td>
        </tr>
        <tr>
          <td><strong>Semiconductores</strong></td>
          <td><span class="badge badge-rejected">ALTO (74%)</span></td>
          <td>Interrupción de cadenas de diseño y pedidos just-in-time Asia-EEUU.</td>
          <td>Medio plazo (24 - 72 hrs)</td>
        </tr>
        <tr>
          <td><strong>Petróleo Crudo</strong></td>
          <td><span class="badge badge-review">MEDIO (52%)</span></td>
          <td>Desvío de rutas marítimas y retraso en liquidaciones bancarias.</td>
          <td>1 - 7 días</td>
        </tr>
        <tr>
          <td><strong>Cobre & Litio</strong></td>
          <td><span class="badge badge-approved">BAJO (28%)</span></td>
          <td>Impacto diferido en logística de concentrados mineros.</td>
          <td>7 - 14 días</td>
        </tr>
      </tbody>
    </table>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Cuantifico el riesgo sistémico transversal eliminando puntos ciegos en la cadena de valor.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Matriz de exposición con puntaje global de resiliencia (0-100).
      </div>
    </div>
  </div>
</div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Análisis de Perfiles de Recuperación (Recovery Curve)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Ve a la pestaña <strong>Recovery Profile</strong> para examinar la curva temporal de restablecimiento.</p>
    <ul>
      <li><strong>Fase 1 (Re-enrutamiento Automático):</strong> Conmutación a cables secundarios en minutos (recuperación de ~40% de capacidad).</li>
      <li><strong>Fase 2 (Congestión y Latencia):</strong> Degradación del servicio durante el periodo de saturación de enlaces alternos.</li>
      <li><strong>Fase 3 (Reparación Física):</strong> Movilización de buques cableros y empalme en fondo marino (15 a 45 días).</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Establezco expectativas realistas de recuperación para planes de continuidad de negocio (BCP).
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Gráfica de degradación temporal y cálculo de pérdidas económicas acumuladas.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Mitigación en el Capacity Marketplace</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el <strong>Capacity Marketplace</strong>, simula la contratación de rutas de respaldo:</p>
    <ul>
      <li>Reserva de ancho de banda en rutas terrestres transcontinentales.</li>
      <li>Contratación de enlaces satelitales (LEO/GEO) para telemetría crítica de activos.</li>
      <li>Diversificación de proveedores de tránsito IP.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Estrategia financiera de mitigación. Comparo el costo de contratar capacidad de reserva vs. el costo de inactividad operativa.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Plan de contingencia validado con reducción inmediata del puntaje de riesgo.
      </div>
    </div>
  </div>
</div>

<!-- PASO 6 -->
<div class="flow-step-container">
  <div class="flow-step-number">6</div>
  <div class="flow-step-header">Exportación del Executive Resilience Brief (PDF)</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el proceso?</strong> En la <strong>Decision Room</strong>, haz clic en <em>"Export Executive Brief (PDF)"</em>.</p>
    <p>El sistema genera un informe ejecutivo que contiene:</p>
    <ol>
      <li>Resumen ejecutivo con nivel de amenaza y puntaje de resiliencia.</li>
      <li>Mapa y detalle del escenario simulado con cables y estaciones afectadas.</li>
      <li>Desglose de impacto en las 12 verticales con estimación financiera.</li>
      <li>Curva de recuperación y plan de re-enrutamiento recomendado.</li>
      <li>Checklist de acciones inmediatas para el comité de crisis.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Entregable de nivel directivo listo para comités ejecutivos, aseguradoras o entidades regulatorias.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Documento PDF formal de inteligencia estratégica de riesgos.
      </div>
    </div>
  </div>
</div>

---

<!-- CAPÍTULO 3: MATRIZ DE LAS 12 VERTICALES -->
<h1>3. Las 12 Verticales Estratégicas Monitoreadas</h1>

<table>
  <thead>
    <tr>
      <th>Vertical</th>
      <th>Vulnerabilidad Digital Principal</th>
      <th>Efecto de Cadena Crítica</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Petróleo Crudo</strong></td>
      <td>Telemetría SCADA en oleoductos y tracking AIS de supertanqueros (VLCC).</td>
      <td>Parálisis de transferencias y retraso en zarpes portuarios.</td>
    </tr>
    <tr>
      <td><strong>2. LNG (Gas Licuado)</strong></td>
      <td>Sistemas de nominación y liquidación en terminales de regasificación.</td>
      <td>Picos de volatilidad en precios spot (TTF / Henry Hub).</td>
    </tr>
    <tr>
      <td><strong>3. Gas Natural</strong></td>
      <td>Monitoreo transfronterizo de estaciones de compresión.</td>
      <td>Riesgo de corte en generación termoeléctrica.</td>
    </tr>
    <tr>
      <td><strong>4. Petroquímica</strong></td>
      <td>Coordinación de cadenas just-in-time de polímeros y fertilizantes.</td>
      <td>Desabasto en manufactura e industria farmacéutica.</td>
    </tr>
    <tr>
      <td><strong>5. Electricidad</strong></td>
      <td>Redes inteligentes (Smart Grids) y despacho interconectado.</td>
      <td>Inestabilidad de frecuencia y riesgo de apagón regional.</td>
    </tr>
    <tr>
      <td><strong>6. Cobre</strong></td>
      <td>Logística de fundiciones y subastas en el London Metal Exchange (LME).</td>
      <td>Disrupción en industrias de electromovilidad e infraestructura.</td>
    </tr>
    <tr>
      <td><strong>7. Litio</strong></td>
      <td>Cadenas de suministro de cátodos para celdas de baterías.</td>
      <td>Retraso en plantas de ensamblaje automotriz global.</td>
    </tr>
    <tr>
      <td><strong>8. Níquel</strong></td>
      <td>Trading y contratos de refinación en Asia-Pacífico.</td>
      <td>Impacto directo en la producción de acero inoxidable.</td>
    </tr>
    <tr>
      <td><strong>9. Cobalto</strong></td>
      <td>Trazabilidad de origen y cumplimiento de estándares ESG.</td>
      <td>Cuellos de botella en almacenamiento de energía.</td>
    </tr>
    <tr>
      <td><strong>10. Trigo & Granos</strong></td>
      <td>Mercados de futuros (CBOT) e inspecciones fitosanitarias.</td>
      <td>Amenaza a la seguridad alimentaria en países importadores.</td>
    </tr>
    <tr>
      <td><strong>11. Semiconductores</strong></td>
      <td>Cadenas de diseño wafer-to-fab entre Taiwán, Japón y EE.UU.</td>
      <td>Parálisis global en electrónica, automotriz y defensa.</td>
    </tr>
    <tr>
      <td><strong>12. Acero</strong></td>
      <td>Gestión de fletes de mineral de hierro y coque metalúrgico.</td>
      <td>Afectación a la construcción pesada y astilleros.</td>
    </tr>
  </tbody>
</table>

---

<!-- CAPÍTULO 4: RESUMEN DE ARRANQUE RÁPIDO -->
<h1>4. Guía de Ejecución y Arranque</h1>

<table>
  <thead>
    <tr>
      <th>Modo de Operación</th>
      <th>Comando de Ejecución</th>
      <th>Uso Recomendado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Modo Completo (API + Web)</strong></td>
      <td><code>cd backend &amp;&amp; npm start</code> | <code>cd frontend &amp;&amp; npm run dev</code></td>
      <td>Entorno completo de análisis con persistencia y jobs.</td>
    </tr>
    <tr>
      <td><strong>Modo Portátil (Standalone)</strong></td>
      <td><code>cd frontend &amp;&amp; npx serve dist</code></td>
      <td>Presentaciones a clientes/inversores en laptops sin conexión.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Principio de Resiliencia Sistémica:</strong> La infraestructura digital ya no es un servicio secundario: es el sistema nervioso del comercio y la energía mundial. Anticipar sus puntos de quiebre es la única defensa real ante la incertidumbre global.
</div>

</body>
</html>
"""


def generate_gr_pdf(output_pdf: Path) -> bool:
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
    temp_html.write_text(GR_HTML, encoding="utf-8")
    
    cmd = [
        str(edge_exe),
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf.resolve()}",
        str(temp_html.resolve())
    ]
    
    print(f"Ejecutando generación de PDF con Edge: {output_pdf.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    if temp_html.exists():
        temp_html.unlink()
        
    if output_pdf.exists() and output_pdf.stat().st_size > 5000:
        size_kb = round(output_pdf.stat().st_size / 1024, 1)
        print(f"PDF generado con éxito ({size_kb} KB): {output_pdf}")
        return True
    else:
        print(f"Error al generar PDF: {res.stderr}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el manual de Global Resilience en PDF")
    parser.add_argument("--downloads", type=Path, default=Path(os.path.expanduser(r"~\Downloads")))
    parser.add_argument("--usb_gr", type=Path, default=Path(r"E:\GLOBALRESILIENCE"))
    parser.add_argument("--desktop", type=Path, default=Path(os.path.expanduser(r"~\OneDrive\Escritorio\Respaldo Negocios\GLOBALRESILIENCE")))
    args = parser.parse_args()
    
    pdf_name = "GlobalResilience_Manual_Usuario_Guia_Operativa_v1.pdf"
    md_name = "GlobalResilience_Manual_Usuario_Guia_Operativa_v1.md"
    
    # 1. Generar en USB
    args.usb_gr.mkdir(parents=True, exist_ok=True)
    usb_pdf = args.usb_gr / pdf_name
    success = generate_gr_pdf(usb_pdf)
    
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
        md_content = f"""# Global Resilience OS — Manual de Usuario y Guía Operativa

**Versión:** 1.0  
**Fecha:** 19 de agosto de 2026  
**Alcance:** Cables Submarinos, Infraestructura Crítica y Cadenas de Suministro de 12 Commodities  
**Arquitectura:** Híbrida Standalone (Navegador) + API REST Express  

---

## 1. ¿Qué Resuelve de Verdad Global Resilience OS?

Global Resilience OS es la plataforma pionera en inteligencia de riesgo sistémico que vincula la infraestructura física digital de cables submarinos con las cadenas de suministro de 12 materias primas críticas. Resuelve 5 grandes dolores estratégicos:

1. **Visibilidad Total de Infraestructura Submarina**: Mapa interactivo de rutas de fibra óptica, estaciones de amarre y zonas de vulnerabilidad geopolítica.
2. **Simulación de Cascadas de Impacto**: El Impact Engine modela el efecto dominó de rupturas de cable en 12 verticales (Petróleo, LNG, Gas, Cobre, Litio, Semiconductores, Trigo, etc.).
3. **Modelado de Curvas de Recuperación (MTTR)**: Estimación temporal realista de reparación física con barcos cableros y re-enrutamiento secundario.
4. **Marketplace de Capacidad Alternativa**: Simulación de contratos de reserva y compra anticipada de ancho de banda para evitar sobrecostos spot.
5. **Sala de Crisis y Brief Ejecutivo**: Generación instantánea del informe PDF para comités de crisis y directores de riesgo.

---

## 2. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: World Map] ➔ [Paso 2: Scenario Builder] ➔ [Paso 3: Impact Engine]
➔ [Paso 4: Recovery Curve] ➔ [Paso 5: Capacity Marketplace] ➔ [Paso 6: Executive Brief PDF]
```

### Paso 1 — Exploración del Mapa Mundial de Infraestructura
- Visualización de la red global de cables submarinos, capacidades en Tbps y puntos de fallo único.

### Paso 2 — Selección o Creación de Escenarios
- Elección de crisis predefinidas (Mar Rojo, Estrecho de Malaca, Falla Transatlántica) o diseño a la medida.

### Paso 3 — Ejecución del Impact Engine
- Cuantificación de la exposición por vertical con semáforo de criticidad y tiempo de afectación.

### Paso 4 — Análisis de Perfiles de Recuperación
- Evaluación de las fases de re-enrutamiento automático, degradación por congestión y reparación física.

### Paso 5 — Mitigación en el Capacity Marketplace
- Simulación de contratos de reserva de ancho de banda alterno y enlaces satelitales.

### Paso 6 — Exportación del Executive Resilience Brief en PDF
- Descarga del informe de inteligencia estratégica para comités de dirección y aseguradoras.
"""
        (args.usb_gr / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versiones Markdown guardadas en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
