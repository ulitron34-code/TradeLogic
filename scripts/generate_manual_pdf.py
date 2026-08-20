"""Generador del Manual de Usuario y Guía Operativa de TradeLogic (Versión Integral con los 5 Diferenciadores).

Compila un documento HTML con tipografía jurídica y técnica, flujos visuales paso a paso,
tablas de decisión, insignias de estado y exportación a PDF vectorial vía Microsoft Edge headless.
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
<title>TradeLogic — Manual de Usuario y Guía Operativa Integral</title>
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
      content: "TradeLogic — Manual de Usuario y Guía Operativa v2.0";
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
    background: #1e1b4b;
    color: #e0e7ff;
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
    background: #2563eb;
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
    background: #eff6ff;
    padding: 14px 18px;
    border-left: 4px solid #2563eb;
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
    color: #1e3a8a;
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
    color: #1e3a8a;
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
    background: #dbeafe;
    color: #1e40af;
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
    background: #2563eb;
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
    color: #1e3a8a;
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
  .badge-dark { background: #0f172a; color: #f8fafc; }

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
  <h1 class="cover-title">TradeLogic</h1>
  <div class="cover-subtitle">Plataforma Integral de Inteligencia Aduanera, Cumplimiento Arancelario, Pre-despacho y Defensa Fiscal en México</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Cobertura Arancelaria</strong>
        <span>LIGIE 2026 / 19,690 Fracciones + NICO</span>
      </div>
      <div class="cover-meta-item">
        <strong>Regulaciones No Arancelarias</strong>
        <span>29,490 NOMs, SENASICA y COFEPRIS</span>
      </div>
      <div class="cover-meta-item">
        <strong>Criterios Vinculantes SAT</strong>
        <span>Anexo 6 RGCE + Jurisprudencia SCJN</span>
      </div>
      <div class="cover-meta-item">
        <strong>Pre-Despacho & Defensa</strong>
        <span>Layout SAAI M3 + Art. 47 LA / PAMA</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer a directores de comercio exterior, agentes aduanales, clasificadores y abogados una guía paso a paso para ejecutar el ciclo completo de importación: desde la ingesta inteligente de facturas extranjeras y cruce con el Anexo 6 del SAT, hasta la generación del layout de pedimento, auditoría IMMEX y emisión del escrito legal de defensa ante el SAT/ANAM.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad TradeLogic?</h1>
<p>
  En México, un error de clasificación arancelaria no es una simple errata administrativa: provoca el <strong>embargo precautorio de mercancías (PAMA), multas de hasta el 150% del valor comercial, cancelación del padrón de importadores y pérdida de programas IMMEX</strong>.
</p>
<p>
  <strong>TradeLogic resuelve la brecha operativa y legal del comercio exterior</strong> mediante 5 grandes super-poderes que ninguna otra plataforma en el mercado integra en un solo flujo:
</p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Ingesta Inteligente de Facturas Internacionales (Inglés / Chino / Alemán)</div>
  <p><strong>El problema:</strong> El clasificador pierde horas leyendo invoices o packing lists con descripciones técnicas confusas y buscando datos de ingeniería a mano.</p>
  <p><strong>Lo que TradeLogic resuelve:</strong> Módulo de extracción automática que lee facturas comerciales completas, desglosa partidas, detecta SKUs y asigna capítulos y familias arancelarias sugeridas en segundos.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Motor de Criterios Vinculantes del Anexo 6 de las RGCE (SAT)</div>
  <p><strong>El problema:</strong> Clasificar con base en el texto genérico de la ley sin saber que el SAT ya emitió una resolución obligatoria previa sobre ese producto exacto.</p>
  <p><strong>Lo que TradeLogic resuelve:</strong> Alertas automáticas cuando una mercancía coincide con un criterio oficial del Anexo 6 del SAT, blindando la operación ante criterios cambiantes de las aduanas.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Pre-validador y Generador de Layout de Pedimento (SAAI M3 / Anexo 22 RGCE)</div>
  <p><strong>El problema:</strong> Tener que re-capturar a mano los datos en los sistemas de pedimentos tradicionales, generando errores en claves de permisos y métodos de valoración.</p>
  <p><strong>Lo que TradeLogic resuelve:</strong> Genera directamente los registros de transmisión 501, 551 y 554 de intercambio aduanero con validación de contribuciones (IGI, DTA, IVA).</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Generador Oficial de Consultas (Art. 47 Ley Aduanera) y Defensa de PAMA</div>
  <p><strong>El problema:</strong> El alto costo y tiempo de contratar despachos legales para redactar consultas formales de clasificación o contestaciones de actas de embargo.</p>
  <p><strong>Lo que TradeLogic resuelve:</strong> Genera con 1 clic el escrito procesal formal ante la ANAM/SAT con antecedentes, motivación técnica, notas de partida, jurisprudencia SCJN y tabla de pruebas certificadas con hash SHA-256.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Módulo Especializado de Cumplimiento IMMEX / Nearshoring (Anexo 24 / 31)</div>
  <p><strong>El problema:</strong> Sanciones retroactivas por importar mercancías sensibles sin permiso o calcular mal la actualización de recargos e INPC en cambios de régimen.</p>
  <p><strong>Lo que TradeLogic resuelve:</strong> Semáforo de mercancías sensibles del Anexo II del Decreto IMMEX (acero, textiles, aluminio) y calculadora fiscal exacta para regularizaciones y cambios de régimen de temporal a definitiva (Art. 21 y 17-A CFF).</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: FLUJO VERTICAL PASO A PASO -->
<h1>2. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  A continuación se detalla la secuencia de trabajo profesional en TradeLogic para pasar de una factura de proveedor extranjero a un despacho aduanero defendible:
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Ingesta de la Factura Comercial (Invoice / Packing List)</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Ve a la pestaña <strong>"Facturas / Invoices"</strong> y pega el contenido del invoice del proveedor extranjero (o sube el archivo CSV/texto).</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Desgloso automáticamente todas las partidas, SKUs, precios unitarios y descripciones en inglés o chino.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Tabla de partidas desglosadas con sugerencias de familias arancelarias listas para clasificación.
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Clasificación Arancelaria y Detección de Criterios SAT (Anexo 6)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> El motor cruza la mercancía contra las 19,690 fracciones de la LIGIE y el <strong>Anexo 6 de las RGCE</strong>:</p>
    <ul>
      <li>Asigna el NICO correspondiente a 10 dígitos.</li>
      <li>Verifica si existe un <strong>Criterio Vinculante del SAT</strong> (ej. fuentes de poder de servidor en 8504.40 vs. 8473).</li>
      <li>Mapea las <strong>29,490 regulaciones no arancelarias</strong> (NOMs de seguridad, certificados SENASICA o COFEPRIS).</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Elimino el riesgo de clasificación errónea y aseguro el cumplimiento previo de permisos en frontera.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Candidatos rankeados con semáforo de confianza (<span class="badge badge-approved">HIGH</span> / <span class="badge badge-review">REVIEW</span>) y alertas del SAT.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Cálculo de Landed Cost, Reglas de Origen (T-MEC) e IMMEX</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el calculador financiero y de cumplimiento:</p>
    <ul>
      <li>Calcula el IGI, DTA (8 al millar) e IVA (16%) de forma determinista.</li>
      <li>Aplica la tasa preferencial si la mercancía califica bajo el <strong>T-MEC o TLCUEM</strong> (evaluando las 16,366 reglas de origen).</li>
      <li>Si es empresa maquiladora, evalúa en el <strong>Módulo IMMEX</strong> si la mercancía es sensible (acero/textil) o calcula el cambio de régimen con INPC y recargos.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Determino el costo total de importación y el régimen aduanero óptimo (definitivo vs. temporal).
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Desglose financiero exacto por partida y constancia de origen.
      </div>
    </div>
  </div>
</div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Generación y Validación del Layout de Pedimento (SAAI M3)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En el panel <strong>"Pre-validador y Layout de Pedimento"</strong> dentro del expediente:</p>
    <ol>
      <li>Ingresa número de pedimento, aduana de entrada (ej. 240 Nuevo Laredo) y patente.</li>
      <li>El sistema genera los registros <strong>501</strong> (encabezado), <strong>551</strong> (partidas) y <strong>554</strong> (permisos NOM).</li>
      <li>Valida automáticamente que no existan errores de estructura antes de transmitir a VUCEM o software aduanero.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Evito multas por inconsistencias en el pedimento y agilizo la captura en aduanas.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Payload de pedimento listo para transmisión electrónica.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Generador Legal de Consultas (Art. 47 LA) y Defensa PAMA</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Si la mercancía es de clasificación dudosa o la aduana emitió un acta de irregularidades:</p>
    <ul>
      <li><strong>Para prevenir:</strong> Selecciona <em>"Consulta Art. 47 LA"</em> para generar el memorial oficial ante la ANAM.</li>
      <li><strong>Para defender:</strong> Selecciona <em>"Defensa PAMA"</em> ingresando el número de acta y la aduana impugnante.</li>
    </ul>
    <p>El sistema genera el escrito formal con petitorios, jurisprudencia SCJN aplicable e inventario de pruebas.</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Blindaje legal preventivo o defensa inmediata ante embargos aduaneros sin costo de abogados externos.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Escrito legal procesal formal listo para firma y presentación.
      </div>
    </div>
  </div>
</div>

<!-- PASO 6 -->
<div class="flow-step-container">
  <div class="flow-step-number">6</div>
  <div class="flow-step-header">Revisión Humana y Emisión del Dossier Criptográfico SHA-256</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el proceso?</strong></p>
    <ol>
      <li>El Agente Aduanal o Clasificador Profesional revisa y presiona <strong>"Aprobar Expediente"</strong>.</li>
      <li>Descarga el <strong>Expediente Técnico Defendible (Dossier PDF)</strong> con sello de tiempo, huella criptográfica SHA-256 de todas las fotos y fichas técnicas, y trazabilidad total.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Garantizo la prueba plena e inmutable que protege a la empresa ante cualquier auditoría posterior del SAT.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Expediente aduanero blindado y archivado de por vida.
      </div>
    </div>
  </div>
</div>

---

<!-- CAPÍTULO 3: MATRIZ DE FUENTES OFICIALES -->
<h1>3. Matriz de Fuentes Oficiales Integradas</h1>

<table>
  <thead>
    <tr>
      <th>Fuente Oficial</th>
      <th>Contenido / Registros</th>
      <th>Impacto Operativo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>LIGIE 2026 / SNICE</strong></td>
      <td>19,690 Fracciones Arancelarias y NICO</td>
      <td>Tasa IGI general, unidad de medida de tarifa y notas legales.</td>
    </tr>
    <tr>
      <td><strong>Anexo 6 de las RGCE (SAT)</strong></td>
      <td>Criterios Vinculantes de Clasificación SAT</td>
      <td>Precedentes obligatorios emitidos por la autoridad aduanera.</td>
    </tr>
    <tr>
      <td><strong>Catálogo Maestro NOMs</strong></td>
      <td>16,967 Requerimientos de Normas Oficiales</td>
      <td>Cumplimiento de seguridad, etiquetado y certificados de calibración.</td>
    </tr>
    <tr>
      <td><strong>SENASICA & COFEPRIS</strong></td>
      <td>12,523 Regulaciones Sanitarias y Fitosanitarias</td>
      <td>Inspección de alimentos, químicos y dispositivos médicos.</td>
    </tr>
    <tr>
      <td><strong>Tratados de Libre Comercio</strong></td>
      <td>16,366 Reglas de Origen (T-MEC, TLCUEM, TIPAT)</td>
      <td>Arancel preferencial 0% y cálculo de valor de contenido regional.</td>
    </tr>
    <tr>
      <td><strong>Decreto IMMEX (Anexo II)</strong></td>
      <td>Fracciones Sensibles (Acero, Textil, Aluminio)</td>
      <td>Control de plazos de permanencia temporal y permisos de Economía.</td>
    </tr>
    <tr>
      <td><strong>SCJN (Semanario Judicial)</strong></td>
      <td>Tesis y Precedentes Obligatorios en Materia Aduanera</td>
      <td>Fundamentación de escritos Art. 47 LA y alegatos contra PAMA.</td>
    </tr>
  </tbody>
</table>

---

<!-- CAPÍTULO 4: REGLAS DE ORO -->
<h1>4. Buenas Prácticas y Reglas de Oro en TradeLogic</h1>

<div class="callout callout-success">
  <strong>Principio Rector de TradeLogic:</strong> La inteligencia artificial procesa millones de datos en segundos y sugiere la mejor estrategia; el agente aduanal profesional revisa, autoriza y firma. La tecnología potencia la capacidad del experto, garantizando certeza jurídica absoluta.
</div>

</body>
</html>
"""


