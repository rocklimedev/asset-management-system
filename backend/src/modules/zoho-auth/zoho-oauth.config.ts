import { ServiceUnavailableException } from '@nestjs/common';

export const REQUIRED_SCOPES = [
  'ZohoMail.organization.accounts.READ',
  'ZohoMail.organization.accounts.CREATE',
  'ZohoMail.accounts.READ',
  'ZohoCliq.Users.READ',
  'ZohoCliq.Users.CREATE',
  'ZohoCliq.Channels.READ',
  'ZohoCliq.Channels.UPDATE',
];
const CENTERS: Record<string, string> = {
  us: 'zoho.com',
  in: 'zoho.in',
  eu: 'zoho.eu',
  au: 'zoho.com.au',
  jp: 'zoho.jp',
  ca: 'zohocloud.ca',
  sa: 'zoho.sa',
  cn: 'zoho.com.cn',
};
export function zohoConfig() {
  const dc = (process.env.ZOHO_DATA_CENTER || 'in').toLowerCase();
  const suffix = CENTERS[dc];
  if (!suffix) throw new ServiceUnavailableException('Unsupported ZOHO_DATA_CENTER');
  const endpoint = (env: string, host: string) => {
    const expected = `https://${host}.${suffix}`;
    const value = process.env[env] || expected;
    if (value.replace(/\/$/, '') !== expected)
      throw new ServiceUnavailableException(`${env} must match configured data center`);
    return expected;
  };
  return {
    dc,
    accounts: endpoint('ZOHO_ACCOUNTS_BASE_URL', 'accounts'),
    mail: endpoint('ZOHO_API_BASE_URL', 'mail'),
    cliq: endpoint('ZOHO_CLIQ_BASE_URL', 'cliq'),
    scopes: [
      ...new Set([
        ...REQUIRED_SCOPES,
        ...(process.env.ZOHO_ADDITIONAL_SCOPES || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ]),
    ],
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    redirect: process.env.ZOHO_REDIRECT_URI || '',
    organizationId: process.env.ZOHO_ORGANIZATION_ID || '',
  };
}
export function requireOAuthConfig() {
  const config = zohoConfig();
  if (
    !config.clientId ||
    !config.clientSecret ||
    !config.redirect ||
    !/^\d+$/.test(config.organizationId)
  )
    throw new ServiceUnavailableException(
      'Configure Zoho client, redirect URI and organization ID first.',
    );
  const uri = new URL(config.redirect);
  if (uri.protocol !== 'https:' && !(uri.protocol === 'http:' && uri.hostname === 'localhost'))
    throw new ServiceUnavailableException('Zoho redirect must use HTTPS (localhost permitted).');
  return config;
}
