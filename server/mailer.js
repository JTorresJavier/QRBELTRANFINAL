const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // ← logs detallados
  debug: true,  // ← logs SMTP
});

transporter.verify()
  .then(() => console.log('✅ SMTP listo'))
  .catch(err => console.error('❌ SMTP verify fallo:', err));

async function sendResetEmail(to, link) {
    console.log('📧 Enviando a:', to, 'link:', link);
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Recuperación de contraseña',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Para continuar, hacé clic en el siguiente enlace (válido por 15 minutos):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Si no fuiste vos, ignorá este mensaje.</p>
    `,
  });
  console.log('📨 Enviado:', info.messageId);
  return info;
}

module.exports = { transporter, sendResetEmail };
