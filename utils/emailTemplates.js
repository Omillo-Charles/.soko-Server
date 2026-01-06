
const baseStyle = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #e1e1e1;
  border-radius: 10px;
`;

const headerStyle = `
  background-color: #007bff;
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 10px 10px 0 0;
  margin: -20px -20px 20px -20px;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  margin-top: 20px;
`;

const footerStyle = `
  margin-top: 30px;
  font-size: 12px;
  color: #777;
  text-align: center;
  border-top: 1px solid #e1e1e1;
  padding-top: 20px;
`;

export const getWelcomeEmailTemplate = (name, provider = 'Email') => {
  const providerText = provider === 'Email' ? '' : ` via ${provider}`;
  return {
    subject: `Welcome to Duuka${providerText}!`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>Welcome to Duuka!</h1>
        </div>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We're absolutely thrilled to have you join our community${providerText}! Duuka is designed to provide you with the best experience possible.</p>
        <p>Start exploring our platform and make the most of what we have to offer.</p>
        <div style="text-align: center;">
          <a href="#" style="${buttonStyle}">Explore Duuka</a>
        </div>
        <p>If you have any questions, feel free to reply to this email. Our support team is always here to help!</p>
        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} Duuka Inc. All rights reserved.</p>
          <p>You received this email because you signed up for Duuka.</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, welcome to Duuka! We're glad you joined${providerText}. Start exploring now!`
  };
};

export const getForgotPasswordEmailTemplate = (name, resetUrl) => {
  return {
    subject: 'Password Reset Request',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>Password Reset</h1>
        </div>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You recently requested to reset your password for your Duuka account. Click the button below to proceed:</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" style="${buttonStyle}">Reset Your Password</a>
        </div>
        <p>For security reasons, this link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The Duuka Team</p>
        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} Duuka Inc. All rights reserved.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, you requested a password reset. Use this link to reset your password: ${resetUrl}. This link expires in 1 hour.`
  };
};
