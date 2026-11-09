const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendConfirmationEmail = async (email, code) => {
  const textContent = `
    Thank you for registering! Enter the code below to confirm your email address.
    ${code}
    Please do not share this code with anyone.
    If you did not create an account, you can safely ignore this email.
  `;
  const htmlContent = `
      <div style="max-width: 520px; margin: 0 auto; padding: 40px 30px;
                  font-family: Arial, sans-serif; background-color: #F3EDE7;
                  color: #302832; text-align: center; border-radius: 16px;">
          <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #806477;"
      >
              Thank you for registering! Enter the code below to confirm your email address.
          </p>
          <div style="display: inline-block; padding: 18px 28px; background-color: #FFFFFF;
                      border: 1px solid #B99BA8; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px;
                           margin-right: -10px; color: #806477;"
              >
                  ${code}
              </span>
          </div>
          <p style="margin: 25px 0 0; font-size: 13px; color: #B99BA8;">
              Please do not share this code with anyone.
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #D8C9C4;
                      font-size: 12px; color: #B99BA8;"
          >
              If you did not create an account, you can safely ignore this email.
          </div>
      </div>
  `;
  const mailOption = {
    from: `Chronos Support <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Registration Confirmation Code',
    text: textContent,
    html: htmlContent
  };

  return transporter.sendMail(mailOption);
};

const sendResetPasswordEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const textContent = `
    We received a request to reset your password.
    Click the button below to create a new one.
    Reset password
    Or copy and paste this link into your browser:
    ${url}
    If you did not request a password reset, you can safely ignore this email.
  `;
  const htmlContent = `
      <div style=" max-width: 520px; margin: 0 auto; padding: 40px 30px;
                   font-family: Arial, sans-serif; background-color: #F3EDE7;
                   text-align: center; border-radius: 16px;"
      >
          <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #806477;">
              We received a request to reset your password. Click the button below to create a new one.
          </p>
          <a
              href="${url}"
              style="display: inline-block; padding: 16px 32px; background-color: #806477;
                     color: #FFFFFF; text-decoration: none; font-size: 16px;
                     font-weight: bold; border-radius: 12px;margin-bottom: 25px;"
          >
              Reset password
          </a>
          <p style="margin: 0; font-size: 13px; color: #B99BA8;">
              Or copy and paste this link into your browser:
          </p>
          <p style="margin: 10px 0 0; font-size: 13px; word-break: break-all; color: #806477;">
              ${url}
          </p>
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #D8C9C4;
                      font-size: 12px;color: #B99BA8;"
          >
              If you did not request a password reset, you can safely ignore this email.
          </div>
      </div>
  `;
  const mailOption = {
    from: `Chronos Support <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset',
    text: textContent,
    html: htmlContent
  };

  return transporter.sendMail(mailOption);
};

module.exports = {
  sendConfirmationEmail,
  sendResetPasswordEmail
};