"""Generador del Manual de Usuario y Guía Operativa de Global Resilience OS (Versión Integral con Rutas Multimodales y Módulo Mi Impacto).

Compila un documento HTML con tipografía geopolítica e industrial, flujos visuales paso a paso,
tablas de decisión, capas cartográficas multimodales, estimador personalizado "Mi Impacto" y exportación a PDF vectorial.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

HTML_CONTENT = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Global Resilience OS — Manual de Usuario y Guía Operativa Integral</title>
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
      content: "Global Resilience OS — Manual de Usuario y Guía Operativa v2.0";
      font-size: 8.5pt;
      color: #64748b;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
  }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
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
    background: #082f49;
    color: #e0f2fe;
    font-size: 8.5pt;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 999px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 10px 0;
  }
  .cover-subtitle {
    font-size: 12pt;
    color: #475569;
    max-width: 620px;
    margin: 0 auto 25px auto;
    font-weight: 400;
  }
  .cover-divider {
    width: 80px;
    height: 4px;
    background: #0284c7;
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
    background: #f0f9ff;
    padding: 14px 18px;
    border-left: 4px solid #0284c7;
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
    color: #0369a1;
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
    padding: 10px 14px;
    margin-bottom: 9px;
    page-break-inside: avoid;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .solution-title {
    font-weight: 700;
    color: #0369a1;
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
    background: #e0f2fe;
    color: #0369a1;
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
    background: #0284c7;
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
    color: #0369a1;
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
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-dark { background: #082f49; color: #e0f2fe; }

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
  <div class="cover-badge">Guía Operativa & Manual de Usuario • Versión 2.0</div>
  <h1 class="cover-title">Global Resilience OS</h1>
  <div class="cover-subtitle">Plataforma de Inteligencia de Riesgo Sistémico, Continuidad para Infraestructura Crítica, Cables Submarinos y Cadenas de Suministro Multimodales</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Infraestructura Crítica</strong>
        <span>Cables Submarinos + Nodos Transoceánicos</span>
      </div>
      <div class="cover-meta-item">
        <strong>Capas Multimodales</strong>
        <span>Rutas Marítimas, Aéreas Express y Ferrocarril</span>
      </div>
      <div class="cover-meta-item">
        <strong>Verticales Estratégicas</strong>
        <span>12 Commodities Críticos Globales</span>
      </div>
      <div class="cover-meta-item">
        <strong>Estimación Personalizada</strong>
        <span>Módulo "Mi Impacto" en $USD / Hora</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer una guía exhaustiva para comités de riesgo, directores de continuidad y analistas geopolíticos: desde la visualización cartográfica multimodal de cables y corredores de carga, hasta la simulación de disrupciones, estimación de impacto personalizado por empresa ("Mi Impacto"), reserva de capacidad y emisión del Executive Resilience Brief en PDF.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad Global Resilience OS?</h1>
<p>
  El 99% del tráfico digital, transacciones interbancarias ($10+ billones de USD diarios) y telemetría de logística global depende de <strong>cables submarinos de fibra óptica</strong>. Al mismo tiempo, el comercio físico transita por estrechos marítimos vulnerables (Suez, Malaca, Ormuz) y corredores aéreos/ferroviarios interdependientes.
</p>
<p>
  <strong>Global Resilience OS es la primera plataforma que correlaciona la infraestructura digital con las cadenas de suministro físicas</strong>, resolviendo 5 problemas críticos:
</p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Visibilidad Multimodal Integrada (Cables + Marítimo + Aéreo + Tren)</div>
  <p><strong>El problema:</strong> Las empresas monitorean sus servidores por un lado y sus barcos por otro, sin entender cómo una falla digital interrumpe las terminales de carga portuarias y aduaneras.</p>
  <p><strong>Lo que resuelve:</strong> Capas cartográficas activables que integran cables submarinos en vivo con rutas marítimas (Asia-Europa, Suez, Golfo Pérsico), transporte aéreo express (Taiwán semiconductores) y trenes industriales (T-MEC / China-Europe).</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Estimador de Pérdida Personalizada ("Mi Impacto")</div>
  <p><strong>El problema:</strong> Las estadísticas macroeconómicas globales no le dicen a un director de planta cuánto dinero perderá su fábrica en específico.</p>
  <p><strong>Lo que resuelve:</strong> El módulo "Mi Impacto" traduce los cortes globales a la realidad de la empresa: ingresa facturación anual, vertical y dependencia import/export para proyectar la pérdida en dólares por hora.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Impact Engine Determinista en 12 Commodities Críticos</div>
  <p><strong>El problema:</strong> Incertidumbre sobre el efecto cascada de un corte en el Mar Rojo sobre la industria automotriz, química o de semiconductores.</p>
  <p><strong>Lo que resuelve:</strong> Motor de cálculo que evalúa vulnerabilidades en Petróleo, GNL, Gas, Petroquímica, Electricidad, Cobre, Litio, Níquel, Cobalto, Trigo, Semiconductores y Acero.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Perfiles de Recuperación y Tiempo Medio de Reparación (MTTR)</div>
  <p><strong>El problema:</strong> Reparar un cable submarino toma semanas y depende de buques cableros escasos, provocando retrasos no presupuestados.</p>
  <p><strong>Lo que resuelve:</strong> Curvas de degradación temporal y disponibilidad de buques de reparación para estimar con precisión el tiempo de retorno a la normalidad.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Marketplace de Capacidad Alternativa y Sala de Crisis (PDF)</div>
  <p><strong>El problema:</strong> Tras una catástrofe, los precios del ancho de banda y fletes se disparan en el mercado spot.</p>
  <p><strong>Lo que resuelve:</strong> Contratación simulada de enlaces de respaldo redundantes y generación instantánea del Executive Resilience Brief en PDF para comités de crisis.</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: FLUJO VERTICAL PASO A PASO -->
<h1>2. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  A continuación se detalla la secuencia de trabajo profesional en Global Resilience OS:
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Configuración de la Huella Operativa en "Mi Impacto"</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Ingresa a la sección <strong>"Mi Impacto"</strong> para contextualizar la plataforma:</p>
    <ul>
      <li>Selecciona tu vertical industrial (ej. Automotriz, Electrónica, Energía, Siderúrgico).</li>
      <li>Indica tu región operativa (ej. México / Norteamérica, Europa, Asia-Pacífico).</li>
      <li>(Opcional) Ingresa tu facturación anual en USD y porcentaje de dependencia internacional.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Calibro los modelos matemáticos para que las alertas y simulaciones se expresen en métricas de mi propia empresa.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Perfil corporativo activo guardado localmente de forma 100% privada.
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Navegación Cartográfica Multimodal (Cables y Rutas de Carga)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el <strong>World Map</strong> interactivo, activa o desactiva las capas superiores:</p>
    <ul>
      <li><strong>Capa Cables Submarinos:</strong> Rutas transoceánicas y landing stations con estado en vivo.</li>
      <li><strong>Capa Rutas Marítimas:</strong> Tráfico de buques en estrechos estratégicos (Suez, Malaca, Ormuz).</li>
      <li><strong>Capa Carga Aérea y Tren:</strong> Corredores de semiconductores (Taiwán-EEUU) y trenes industriales T-MEC.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Identifico puntos únicos de falla (SPOF) donde convergen cables de datos y rutas logísticas físicas.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Mapa de calor de exposición geográfica en tiempo real.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Simulación de Crisis y Ejecución del Impact Engine</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el <strong>Scenario Builder</strong>, selecciona una contingencia (ej. <em>"Corte Masivo en el Mar Rojo"</em> o <em>"Bloqueo en el Estrecho de Malaca"</em>) y presiona <strong>"Simulate Impact"</strong>.</p>
    <table>
      <thead>
        <tr>
          <th>Vertical Afectada</th>
          <th>Nivel de Exposición</th>
          <th>Pérdida Sectorial Proyectada</th>
          <th>Impacto en Tu Empresa ("Mi Impacto")</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Semiconductores</strong></td>
          <td><span class="badge badge-rejected">CRÍTICO (88%)</span></td>
          <td>$4.2M USD / hora</td>
          <td><strong>$12,400 USD / hora</strong></td>
        </tr>
        <tr>
          <td><strong>GNL & Energía</strong></td>
          <td><span class="badge badge-review">ALTO (65%)</span></td>
          <td>$2.8M USD / hora</td>
          <td><strong>$6,800 USD / hora</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Cuantifico con precisión matemática el costo financiero de la inacción ante la contingencia.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Matriz de afectación por vertical y estimación de pérdidas en dólares.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Activación de Capacidad de Respaldo en el Marketplace</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Accede al <strong>Capacity Marketplace</strong>:</p>
    <ol>
      <li>Revisa rutas terrestres o satelitales alternativas y capacidad de ancho de banda disponible.</li>
      <li>Simula la contratación de contratos de reserva (*Capacity Reserve*) para mitigar la congestión.</li>
      <li>Verifica el tiempo de conmutación automática de tráfico (*rerouting switch time*).</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Aseguro la continuidad de mis operaciones críticas antes de que los precios del mercado spot se multipliquen.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Plan de contingencia y redundancia activado con costos predecibles.
      </div>
    </div>
  </div>
</div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Emisión del Executive Resilience Brief en PDF</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el proceso?</strong></p>
    <ol>
      <li>Haz clic en <strong>"Export Executive Resilience Brief (PDF)"</strong>.</li>
      <li>El sistema compila un informe C-Level con el análisis de la contingencia, pérdidas estimadas por hora en tu empresa, rutas de respaldo seleccionadas y cronograma de reparación (MTTR).</li>
      <li>Preséntalo ante el Consejo de Administración o Comité de Continuidad para autorizar decisiones de mitigación.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Entrego información ejecutiva clara y procesable a la alta dirección en minutos en lugar de semanas.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Dossier de resiliencia formal y auditable para toma de decisiones inmediata.
      </div>
    </div>
  </div>
</div>

---

<!-- CAPÍTULO 3: MATRIZ DE VERTICALES -->
<h1>3. Catálogo de las 12 Verticales Críticas Monitoreadas</h1>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Vertical Crítica</th>
      <th>Puntos de Vulnerabilidad en Cadenas Globales</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><strong>Petróleo Crudo</strong></td>
      <td>Monitoreo de terminales de carga en el Golfo Pérsico, Mar Rojo y Estrecho de Malaca.</td>
    </tr>
    <tr>
      <td>2</td>
      <td><strong>GNL (Gas Licuado)</strong></td>
      <td>Flujo de metaneros desde Qatar, EE.UU. y Australia hacia Europa y Asia Oriental.</td>
    </tr>
    <tr>
      <td>3</td>
      <td><strong>Gasoductos & Gas Natural</strong></td>
      <td>Sistemas SCADA y telemetría de distribución transfronteriza.</td>
    </tr>
    <tr>
      <td>4</td>
      <td><strong>Petroquímica</strong></td>
      <td>Cadenas de polímeros y resinas para la industria médica y automotriz.</td>
    </tr>
    <tr>
      <td>5</td>
      <td><strong>Electricidad & Redes</strong></td>
      <td>Interconexiones eléctricas regionales y redes inteligentes transcontinentales.</td>
    </tr>
    <tr>
      <td>6</td>
      <td><strong>Cobre & Metales Base</strong></td>
      <td>Rutas marítimas del Pacífico desde Chile y Perú hacia refinerías en Asia.</td>
    </tr>
    <tr>
      <td>7</td>
      <td><strong>Litio</strong></td>
      <td>Cadenas de suministro del triángulo del litio hacia plantas de baterías.</td>
    </tr>
    <tr>
      <td>8</td>
      <td><strong>Níquel & Cobalto</strong></td>
      <td>Suministros de Indonesia y R.D. Congo para almacenamiento energético y acero inoxidable.</td>
    </tr>
    <tr>
      <td>9</td>
      <td><strong>Trigo & Granos</strong></td>
      <td>Seguridad alimentaria y fletes a granel desde el Mar Negro y América.</td>
    </tr>
    <tr>
      <td>10</td>
      <td><strong>Semiconductores</strong></td>
      <td>Cadenas wafer-to-fab entre Taiwán, Japón, Corea del Sur, Europa y EE.UU.</td>
    </tr>
    <tr>
      <td>11</td>
      <td><strong>Acero & Metalurgia</strong></td>
      <td>Logística de mineral de hierro y coque para construcción y astilleros.</td>
    </tr>
    <tr>
      <td>12</td>
      <td><strong>Carga Aérea Express</strong></td>
      <td>Corredores logísticos aéreos de alto valor agregado y tiempos críticos just-in-time.</td>
    </tr>
  </tbody>
</table>

---

<!-- CAPÍTULO 4: DIFERENCIADORES FRENTE A LA COMPETENCIA -->
<h1>4. Diferenciadores Clave Frente a la Competencia y Ventajas de Mercado</h1>

<table>
  <thead>
    <tr>
      <th>Capacidad / Métrica</th>
      <th>Monitores de Telecom (TeleGeography / RIPE)</th>
      <th>Supply Chain Analytics (Resilinc / Everstream)</th>
      <th>Consultoría Geopolítica (McKinsey / Eurasia)</th>
      <th>Global Resilience OS (Plataforma Integral)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Monitoreo de Cables Submarinos</strong></td>
      <td>Solo datos de red/latencia IP</td>
      <td>No incluye infraestructura submarina</td>
      <td>Menciones narrativas</td>
      <td><span class="badge badge-approved">Mapeo Físico + Topología Global</span></td>
    </tr>
    <tr>
      <td><strong>Capas Marítimas, Aéreas y Tren</strong></td>
      <td>No disponible</td>
      <td>Solo seguimiento de camiones</td>
      <td>No disponible</td>
      <td><span class="badge badge-approved">Multimodal (Suez, T-MEC, Air Express)</span></td>
    </tr>
    <tr>
      <td><strong>Módulo Personalizado "Mi Impacto"</strong></td>
      <td>No disponible</td>
      <td>No disponible a nivel planta</td>
      <td>Estudios caros a la medida</td>
      <td><span class="badge badge-approved">Pérdida en $USD/Hora de TU Empresa</span></td>
    </tr>
    <tr>
      <td><strong>Correlación con 12 Commodities</strong></td>
      <td>No disponible</td>
      <td>Enfocado solo en proveedores N1</td>
      <td>Análisis cualitativo sin telemetría</td>
      <td><span class="badge badge-approved">Correlación Multimodal en Vivo</span></td>
    </tr>
    <tr>
      <td><strong>Marketplace de Capacidad de Respaldo</strong></td>
      <td>No disponible</td>
      <td>No disponible</td>
      <td>No disponible</td>
      <td><span class="badge badge-approved">Contratación de Redundancia Inmediata</span></td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Principio de Resiliencia Sistémica:</strong> La infraestructura digital y física conforma el sistema nervioso del comercio mundial. Anticipar sus puntos de quiebre y calcular el impacto exacto en dólares es la única defensa real ante la incertidumbre global.
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
    temp_html.write_text(HTML_CONTENT, encoding="utf-8")
    
    cmd = [
        str(edge_exe),
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf.resolve()}",
        str(temp_html.resolve())
    ]
    
    print(f"Ejecutando generación de PDF de Global Resilience OS: {output_pdf.name}...")
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
    parser = argparse.ArgumentParser(description="Genera el manual de Global Resilience OS en PDF")
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
        
        # 4. Guardar versión Markdown enriquecida
        md_content = f"""# Global Resilience OS — Manual de Usuario y Guía Operativa Integral

