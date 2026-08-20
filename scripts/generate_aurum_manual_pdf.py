"""Generador del Manual de Usuario y Guía Operativa de AURUM en formato PDF de alta calidad.

Compila un documento HTML corporativo con tipografía, flujo vertical paso a paso,
tablas de umbrales UMA, matriz de agentes IA, insignias de estado y diseño profesional a PDF vectorial usando Edge headless.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

AURUM_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>AURUM — Manual de Usuario y Guía Operativa PLD / SAT</title>
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
      content: "AURUM SaaS — Manual de Usuario y Guía Operativa PLD / SAT v1.0";
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
    background: #fef3c7;
    color: #92400e;
    font-size: 9pt;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 999px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
    border: 1px solid #fde68a;
  }
  .cover-title {
    font-size: 30pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 12px 0;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    max-width: 600px;
    margin: 0 auto 30px auto;
    font-weight: 400;
  }
  .cover-divider {
    width: 80px;
    height: 4px;
    background: #d97706;
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
    color: #64748b;
    font-style: italic;
    background: #fffbeb;
    padding: 14px 18px;
    border-left: 4px solid #d97706;
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
    color: #92400e;
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
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .solution-title {
    font-weight: 700;
    color: #92400e;
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
    background: #fef3c7;
    color: #92400e;
    border-radius: 6px;
    font-size: 9.5pt;
    margin-right: 8px;
    font-weight: bold;
    border: 1px solid #fde68a;
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
    background: #d97706;
    color: #ffffff;
    border-radius: 50%;
    text-align: center;
    line-height: 28px;
    font-weight: 800;
    font-size: 10pt;
    box-shadow: 0 2px 4px rgba(217, 119, 6, 0.3);
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
    color: #92400e;
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
  .badge-gold { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }

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
  <h1 class="cover-title">AURUM</h1>
  <div class="cover-subtitle">Sistema Integral de Cumplimiento PLD y Prevención de Lavado de Dinero para Actividades Vulnerables (LFPIORPI / SAT)</div>
  <div class="cover-divider"></div>

  <div class="cover-meta-box">
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Plataforma Web</strong>
        <span>aurum-backup.vercel.app</span>
      </div>
      <div class="cover-meta-item">
        <strong>Marco Regulatorio</strong>
        <span>LFPIORPI Art. 17 / Acuerdo 115/2026 SAT</span>
      </div>
      <div class="cover-meta-item">
        <strong>Sectores Clave</strong>
        <span>Joyerías, Autos, Inmobiliario y 17 Fracciones</span>
      </div>
      <div class="cover-meta-item">
        <strong>Entregable Central</strong>
        <span>Avisos XML SPPLD y Expedientes KYC/KYB</span>
      </div>
    </div>
  </div>

  <div class="cover-abstract">
    <strong>Propósito del Manual:</strong> Proveer una guía clara, intuitiva y robusta para que cualquier oficial de cumplimiento, dueño de negocio o auditor opere la plataforma AURUM de principio a fin: desde el alta de clientes y screening restrictivo, hasta el monitoreo de umbrales UMA, cálculo de Beneficiario Controlador y la generación de avisos XML oficiales ante el SAT.
  </div>
</div>

<!-- CAPÍTULO 1: QUÉ RESUELVE LA PLATAFORMA -->
<h1>1. ¿Qué Resuelve de Verdad AURUM?</h1>
<p>
  En México, la <strong>Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita (LFPIORPI)</strong> obliga a empresas que realizan <em>Actividades Vulnerables</em> (joyerías, agencias automotrices, inmobiliarias, blindaje, préstamos, donatarias, arte) a integrar expedientes de identificación de clientes (KYC/KYB), calcular acumulaciones mensuales y reportar operaciones a la Unidad de Inteligencia Financiera (UIF) a través del SAT.
</p>
<p>
  El <strong>Acuerdo 115/2026 del SAT</strong> exige que todos los Sujetos Obligados cuenten con un <strong>sistema automatizado de cumplimiento</strong> antes del <strong>1 de junio de 2027</strong>. El incumplimiento acarrea multas devastadoras de hasta <strong>65,000 UMA (~$7.6 millones de pesos por infracción)</strong> o la clausura de operaciones.
</p>

<p><strong>AURUM resuelve de forma integral y automatizada los 5 dolores críticos del Sujeto Obligado:</strong></p>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">1</span> Blindaje Total contra Sanciones y Multas de la LFPIORPI</div>
  <p><strong>El problema real:</strong> Las empresas llevan el control en hojas de Excel dispersas y olvidan reportar operaciones que superaron el umbral dentro del plazo del día 17 del mes siguiente, generando créditos fiscales millonarios del SAT.</p>
  <p><strong>Lo que AURUM resuelve:</strong> Monitorea en tiempo real el valor de la UMA oficial y calcula automáticamente el acumulado de operaciones por cliente. Emite alertas críticas y genera el archivo XML con la estructura técnica oficial requerida por el portal SPPLD del SAT.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">2</span> Screening Restrictivo Oficial en Vivo (OFAC, PEPs y SAT 69-B)</div>
  <p><strong>El problema real:</strong> Se celebran operaciones comerciales con personas bloqueadas en listas negras internacionales o con empresas fantasma que emiten facturas falsas (EFOS/EDOS).</p>
  <p><strong>Lo que AURUM resuelve:</strong> Ejecuta consultas directas y en vivo contra la lista OFAC del Departamento del Tesoro de EE. UU., bases de Personas Políticamente Expuestas (PEPs de México, ONU y UE) y cruza el RFC del cliente contra **14,342 RFCs de la Lista Negra Oficial del SAT (Art. 69-B)**.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">3</span> Determinación Rigurosa de Beneficiario Controlador (≥ 25%)</div>
  <p><strong>El problema real:</strong> El SAT audita con especial severidad la falta de identificación de la persona física que realmente controla una persona moral o fideicomiso.</p>
  <p><strong>Lo que AURUM resuelve:</strong> Modela la estructura accionaria y societaria con cálculo determinista y genera el árbol visual de control, identificando automáticamente a los beneficiarios que ostentan el 25% o más de participación o el control efectivo de la administración.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">4</span> Expedientes Digitales KYC/KYB con OCR Seguro en el Navegador</div>
  <p><strong>El problema real:</strong> Los documentos de clientes (INE, actas constitutivas, cédulas fiscales) se extravían o su extracción de datos manual genera errores de captura tipográficos.</p>
  <p><strong>Lo que AURUM resuelve:</strong> Integra OCR local (Tesseract.js) que lee y extrae datos directamente en el navegador (sin enviar identificaciones privadas a servidores externos) y arma el expediente digital inalterable con verificación de vigencias.</p>
</div>

<div class="solution-card">
  <div class="solution-title"><span class="solution-icon">5</span> Multi-Tenant con Aislamiento Criptográfico Nivel Bancario (RLS)</div>
  <p><strong>El problema real:</strong> El temor de que la información confidencial de clientes o transacciones de una joyería o agencia de autos sea visible por otra empresa o competidor.</p>
  <p><strong>Lo que AURUM resuelve:</strong> Cada organización tiene un aislamiento estricto mediante **Row-Level Security (RLS)** en PostgreSQL a nivel de base de datos. Ningún usuario puede acceder a datos ajenos, respaldado por una bitácora inmutable con firma criptográfica HMAC-SHA256.</p>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 2: FLUJO VERTICAL PASO A PASO -->
<h1>2. Flujo Vertical Operativo: De Inicio a Fin</h1>
<p>
  A continuación se presenta el flujo secuencial de trabajo diario en AURUM. El sistema está estructurado para que el oficial de cumplimiento ejecute cada tarea con máxima rapidez y certeza regulatoria.
</p>

<!-- PASO 1 -->
<div class="flow-step-container">
  <div class="flow-step-number">1</div>
  <div class="flow-step-header">Acceso al Sistema y Selección de Actividad Vulnerable</div>
  <div class="flow-step-body">
    <p><strong>¿Dónde empiezo?</strong> Ingresa al portal web en <a href="https://aurum-backup.vercel.app">aurum-backup.vercel.app</a> con tus credenciales asignadas.</p>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Autenticación segura basada en JWT y configuración del perfil del Sujeto Obligado de acuerdo a su fracción del Art. 17 LFPIORPI (Joyería, Vehículos, Inmobiliario, etc.).
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Acceso al <strong>Dashboard General</strong> con métricas de expedientes, semáforo de riesgo, alertas de acumulación y accesos directos.
      </div>
    </div>
  </div>
</div>

<!-- PASO 2 -->
<div class="flow-step-container">
  <div class="flow-step-number">2</div>
  <div class="flow-step-header">Alta del Cliente (Expediente KYC / KYB)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Dirígete a la pestaña <strong>Expedientes</strong> y haz clic en <em>"+ Nuevo Cliente"</em>.</p>
    <ul>
      <li><strong>Tipo de Persona:</strong> Selecciona <em>Física</em> o <em>Moral</em>.</li>
      <li><strong>Identificación Fiscal:</strong> Captura el RFC, CURP y Razón Social o Nombre Completo.</li>
      <li><strong>Actividad Económica:</strong> Giro comercial y sector del cliente.</li>
      <li><strong>Carga de Documentación:</strong> Adjunta Identificación Oficial, Comprobante de Domicilio y Cédula Fiscal. El motor OCR extrae los datos automáticamente.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Cumplo con la obligación de integrar el expediente de identificación del cliente antes de celebrar cualquier acto comercial.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Expediente digital creado con porcentaje de completitud documental visible.
      </div>
    </div>
  </div>
</div>

<!-- PASO 3 -->
<div class="flow-step-container">
  <div class="flow-step-number">3</div>
  <div class="flow-step-header">Screening en Tiempo Real (OFAC, PEPs y SAT 69-B)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Dentro del expediente del cliente, haz clic en <strong>"Verificación KYC/KYB"</strong> y ejecuta el screening:</p>
    <ul>
      <li><strong>OFAC SDN List:</strong> Consulta en vivo contra la base del Departamento del Tesoro de EE. UU.</li>
      <li><strong>Listas PEP (Personas Políticamente Expuestas):</strong> Verifica funcionarios públicos de los 3 niveles de gobierno en México y listas ONU/UE.</li>
      <li><strong>Lista Negra SAT Art. 69-B:</strong> Búsqueda instantánea en el catálogo oficial de empresas que facturan operaciones simuladas (EFOS).</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Prevención de delitos financieros y blindaje fiscal. Identifico de inmediato si el prospecto tiene impedimento legal para operar.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Dictamen de screening certificado: <span class="badge badge-approved">HISTORIAL LIMPIO</span> o <span class="badge badge-rejected">COINCIDENCIA EN LISTA</span> con detalle de homonimia.
      </div>
    </div>
  </div>
</div>

<!-- PASO 4 -->
<div class="flow-step-container">
  <div class="flow-step-number">4</div>
  <div class="flow-step-header">Registro de Operaciones y Acumulación en UMAs</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Ve a <strong>Operaciones</strong> y presiona <em>"+ Registrar Operación"</em>.</p>
    <p>Selecciona al cliente e introduce los datos de la transacción comercial:</p>
    <ul>
      <li><strong>Monto y Moneda:</strong> Valor total de la venta o servicio en MXN o USD.</li>
      <li><strong>Forma de Liquidación:</strong> Efectivo, transferencia SPEI, tarjeta o cheque. *(Nota: AURUM alerta sobre el tope de efectivo legal)*.</li>
      <li><strong>Detalle Específico:</strong> Metales/joyas (peso, quilataje, piedra) o vehículos (VIN, marca, modelo, blindaje).</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Registro transaccional riguroso y seguimiento de acumulación en el periodo mensual conforme al Art. 17 LFPIORPI.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Operación asentada y actualización inmediata de la barra de acumulación en UMAs del cliente.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PASO 5 -->
<div class="flow-step-container">
  <div class="flow-step-number">5</div>
  <div class="flow-step-header">Detección Automática de Umbrales y Alertas de Aviso</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo opera el motor determinista?</strong></p>
    <p>
      AURUM suma todas las operaciones realizadas por el mismo cliente en los últimos 30 días naturales. Al cruzar los umbrales oficiales de la LFPIORPI basados en la UMA vigente, el sistema clasifica la situación:
    </p>
    <table>
      <thead>
        <tr>
          <th>Actividad Vulnerable (Art. 17)</th>
          <th>Umbral de Identificación</th>
          <th>Umbral de Aviso ante SAT</th>
          <th>Tope Máximo en Efectivo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Fracción VI (Metales Preciosos y Joyería)</strong></td>
          <td>805 UMA (~$91,480 MXN)</td>
          <td>1,605 UMA (~$182,390 MXN)</td>
          <td>3,210 UMA (~$364,780 MXN)</td>
        </tr>
        <tr>
          <td><strong>Fracción VIII (Vehículos Terrestres/Aéreos)</strong></td>
          <td>Siempre Identificar</td>
          <td>3,210 UMA (~$364,780 MXN)</td>
          <td>3,210 UMA (~$364,780 MXN)</td>
        </tr>
        <tr>
          <td><strong>Fracción V (Bienes Inmuebles)</strong></td>
          <td>Siempre Identificar</td>
          <td>8,025 UMA (~$911,960 MXN)</td>
          <td>8,025 UMA (~$911,960 MXN)</td>
        </tr>
      </tbody>
    </table>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Cero omisiones. El sistema notifica automáticamente cuándo una operación individual o acumulada debe reportarse al SAT.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Generación de alerta en la bandeja <span class="badge badge-gold">REQUIERE_AVISO_SPPLD</span>.
      </div>
    </div>
  </div>
</div>

<!-- PASO 6 -->
<div class="flow-step-container">
  <div class="flow-step-number">6</div>
  <div class="flow-step-header">Copiloto con Agentes de Inteligencia Artificial (EBR & Beneficiario)</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> En la pestaña <strong>Agentes IA</strong>, ejecuta los análisis especializados de apoyo al oficial de cumplimiento:</p>
    <ul>
      <li><strong>Agente 3 — Beneficiario Controlador:</strong> Modela la estructura accionaria e identifica personas físicas con participación &ge; 25% o control fáctico.</li>
      <li><strong>Agente 4 — Matriz de Riesgo EBR (Enfoque Basado en Riesgo):</strong> Pondera geografía, tipo de producto, volumen transaccional y forma de pago.</li>
      <li><strong>Agente 5 — Perfil Transaccional:</strong> Detecta patrones de fraccionamiento de pagos (*smurfing*) para evadir umbrales.</li>
    </ul>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Análisis profundo de riesgo y cumplimiento del Enfoque Basado en Riesgo exigido por el GAFI y la CNBV/SAT.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Dictamen analítico con árbol visual accionario y justificación técnica registrada en bitácora.
      </div>
    </div>
  </div>
</div>

<!-- PASO 7 -->
<div class="flow-step-container">
  <div class="flow-step-number">7</div>
  <div class="flow-step-header">Generación del Archivo XML Oficial para el Portal SPPLD</div>
  <div class="flow-step-body">
    <p><strong>¿Qué hago?</strong> Ingresa a la sección <strong>Avisos SPPLD</strong>.</p>
    <ol>
      <li>Selecciona el periodo mensual y la operación o cliente que detonó la obligación.</li>
      <li>Verifica la precarga de datos del Sujeto Obligado y del cliente.</li>
      <li>Haz clic en <strong>"Generar XML del Aviso"</strong>.</li>
      <li>Descarga el archivo <code>.xml</code> estructurado con el esquema oficial <code>&lt;lfpiorpi:AvisoConsolidado&gt;</code>.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Elimino la captura manual en el portal del SAT. El archivo está listo para cargarse por lote sin errores de sintaxis.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Archivo XML validado conforme a los esquemas XSD vigentes de la SHCP/SAT.
      </div>
    </div>
  </div>
</div>

<!-- PASO 8 -->
<div class="flow-step-container">
  <div class="flow-step-number">8</div>
  <div class="flow-step-header">Presentación en el Portal del SAT y Conciliación del Acuse</div>
  <div class="flow-step-body">
    <p><strong>¿Cómo concluye el ciclo de cumplimiento?</strong></p>
    <ol>
      <li>Haz clic en el enlace directo al <strong>Portal Oficial SPPLD del SAT</strong> (<a href="https://sppld.sat.gob.mx">sppld.sat.gob.mx</a>).</li>
      <li>El Sujeto Obligado firma y presenta el archivo XML utilizando su propia <strong>e.firma</strong> (AURUM nunca solicita ni almacena llaves privadas ni contraseñas).</li>
      <li>Al recibir el <strong>Acuse Oficial de Recepción</strong> emitido por el SAT, regresa a AURUM y captura el <strong>Número de Folio Oficial</strong> y sube el PDF del acuse.</li>
    </ol>
    <div class="flow-step-grid">
      <div class="flow-box">
        <strong>¿Qué resuelvo en este paso?</strong>
        Cierre del ciclo legal con plena certeza jurídica. El aviso queda conciliado e indisolublemente vinculado al expediente.
      </div>
      <div class="flow-box">
        <strong>Resultado obtenido</strong>
        Estado <span class="badge badge-approved">AVISO CONCILIADO Y CUMPLIDO</span> con resguardo listo para auditoría.
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- CAPÍTULO 3: MATRIZ DE LOS 8 AGENTES IA -->
<h1>3. Catálogo de los 8 Agentes Copilotos de IA</h1>
<p>
  AURUM cuenta con 8 agentes inteligentes que asisten al Oficial de Cumplimiento. <strong>Principio de Gobierno:</strong> Los agentes sugieren y calculan, pero ninguna decisión jurídica se toma sin la confirmación explícita del humano responsable.
</p>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Agente Especializado</th>
      <th>Función Operativa Principal</th>
      <th>Lógica / Motor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1</strong></td>
      <td><strong>Ingesta Documental</strong></td>
      <td>Extrae automáticamente RFC, CURP, domicilio y nombres desde documentos escaneados.</td>
      <td>OCR local + Heurística regex</td>
    </tr>
    <tr>
      <td><strong>2</strong></td>
      <td><strong>Consistencia KYC / KYB</strong></td>
      <td>Cruza datos entre identificación, comprobante y acta para detectar discrepancias.</td>
      <td>Motor de concordancia documental</td>
    </tr>
    <tr>
      <td><strong>3</strong></td>
      <td><strong>Beneficiario Controlador</strong></td>
      <td>Calcula participaciones accionarias escalonadas para ubicar personas físicas &ge; 25%.</td>
      <td>Cálculo matemático determinista</td>
    </tr>
    <tr>
      <td><strong>4</strong></td>
      <td><strong>Matriz de Riesgo EBR</strong></td>
      <td>Evalúa factores de riesgo por cliente, producto, canal y zona geográfica.</td>
      <td>Matriz ponderada LFPIORPI / GAFI</td>
    </tr>
    <tr>
      <td><strong>5</strong></td>
      <td><strong>Perfil Transaccional</strong></td>
      <td>Compara el volumen operado contra la capacidad económica declarada.</td>
      <td>Estadística de desviación transaccional</td>
    </tr>
    <tr>
      <td><strong>6</strong></td>
      <td><strong>Priorización de Alertas</strong></td>
      <td>Agrupa operaciones sospechosas y redacta borradores de síntesis ejecutiva.</td>
      <td>Motor de reglas + Síntesis LLM</td>
    </tr>
    <tr>
      <td><strong>7</strong></td>
      <td><strong>Generador de Avisos SPPLD</strong></td>
      <td>Construye el XML con la codificación de catálogos y fracciones oficiales del SAT.</td>
      <td>Ensamblador determinista XSD</td>
    </tr>
    <tr>
      <td><strong>8</strong></td>
      <td><strong>Gobierno y Auditoría</strong></td>
      <td>Checklist de brechas regulatorias para verificar que el expediente esté 100% listo.</td>
      <td>Matriz de auditoría de 12 puntos</td>
    </tr>
  </tbody>
</table>

---

<!-- CAPÍTULO 4: RESUMEN DE ACCESOS Y CREDENCIALES -->
<h1>4. Directorio de Acceso y Buenas Prácticas</h1>

<table>
  <thead>
    <tr>
      <th>Entorno / Servicio</th>
      <th>Enlace Oficial</th>
      <th>Credenciales Demo / Función</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Portal Web AURUM</strong></td>
      <td><a href="https://aurum-backup.vercel.app">aurum-backup.vercel.app</a></td>
      <td><code>demo@aurumpld.mx</code> | <code>Aurum2026!</code> (Todas las fracciones)</td>
    </tr>
    <tr>
      <td><strong>Joyería Real del Bajío (Fracc. VI)</strong></td>
      <td><a href="https://aurum-backup.vercel.app">aurum-backup.vercel.app</a></td>
      <td><code>owner@joyeriarealbajio.mx</code> | <code>Aurum2026!</code></td>
    </tr>
    <tr>
      <td><strong>Autos Premium del Norte (Fracc. VIII)</strong></td>
      <td><a href="https://aurum-backup.vercel.app">aurum-backup.vercel.app</a></td>
      <td><code>owner@autospremiumnorte.mx</code> | <code>Aurum2026!</code></td>
    </tr>
    <tr>
      <td><strong>Portal Oficial SPPLD del SAT</strong></td>
      <td><a href="https://sppld.sat.gob.mx">sppld.sat.gob.mx</a></td>
      <td>Presentación oficial de avisos con e.firma de la empresa.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Regla de Oro de Cumplimiento:</strong> En materia de Prevención de Lavado de Dinero ante el SAT, la omisión no es una opción. Con AURUM, cada cliente tiene expediente integrado, cada operación cuenta con cálculo de UMA en tiempo real, y cada aviso ante la UIF queda respaldado con su acuse oficial conciliado.
</div>

</body>
</html>
"""


