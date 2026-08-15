import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseJwtSecret: required('SUPABASE_JWT_SECRET'),

  msg91AuthKey: required('MSG91_AUTH_KEY'),
  msg91TemplateId: required('MSG91_TEMPLATE_ID'),
  msg91SenderId: process.env.MSG91_SENDER_ID || 'CREZOA',
  msg91OtpLength: parseInt(process.env.MSG91_OTP_LENGTH || '6', 10),
  msg91OtpExpiryMinutes: parseInt(process.env.MSG91_OTP_EXPIRY || '5', 10),
} as const;
