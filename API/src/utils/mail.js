const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOption = {
    from: `Chronos Support <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html
  };

  return transporter.sendMail(mailOption);
};

const wrapLayout = (content, footer) => `
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 30px;
              font-family: Arial, sans-serif; background-color: #F3EDE7;
              color: #302832; text-align: center; border-radius: 16px;">
      ${content}
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #D8C9C4;
                  font-size: 12px;color: #B99BA8;">
          ${footer}
      </div>
  </div>
`;

const titleStyle = `
  margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #806477;
`;
const linkStyle = `
  display: inline-block; padding: 16px 32px; background-color: #806477;
  color: #FFFFFF; text-decoration: none; font-size: 16px;
  font-weight: bold; border-radius: 12px;margin-bottom: 0;
`;

const sendConfirmationEmail = async (email, code) => {
  const htmlContent = wrapLayout(`
      <p style="${titleStyle}">
          Thank you for registering!<br/>
          Enter the code below to confirm your email address.
      </p>
      <div style="display: inline-block; padding: 18px 28px; background-color: #FFFFFF;
                  border: 1px solid #B99BA8; border-radius: 12px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px;
                       margin-right: -10px; color: #806477;">
              ${code}
          </span>
      </div>
      <p style="margin: 25px 0 0; font-size: 13px; color: #B99BA8;">
          Please do not share this code with anyone.
      </p>
  `, `If you did not create an account, you can safely ignore this email.`);

  return sendEmail({
    to: email,
    subject: 'Registration Confirmation Code',
    html: htmlContent
  });
};

const sendResetPasswordEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const htmlContent = wrapLayout(`
      <p style="${titleStyle}">
          We received a request to reset your password.<br/>
          Click the button below to create a new one.
      </p>
      <a
          href="${url}"
          style="${linkStyle}">
          Reset password
      </a>
      <p style="margin: 25px 0 0 0; font-size: 13px; color: #B99BA8;">
          Or copy and paste this link into your browser:
      </p>
      <p style="margin: 10px 0 0; font-size: 13px; word-break: break-all; color: #806477;">
          ${url}
      </p>
  `, `If you did not request a password reset, you can safely ignore this email.`);

  return sendEmail({
    to: email,
    subject: 'Password Reset',
    html: htmlContent
  });
};

const sendInviteEmail = async (email, calendar, owner) => {
  const url = `${process.env.FRONTEND_URL}/calendar/invites`;
  const htmlContent = wrapLayout(`
      <p style="${titleStyle}">
          <strong>@${owner}</strong> has invited you to collaborate on the calendar
          <strong>"${calendar}"</strong>.
      </p>
      <p style="margin: 0 0 25px 0; font-size: 14px; color: #806477;">
          You can accept or decline this request. This invitation will expire in
          <strong>7 days</strong>.
      </p>
      <a
          href="${url}"
          style="${linkStyle}">
          View Invitation
      </a>
  `, `If you were not expecting this invitation, you can safely ignore this email.`);

  return sendEmail({
    to: email,
    subject: `Calendar Invitation: ${calendar}`,
    html: htmlContent
  });
};

module.exports = {
  sendConfirmationEmail,
  sendResetPasswordEmail,
  sendInviteEmail
};