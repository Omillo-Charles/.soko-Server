
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
    subject: `Welcome to .soko${providerText}!`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>Welcome to .soko!</h1>
        </div>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We're absolutely thrilled to have you join our community${providerText}! .soko is designed to provide you with the best experience possible.</p>
        <p>Start exploring our platform and make the most of what we have to offer.</p>
        <div style="text-align: center;">
          <a href="#" style="${buttonStyle}">Explore .soko</a>
        </div>
        <p>If you have any questions, feel free to reply to this email. Our support team is always here to help!</p>
        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} .soko Inc. All rights reserved.</p>
          <p>You received this email because you signed up for .soko.</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, welcome to .soko! We're glad you joined${providerText}. Start exploring now!`
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
        <p>You recently requested to reset your password for your .soko account. Click the button below to proceed:</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" style="${buttonStyle}">Reset Your Password</a>
        </div>
        <p>For security reasons, this link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The .soko Team</p>
        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} .soko Inc. All rights reserved.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, you requested a password reset. Use this link to reset your password: ${resetUrl}. This link expires in 1 hour.`
  };
};

export const getVerificationEmailTemplate = (name, otp) => {
  return {
    subject: 'Verify Your Email - .soko',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>Email Verification</h1>
        </div>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for signing up for .soko! To complete your registration, please verify your email address by entering the following code:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff; padding: 15px; border: 2px dashed #007bff; display: inline-block;">
            ${otp}
          </div>
        </div>
        <p>This code will expire in <strong>15 minutes</strong>. If you did not sign up for a .soko account, please ignore this email.</p>
        <p>Best regards,<br>The .soko Team</p>
        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} .soko Inc. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, your verification code for .soko is: ${otp}. This code expires in 15 minutes.`
  };
};

export const getOrderConfirmationEmailTemplate = (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0;">
        <div style="font-weight: bold; color: #333;">${item.name}</div>
        ${item.size || item.color ? `<div style="font-size: 12px; color: #666;">${[item.size, item.color].filter(Boolean).join(' | ')}</div>` : ''}
      </td>
      <td style="padding: 12px 0; text-align: center; color: #666;">x${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #333;">KES ${item.price.toLocaleString()}</td>
    </tr>
  `).join('');

  return {
    subject: `Order Confirmed - #${order._id.toString().slice(-6).toUpperCase()}`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>Order Confirmed!</h1>
        </div>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Thank you for your order! We've received your request and we're getting it ready for you. Your order ID is <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong>.</p>
        
        <div style="margin: 30px 0; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #007bff; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e1e1e1; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">
                <th style="padding-bottom: 10px;">Item</th>
                <th style="padding-bottom: 10px; text-align: center;">Qty</th>
                <th style="padding-bottom: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top: 20px; font-weight: bold; font-size: 18px; color: #333;">Total Amount</td>
                <td style="padding-top: 20px; text-align: right; font-weight: bold; font-size: 18px; color: #007bff;">KES ${order.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipping Address</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            <strong>${order.shippingAddress.name}</strong><br>
            ${order.shippingAddress.street}, ${order.shippingAddress.city}<br>
            Phone: ${order.shippingAddress.phone}
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/account/orders/${order._id}" style="${buttonStyle}">View Order Details</a>
        </div>

        <p style="margin-top: 30px;">If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br>The .soko Team</p>

        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} .soko Inc. All rights reserved.</p>
          <p>Payment Method: ${order.paymentMethod}</p>
        </div>
      </div>
    `,
    text: `Hi ${user.name}, your order #${order._id.toString().slice(-6).toUpperCase()} for KES ${order.totalAmount.toLocaleString()} has been confirmed!`
  };
};

export const getNewOrderSellerEmailTemplate = (order, shop, user) => {
  const shopItems = order.items.filter(item => item.shop.toString() === shop._id.toString());
  const shopTotal = shopItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const itemsHtml = shopItems.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0;">
        <div style="font-weight: bold; color: #333;">${item.name}</div>
        ${item.size || item.color ? `<div style="font-size: 12px; color: #666;">${[item.size, item.color].filter(Boolean).join(' | ')}</div>` : ''}
      </td>
      <td style="padding: 12px 0; text-align: center; color: #666;">x${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #333;">KES ${item.price.toLocaleString()}</td>
    </tr>
  `).join('');

  return {
    subject: `New Order Received - #${order._id.toString().slice(-6).toUpperCase()}`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1>New Order!</h1>
        </div>
        <p>Hi <strong>${shop.name}</strong>,</p>
        <p>You've received a new order from <strong>${user.name}</strong>. Please process it as soon as possible.</p>
        
        <div style="margin: 30px 0; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #007bff; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e1e1e1; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">
                <th style="padding-bottom: 10px;">Item</th>
                <th style="padding-bottom: 10px; text-align: center;">Qty</th>
                <th style="padding-bottom: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top: 20px; font-weight: bold; font-size: 18px; color: #333;">Earnings</td>
                <td style="padding-top: 20px; text-align: right; font-weight: bold; font-size: 18px; color: #007bff;">KES ${shopTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipping Details</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            <strong>${order.shippingAddress.name}</strong><br>
            ${order.shippingAddress.street}, ${order.shippingAddress.city}<br>
            Phone: ${order.shippingAddress.phone}
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/account/seller/orders" style="${buttonStyle}">Manage Order</a>
        </div>

        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} .soko Inc. All rights reserved.</p>
          <p>Order ID: #${order._id}</p>
        </div>
      </div>
    `,
    text: `Hi ${shop.name}, you received a new order #${order._id.toString().slice(-6).toUpperCase()} from ${user.name}!`
  };
};
