import nodemailer from 'nodemailer';

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('SMTP_HOST not configured — email sending is disabled');
}

export async function sendResetEmail(to, resetUrl) {
  if (!transporter) {
    console.warn('Email not configured, skipping password reset email to:', to);
    console.warn('Reset URL would have been:', resetUrl);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@involuntaryresponse.com',
    to,
    subject: 'Reset your password',
    text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Click the link below to reset your password:</p>
           <p><a href="${resetUrl}">Reset Password</a></p>
           <p>This link expires in 1 hour.</p>`,
  });
}
