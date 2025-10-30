import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      to, 
      subject, 
      body, 
      pdfBase64, 
      pdfFileName,
      fromEmail,
      fromName 
    } = req.body as {
      to: string | string[];
      subject?: string;
      body?: string;
      pdfBase64: string;
      pdfFileName?: string;
      fromEmail?: string;
      fromName?: string;
    };

    if (!to) {
      return res.status(400).json({ error: 'Recipient email address is required' });
    }

    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF attachment is required' });
    }

    // Configure nodemailer transporter
    // Support for SMTP or Gmail OAuth or SendGrid
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
    };

    // If using SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });

      const mailOptions = {
        from: fromEmail || process.env.SMTP_USER || process.env.EMAIL_FROM || 'noreply@catalogue-creator.com',
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject || 'Product Catalogue',
        text: body || 'Please find the attached product catalogue.',
        html: body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : '<p>Please find the attached product catalogue.</p>',
        attachments: [
          {
            filename: pdfFileName || 'catalogue.pdf',
            content: pdfBase64.split(',')[1] || pdfBase64, // Remove data:application/pdf;base64, prefix if present
            encoding: 'base64',
            contentType: 'application/pdf',
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    }

    // Standard SMTP transport
    const transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection
    await transporter.verify();

    const mailOptions = {
      from: fromName && fromEmail 
        ? `${fromName} <${fromEmail}>` 
        : fromEmail || process.env.SMTP_USER || process.env.EMAIL_FROM || 'noreply@catalogue-creator.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || 'Product Catalogue',
      text: body || 'Please find the attached product catalogue.',
      html: body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : '<p>Please find the attached product catalogue.</p>',
      attachments: [
        {
          filename: pdfFileName || 'catalogue.pdf',
          content: pdfBase64.split(',')[1] || pdfBase64, // Remove data:application/pdf;base64, prefix if present
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Email sending error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send email';
    res.status(500).json({ error: message });
  }
}