def generate_aurum_pdf(output_pdf: Path) -> bool:
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
    temp_html.write_text(AURUM_HTML, encoding="utf-8")
    
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
    parser = argparse.ArgumentParser(description="Genera el manual de usuario de AURUM en PDF")
    parser.add_argument("--downloads", type=Path, default=Path(os.path.expanduser(r"~\Downloads")))
    parser.add_argument("--usb_aurum", type=Path, default=Path(r"E:\PlataformaSAT\aurum-backup"))
    parser.add_argument("--desktop", type=Path, default=Path(os.path.expanduser(r"~\OneDrive\Escritorio\Respaldo Negocios\AURUM")))
    args = parser.parse_args()
    
    pdf_name = "AURUM_Manual_Usuario_Guia_Operativa_v1.pdf"
    md_name = "AURUM_Manual_Usuario_Guia_Operativa_v1.md"
    
    # 1. Generar en USB
    args.usb_aurum.mkdir(parents=True, exist_ok=True)
    usb_pdf = args.usb_aurum / pdf_name
    success = generate_aurum_pdf(usb_pdf)
    
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
        md_content = f"""# AURUM — Manual de Usuario y Guía Operativa PLD / SAT

**Versión:** 1.0  
**Fecha:** 19 de agosto de 2026  
**Marco Regulatorio:** LFPIORPI Art. 17 / Acuerdo 115/2026 del SAT  
**Portal Web:** https://aurum-backup.vercel.app  
**Credenciales Demo:** `demo@aurumpld.mx` | `Aurum2026!`  

---

## 1. ¿Qué Resuelve de Verdad AURUM?

AURUM es la plataforma SaaS especializada en Prevención de Lavado de Dinero (PLD) para negocios mexicanos que realizan Actividades Vulnerables bajo la LFPIORPI. Resuelve los 5 dolores más críticos:

1. **Blindaje contra Multas del SAT**: Automatiza el cumplimiento del Acuerdo 115/2026 evitando multas de hasta 65,000 UMAs (~$7.6M MXN).
2. **Screening Restrictivo en Vivo**: Cruza clientes contra OFAC (EE.UU.), listas PEP (México/ONU/UE) y 14,342 RFCs de la Lista Negra del SAT (Art. 69-B).
3. **Determinación de Beneficiario Controlador (≥ 25%)**: Modela la estructura accionaria y genera el árbol visual de beneficiarios finales.
4. **Expedientes Digitales KYC/KYB con OCR**: Extrae datos de identificaciones directamente en el navegador con Tesseract.js (sin enviar identificaciones fuera del equipo).
5. **Aislamiento Multi-Tenant con RLS**: Row-Level Security en PostgreSQL para garantizar que cada empresa vea única y exclusivamente sus propios expedientes.

---

## 2. Flujo Vertical Operativo Paso a Paso

```text
[Paso 1: Acceso y Fracción] ➔ [Paso 2: Alta de Cliente KYC] ➔ [Paso 3: Screening OFAC/PEP/SAT]
➔ [Paso 4: Registro de Operación] ➔ [Paso 5: Alerta de Umbral UMA] ➔ [Paso 6: Copiloto Agentes IA]
➔ [Paso 7: Generación XML SPPLD] ➔ [Paso 8: Presentación SAT y Conciliación de Acuse]
```

### Paso 1 — Acceso al Sistema
- Ingresa a https://aurum-backup.vercel.app con credenciales de la empresa.

### Paso 2 — Alta del Cliente (Expediente KYC / KYB)
- Captura de RFC, razón social, giro comercial y carga de documentos con extracción OCR.

### Paso 3 — Screening en Tiempo Real
- Verificación simultánea en OFAC, listas PEP y SAT 69-B con emisión de dictamen certificado.

### Paso 4 — Registro de Operaciones
- Registro de transacciones con método de pago (efectivo, SPEI) y catálogo de sector (joyas, autos, etc.).

### Paso 5 — Detección Automática de Umbrales UMA
- Cálculo de acumulación mensual por cliente y disparo de alerta ante superación de umbral de aviso.

### Paso 6 — Análisis con Agentes IA & Beneficiario Controlador
- Evaluación de riesgo EBR, perfil transaccional y modelado de beneficiarios con participación ≥ 25%.

### Paso 7 — Generación del Archivo XML para el SAT
- Generación y descarga del archivo `.xml` estructurado bajo el esquema oficial `<lfpiorpi:AvisoConsolidado>`.

### Paso 8 — Presentación en Portal SPPLD y Conciliación de Acuse
- Enlace al portal del SAT (sppld.sat.gob.mx) para firma con e.firma y captura del folio de acuse oficial.

---

## 3. Matriz de los 8 Agentes Copilotos de IA
- **Agente 1 (Ingesta Documental):** Extracción OCR de campos en identificaciones.
- **Agente 2 (Consistencia KYC/KYB):** Detección de discrepancias en documentos.
- **Agente 3 (Beneficiario Controlador):** Modelado de propiedad accionaria ≥ 25%.
- **Agente 4 (Matriz de Riesgo EBR):** Calificación por cliente, geografía y producto.
- **Agente 5 (Perfil Transaccional):** Detección de smurfing o pagos inusuales.
- **Agente 6 (Priorización de Alertas):** Agrupación y síntesis de casos.
- **Agente 7 (Avisos SPPLD XML):** Construcción del archivo XML oficial.
- **Agente 8 (Gobierno y Auditoría):** Checklist de brechas y blindaje probatorio.
"""
        (args.usb_aurum / md_name).write_text(md_content, encoding="utf-8")
        (args.downloads / md_name).write_text(md_content, encoding="utf-8")
        (args.desktop / md_name).write_text(md_content, encoding="utf-8")
        print("Versiones Markdown guardadas en USB, Descargas y Escritorio.")


if __name__ == "__main__":
    main()