**Versión:** 2.0 (Con Rutas Comerciales Multimodales y Módulo Personalizado "Mi Impacto")  
**Fecha:** 19 de agosto de 2026  
**Alcance:** Cables Submarinos, Rutas Marítimas (Suez/Ormuz), Corredores Aéreos Express (Semiconductores), Corredor Ferroviario T-MEC y 12 Commodities  

---

## 1. ¿Qué Resuelve de Verdad Global Resilience OS?

Global Resilience OS es la primera plataforma de inteligencia geopolítica e infraestructura crítica que une la conectividad submarina con las cadenas de suministro globales. Resuelve 5 grandes dolores:

1. **Visibilidad Cartográfica Multimodal**: Muestra en tiempo real cables submarinos, rutas marítimas transoceánicas, transporte aéreo de semiconductores y corredores ferroviarios industriales.
2. **Estimador Personalizado "Mi Impacto"**: Traduce eventos globales a la realidad de tu propia empresa (ingresa facturación en USD, vertical y dependencia import/export para calcular pérdidas por hora).
3. **Impact Engine en 12 Commodities**: Evalúa el efecto dominó en Petróleo, GNL, Gas, Petroquímica, Cobre, Litio, Níquel, Cobalto, Granos, Semiconductores, Acero y Logística Aérea.
4. **Modelado de Recuperación y MTTR**: Estima curvas de degradación y tiempos de retorno a la normalidad según disponibilidad de buques cableros.
5. **Marketplace de Capacidad y Crisis Brief en PDF**: Permite reservar capacidad de respaldo y emite informes ejecutivos instantáneos para comités de dirección.

---

## 2. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: Configurar "Mi Impacto"] 
   ➔ [Paso 2: Exploración Cartográfica Multimodal] 
   ➔ [Paso 3: Simulación de Crisis con Impact Engine] 
   ➔ [Paso 4: Reserva de Capacidad en Marketplace] 
   ➔ [Paso 5: Emisión del Executive Brief en PDF]
```
"""
        (args.usb_gr / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versiones Markdown guardadas en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
