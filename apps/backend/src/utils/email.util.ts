import nodemailer from 'nodemailer';
import { env } from '@config/env.js';

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
});

const GOLD   = '#775A00';
const GOLD_L = '#B08D32';
const GOLD_G = `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`;
const BG     = '#F5F3F1';
const WHITE  = '#FFFFFF';
const TEXT   = '#1B1C1C';
const MUTED  = '#7F7665';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const TYPE_LABELS: Record<string, string> = {
  per_class: 'Por Clase',
  monthly:   'Mensual',
  annual:    'Anual',
  private:   'Clase Privada',
  pack:      'Pack de Clases',
};

const TYPE_COLORS: Record<string, string> = {
  per_class: GOLD,
  monthly:   '#16A34A',
  annual:    '#2563EB',
  private:   '#7C3AED',
  pack:      '#B45309',
};

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AcariPole Studio</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${GOLD_G};padding:36px 40px;border-radius:18px 18px 0 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;font-weight:600;">Studio</p>
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-style:italic;color:#FFFFFF;letter-spacing:3px;font-weight:700;">ACARIPOLE</h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:${WHITE};padding:36px 40px 40px;border-radius:0 0 18px 18px;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:${MUTED};line-height:1.6;">
              © 2026 AcariPole Studio · Medellín, Colombia<br/>
              Este correo fue generado automáticamente, no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Admin notification: nuevo pago pendiente ─────────────────────────────────
interface AdminNotifParams {
  userName: string;
  userEmail: string;
  planName: string;
  planType: string;
  planPrice: number;
  paymentMethod: 'cash' | 'wompi';
  requestedAt: string;
  appUrl?: string;
}

function adminNotifHtml(p: AdminNotifParams): string {
  const methodLabel = p.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Wompi';
  const methodColor = p.paymentMethod === 'cash' ? GOLD : '#7C3AED';
  const url = (p.appUrl ?? 'http://localhost:5173') + '/admin/finances';
  const typeLabel = TYPE_LABELS[p.planType] ?? p.planType;

  return base(`
    <!-- Icon + title -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:#FEF3C7;line-height:60px;text-align:center;font-size:26px;margin-bottom:14px;">🔔</div>
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:${TEXT};font-weight:700;">Nuevo pago pendiente</h2>
      <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">Un usuario ha solicitado un plan y espera tu confirmación.</p>
    </div>

    <!-- Info card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};border-radius:14px;margin-bottom:28px;border:1px solid #E8E3DA;">
      <tr>
        <td style="padding:22px 26px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <!-- Row 1 -->
            <tr>
              <td width="50%" style="padding-bottom:18px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Usuario</p>
                <p style="margin:0 0 3px;font-size:14px;color:${TEXT};font-weight:700;">${p.userName}</p>
                <p style="margin:0;font-size:12px;color:${MUTED};">${p.userEmail}</p>
              </td>
              <td width="50%" style="padding-bottom:18px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Plan solicitado</p>
                <p style="margin:0 0 4px;font-size:14px;color:${TEXT};font-weight:700;">${p.planName}</p>
                <span style="display:inline-block;padding:2px 10px;border-radius:99px;background:rgba(119,90,0,0.1);color:${GOLD};font-size:11px;font-weight:700;">${typeLabel}</span>
              </td>
            </tr>
            <!-- Row 2 -->
            <tr>
              <td width="50%" style="vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Método de pago</p>
                <p style="margin:0;font-size:14px;color:${methodColor};font-weight:700;">${methodLabel}</p>
              </td>
              <td width="50%" style="vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Valor</p>
                <p style="margin:0;font-size:22px;color:${GOLD};font-family:Georgia,serif;font-weight:700;">${fmt(p.planPrice)}</p>
              </td>
            </tr>
            <!-- Row 3 date -->
            <tr>
              <td colspan="2" style="padding-top:14px;border-top:1px solid #E8E3DA;">
                <p style="margin:0;font-size:11px;color:${MUTED};">📅 Solicitud recibida el ${p.requestedAt}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${url}"
         style="display:inline-block;background:${GOLD_G};color:#fff;text-decoration:none;padding:15px 36px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:1px;">
        Confirmar pago en Finanzas &rarr;
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#B0A99A;text-align:center;line-height:1.7;">
      El plan del usuario permanecerá <strong>inactivo</strong> hasta que confirmes el pago.<br/>
      Puedes hacerlo desde el panel de Finanzas o desde la campana de notificaciones.
    </p>
  `);
}

