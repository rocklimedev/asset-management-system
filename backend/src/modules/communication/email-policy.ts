import { BadRequestException, ConflictException } from '@nestjs/common';

export function companyDomains(): string[] {
  const domains = (process.env.COMMUNICATION_COMPANY_DOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (
    !domains.length ||
    domains.some((d) => !/^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(d))
  )
    throw new BadRequestException('Configure valid COMMUNICATION_COMPANY_DOMAINS');
  return domains;
}
export function validateCompanyEmail(value: string): string {
  const email = value.toLowerCase().trim();
  const [local, domain, extra] = email.split('@');
  if (
    extra ||
    !local ||
    local.length > 64 ||
    !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(local) ||
    !companyDomains().includes(domain)
  )
    throw new BadRequestException(
      'Email must use a configured company domain and valid local part',
    );
  return email;
}
export function emailStem(
  name: string,
  pattern = process.env.COMMUNICATION_EMAIL_PATTERN || '{first}.{last}',
) {
  const parts = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  if (!parts.length) throw new BadRequestException('Set an explicit email for this employee name');
  const first = parts[0],
    last = parts.length > 1 ? parts[parts.length - 1] : '';
  const stem = pattern
    .replace(/\{first\}/g, first)
    .replace(/\{last\}/g, last)
    .replace(/\{initial\}/g, first[0])
    .replace(/^[._-]+|[._-]+$/g, '');
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(stem) || stem.length > 58)
    throw new BadRequestException('Invalid email naming pattern; use {first}, {last}, {initial}');
  return stem;
}
export async function availableEmail(
  name: string,
  domain: string | undefined,
  override: string | undefined,
  exists: (email: string) => Promise<boolean>,
) {
  const selectedDomain = domain || companyDomains()[0];
  if (override) {
    const value = validateCompanyEmail(override);
    if (await exists(value)) throw new ConflictException('Requested email already exists');
    return value;
  }
  const stem = emailStem(name);
  for (let index = 0; index < 1000; index++) {
    const candidate = validateCompanyEmail(`${stem}${index || ''}@${selectedDomain}`);
    if (!(await exists(candidate))) return candidate;
  }
  throw new ConflictException('No available email found; provide an override');
}