def generate_tradelogic_pdf(output_pdf: Path) -> bool:
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
    
    print(f"Ejecutando generación de PDF integral de TradeLogic: {output_pdf.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    if temp_html.exists():
        temp_html.unlink()
        
    if output_pdf.exists() and output_pdf.stat().st_size > 5000:
        size_kb = round(output_pdf.stat().st_size / 1024, 1)
        print(f"PDF integral de TradeLogic generado con éxito ({size_kb} KB): {output_pdf}")
        return True
    else:
        print(f"Error al generar PDF: {res.stderr}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el manual integral de TradeLogic en PDF")
    parser.add_argument("--downloads", type=Path, default=Path(os.path.expanduser(r"~\Downloads")))
    parser.add_argument("--usb_aduana", type=Path, default=Path(r"E:\ADUANA\TradeLogic"))
    parser.add_argument("--usb_tradelogistic", type=Path, default=Path(r"E:\tradelogistic"))
    parser.add_argument("--desktop", type=Path, default=Path(os.path.expanduser(r"~\OneDrive\Escritorio\Respaldo Negocios\ADUANA\TradeLogic")))
    args = parser.parse_args()
    
    pdf_name = "TradeLogic_Manual_Usuario_Guia_Operativa_v1.pdf"
    md_name = "TradeLogic_Manual_Usuario_Guia_Operativa_v1.md"
    
    # 1. Generar en USB Principal
    args.usb_aduana.mkdir(parents=True, exist_ok=True)
    usb_pdf = args.usb_aduana / pdf_name
    success = generate_tradelogic_pdf(usb_pdf)
    
    if success:
        # 2. Copiar a Descargas
        args.downloads.mkdir(parents=True, exist_ok=True)
        downloads_pdf = args.downloads / pdf_name
        shutil.copy2(usb_pdf, downloads_pdf)
        print(f"Copiado a Descargas: {downloads_pdf}")
        
        # 3. Copiar a USB tradelogistic
        args.usb_tradelogistic.mkdir(parents=True, exist_ok=True)
        tradelogistic_pdf = args.usb_tradelogistic / pdf_name
        shutil.copy2(usb_pdf, tradelogistic_pdf)
        print(f"Copiado a USB tradelogistic: {tradelogistic_pdf}")
        
        # 4. Copiar a Escritorio
        args.desktop.mkdir(parents=True, exist_ok=True)
        desktop_pdf = args.desktop / pdf_name
        shutil.copy2(usb_pdf, desktop_pdf)
        print(f"Copiado a Escritorio: {desktop_pdf}")
        
        # 5. Guardar versión Markdown enriquecida
        md_content = f"""# TradeLogic — Manual de Usuario y Guía Operativa Integral

**Versión:** 2.0 (Evolución Integral con los 5 Diferenciadores de Mercado)  
**Fecha:** 19 de agosto de 2026  
**Cobertura Oficial:** LIGIE 2026 (19,690 Fracciones + NICO), Anexo 6 RGCE (Criterios SAT), 29,490 NOMs/SENASICA/COFEPRIS, 16,366 Reglas T-MEC, Decreto IMMEX Anexo II y Jurisprudencia SCJN.  

---

## 1. ¿Qué Resuelve de Verdad TradeLogic?

TradeLogic es la plataforma integral de inteligencia aduanera, cumplimiento arancelario y pre-despacho en México. Resuelve los 5 grandes riesgos y sobrecostos operativos del comercio exterior:

1. **Ingesta Inteligente de Facturas Internacionales (Inglés / Chino / Alemán)**: Desglosa automáticamente facturas de proveedores extranjeros, detecta SKUs y asigna familias arancelarias en bloque.
2. **Motor de Criterios Vinculantes del Anexo 6 de las RGCE (SAT)**: Detecta proactivamente resoluciones obligatorias del SAT para evitar clasificar con base en preceptos superados.
3. **Pre-validador y Layout de Pedimento SAAI M3 (Anexo 22 RGCE / VUCEM)**: Genera los registros de transmisión 501, 551 y 554 con cálculo matemático de IGI, DTA e IVA.
4. **Generador Oficial de Consultas (Art. 47 Ley Aduanera) y Defensa PAMA**: Redacta memoriales jurídicos formales ante el SAT/ANAM con motivación técnica, notas de partida y jurisprudencia SCJN.
5. **Módulo Especializado para Maquiladoras / IMMEX (Anexo 24 / 31)**: Identifica fracciones sensibles del Anexo II del Decreto IMMEX y calcula la liquidación fiscal por cambio de régimen con INPC y recargos (Art. 21 CFF).

---

## 2. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: Ingesta de Factura Extranjera] 
   ➔ [Paso 2: Clasificación LIGIE/NICO con Anexo 6 SAT & NOMs]
   ➔ [Paso 3: Landed Cost, Reglas de Origen T-MEC e IMMEX]
   ➔ [Paso 4: Generación y Validación de Layout SAAI M3]
   ➔ [Paso 5: Consultas Art. 47 LA / Memorial de Defensa PAMA]
   ➔ [Paso 6: Revisión Humana y Emisión de Dossier SHA-256]
```

### Paso 1 — Ingesta de Factura Comercial (Invoice / Packing List)
- Pega el contenido o sube el CSV de la factura internacional; el sistema extrae ítems, cantidades y precios unitarios.

### Paso 2 — Clasificación Arancelaria y Detección de Criterios SAT
- Cruce contra las 19,690 fracciones, alertas del Anexo 6 del SAT y 29,490 regulaciones no arancelarias (NOMs).

### Paso 3 — Landed Cost, T-MEC e IMMEX
- Cálculo de impuestos aduaneros, calificación de origen y semáforo de insumos sensibles IMMEX.

### Paso 4 — Generación de Layout de Pedimento SAAI M3
- Emisión de registros 501, 551 y 554 validados para sistemas aduaneros y VUCEM.

### Paso 5 — Generador Legal de Consultas (Art. 47 LA) y Defensa PAMA
- Redacción automatizada de escritos procesales con pruebas criptográficas SHA-256 ante la ANAM/SAT.

### Paso 6 — Revisión Humana y Dossier Defendible
- Autorización formal del Agente Aduanal y descarga del expediente PDF inmutable.
"""
        (args.usb_aduana / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.usb_tradelogistic / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versiones Markdown guardadas en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