// ── User confirmation: pago aprobado ─────────────────────────────────────────
interface UserConfirmParams {
  userName: string;
  planName: string;
  planType: string;
  planPrice: number;
  durationDays: number | null;
  classesRemaining: number | null;
  benefits: string[];
  activatedAt: string;
  expiresAt: string | null;
  appUrl?: string;
}

function userConfirmHtml(p: UserConfirmParams): string {
  const url = (p.appUrl ?? 'http://localhost:5173') + '/user/classes';
  const typeLabel = TYPE_LABELS[p.planType] ?? p.planType;
  const typeColor = TYPE_COLORS[p.planType] ?? GOLD;
  const isUnlimited = p.planType === 'monthly' || p.planType === 'annual';

  const durLine = isUnlimited
    ? `Clases ilimitadas durante ${p.durationDays ?? '∞'} días`
    : p.classesRemaining != null
      ? `${p.classesRemaining} crédito${p.classesRemaining !== 1 ? 's' : ''} de clase incluido${p.classesRemaining !== 1 ? 's' : ''}`
      : 'Sin vencimiento';

  const expLine = p.expiresAt
    ? `Válido hasta: <strong>${new Date(p.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>`
    : 'Sin fecha de vencimiento';

  const benefitRows = p.benefits.length > 0
    ? p.benefits.map(b => `
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td style="width:20px;color:#16A34A;font-size:14px;font-weight:700;vertical-align:top;">✓</td>
              <td style="font-size:13px;color:#5E5E5E;line-height:1.5;">${b}</td>
            </tr></table>
          </td>
        </tr>`).join('')
    : '';

  return base(`
    <!-- Celebration header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;line-height:1;">🎉</div>
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;color:${TEXT};font-weight:700;">¡Tu plan está activo!</h2>
      <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
        Hola <strong>${p.userName}</strong>, tu pago fue confirmado por el equipo de AcariPole.<br/>
        Ya puedes reservar clases con tu membresía.
      </p>
    </div>

    <!-- Plan card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="background:${GOLD_G};border-radius:16px;margin-bottom:24px;">
      <tr>
        <td style="padding:26px 28px;">
          <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;font-weight:700;">Plan activo</p>
          <h3 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;color:#fff;font-weight:700;">${p.planName}</h3>
          <span style="display:inline-block;padding:3px 12px;border-radius:99px;background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:16px;">${typeLabel}</span>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="50%">
                <p style="margin:0 0 2px;font-size:10px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Valor pagado</p>
                <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#fff;font-weight:700;">${fmt(p.planPrice)}</p>
              </td>
              <td width="50%" style="text-align:right;vertical-align:bottom;">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);">📅 Activado el ${p.activatedAt}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Details row -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <div style="background:${BG};border-radius:12px;padding:16px 18px;border:1px solid #E8E3DA;">
            <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">Clases</p>
            <p style="margin:0;font-size:14px;color:${typeColor};font-weight:700;">${durLine}</p>
          </div>
        </td>
        <td width="50%" style="padding-left:8px;">
          <div style="background:${BG};border-radius:12px;padding:16px 18px;border:1px solid #E8E3DA;">
            <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">Vigencia</p>
            <p style="margin:0;font-size:13px;color:${TEXT};font-weight:600;">${expLine}</p>
          </div>
        </td>
      </tr>
    </table>

    ${benefitRows ? `
    <!-- Benefits -->
    <div style="background:${BG};border-radius:14px;padding:20px 22px;margin-bottom:28px;border:1px solid #E8E3DA;">
      <p style="margin:0 0 12px;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Incluye</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${benefitRows}
      </table>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${url}"
         style="display:inline-block;background:${GOLD_G};color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:1px;">
        Reservar una clase &rarr;
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:${MUTED};text-align:center;line-height:1.7;">
      ¡Nos vemos en el estudio! 🥂<br/>
      <span style="font-size:11px;color:#B0A99A;">El equipo de AcariPole Studio</span>
    </p>
  `);
}

// ── Service confirmation email ────────────────────────────────────────────────
interface ServiceConfirmParams {
  userName: string;
  serviceName: string;
  scheduledAt: string | null;
  sessionCount: number;
  amountPaid: number;
  paymentMethod: 'cash' | 'wompi';
  locationName?: string | null;
  appUrl?: string;
}

function serviceConfirmHtml(p: ServiceConfirmParams): string {
  const url = (p.appUrl ?? 'http://localhost:5173') + '/user/services';
  const methodLabel = p.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Wompi';
  const dateLabel = p.scheduledAt
    ? new Date(p.scheduledAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return base(`
    <!-- Celebration header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;line-height:1;">🎉</div>
      <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;color:${TEXT};font-weight:700;">¡Tu inscripción está confirmada!</h2>
      <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
        Hola <strong>${p.userName}</strong>, tu pago fue confirmado por el equipo de AcariPole.<br/>
        Ya estás inscrita al servicio.
      </p>
    </div>

    <!-- Service card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="background:${GOLD_G};border-radius:16px;margin-bottom:24px;">
      <tr>
        <td style="padding:26px 28px;">
          <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;font-weight:700;">Servicio confirmado</p>
          <h3 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#fff;font-weight:700;">${p.serviceName}</h3>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="50%">
                <p style="margin:0 0 2px;font-size:10px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Valor pagado</p>
                <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#fff;font-weight:700;">${fmt(p.amountPaid)}</p>
              </td>
              <td width="50%" style="text-align:right;vertical-align:bottom;">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);">${methodLabel}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        ${p.sessionCount > 1 ? `
        <td width="50%" style="padding-right:8px;">
          <div style="background:${BG};border-radius:12px;padding:16px 18px;border:1px solid #E8E3DA;">
            <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">Sesiones</p>
            <p style="margin:0;font-size:14px;color:${GOLD};font-weight:700;">${p.sessionCount} sesiones</p>
          </div>
        </td>` : ''}
        ${dateLabel ? `
        <td width="${p.sessionCount > 1 ? '50%' : '100%'}" style="${p.sessionCount > 1 ? 'padding-left:8px;' : ''}">
          <div style="background:${BG};border-radius:12px;padding:16px 18px;border:1px solid #E8E3DA;">
            <p style="margin:0 0 4px;font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">Primera sesión</p>
            <p style="margin:0;font-size:13px;color:${TEXT};font-weight:600;">${dateLabel}</p>
            ${p.locationName ? `<p style="margin:4px 0 0;font-size:12px;color:${MUTED};">📍 ${p.locationName}</p>` : ''}
          </div>
        </td>` : ''}
      </tr>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${url}"
         style="display:inline-block;background:${GOLD_G};color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:1px;">
        Ver mis servicios &rarr;
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:${MUTED};text-align:center;line-height:1.7;">
      ¡Nos vemos en el estudio! 🥂<br/>
      <span style="font-size:11px;color:#B0A99A;">El equipo de AcariPole Studio</span>
    </p>
  `);
}

// ── Public send helpers ───────────────────────────────────────────────────────
export async function sendServicePaymentConfirmation(
  toEmail: string,
  params: ServiceConfirmParams,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) return;
  await transporter.sendMail({
    from: `"AcariPole Studio" <${env.EMAIL_FROM}>`,
    to: toEmail,
    subject: `✅ ¡Tu inscripción a ${params.serviceName} está confirmada! — AcariPole`,
    html: serviceConfirmHtml(params),
  });
}

export async function sendAdminPaymentNotification(params: AdminNotifParams): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) return;
  await transporter.sendMail({
    from: `"AcariPole Studio" <${env.EMAIL_FROM}>`,
    to: env.ADMIN_EMAIL,
    subject: `🔔 Nuevo pago pendiente — ${params.planName} (${params.userName})`,
    html: adminNotifHtml(params),
  });
}

export async function sendUserPaymentConfirmation(
  toEmail: string,
  params: UserConfirmParams,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) return;
  await transporter.sendMail({
    from: `"AcariPole Studio" <${env.EMAIL_FROM}>`,
    to: toEmail,
    subject: `✅ ¡Tu plan ${params.planName} está activo! — AcariPole`,
    html: userConfirmHtml(params),
  });
}
