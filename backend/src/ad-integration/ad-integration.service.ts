import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import ActiveDirectory from 'activedirectory2';

// ── Types ──

export interface AdUserEntry {
  sAMAccountName?: string;
  userPrincipalName?: string;
  displayName?: string;
  givenName?: string;
  sn?: string;
  department?: string;
  title?: string;
  telephoneNumber?: string;
  physicalDeliveryOfficeName?: string;
  mail?: string;
  objectSid?: Buffer | string;
  objectGUID?: Buffer | string;
  userAccountControl?: number;
  memberOf?: string[];
  distinguishedName?: string;
}

export interface AdSyncResult {
  usersFound: number;
  usersCreated: number;
  usersUpdated: number;
  usersSkipped: number;
  usersFailed: number;
  errors: string[];
  previewUsers?: AdPreviewUser[];
}

export interface AdPreviewUser {
  sAMAccountName: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  department?: string;
  title?: string;
  phone?: string;
  office?: string;
  existsInDb: boolean;
  existingUserId?: string;
  conflict?: string;
}

// ── Default Portuguese AD group names ──

const DEFAULT_TEACHER_GROUPS = [
  'Professores',
  'Docentes',
  'Teachers',
];

// ── Helper: convert AD SID buffer to string ──
function sidToString(sid: Buffer | string | undefined): string | undefined {
  if (!sid) return undefined;
  if (typeof sid === 'string') return sid;
  if (!Buffer.isBuffer(sid)) return undefined;
  try {
    const revision = sid.readUInt8(0);
    const subAuthorityCount = sid.readUInt8(1);
    const identifierAuthority = sid.readUIntBE(2, 6);
    let result = `S-${revision}-${identifierAuthority}`;
    for (let i = 0; i < subAuthorityCount; i++) {
      result += `-${sid.readUInt32LE(8 + i * 4)}`;
    }
    return result;
  } catch {
    return undefined;
  }
}

// ── Helper: convert AD GUID buffer to string ──
function guidToString(guid: Buffer | string | undefined): string | undefined {
  if (!guid) return undefined;
  if (typeof guid === 'string') return guid;
  if (!Buffer.isBuffer(guid)) return undefined;
  try {
    const hex = guid.toString('hex');
    const a = hex.slice(0, 8);
    const b = hex.slice(8, 12);
    const c = hex.slice(12, 16);
    const d = hex.slice(16, 20);
    const e = hex.slice(20, 32);
    return `${a}-${b}-${c}-${d}-${e}`;
  } catch {
    return undefined;
  }
}

// ── Helper: sanitize UTF-8 string (Portuguese accents) ──
function sanitizeStr(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  // Normalize UTF-8
  return s.normalize('NFC');
}

@Injectable()
export class AdIntegrationService {
  private logger = new Logger(AdIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  // ── Create AD client ──

  private createAdClient(config: {
    domainController: string;
    port: number;
    baseDn: string;
    bindDn: string;
    bindPassword: string;
    useLdaps: boolean;
  }): ActiveDirectory {
    const protocol = config.useLdaps ? 'ldaps' : 'ldap';
    const url = `${protocol}://${config.domainController}:${config.port}`;

    return new ActiveDirectory({
      url,
      baseDN: config.baseDn,
      username: config.bindDn,
      password: config.bindPassword,
      // TLS options for LDAPS
      tlsOptions: config.useLdaps
        ? {
            rejectUnauthorized: false, // Schools often use self-signed certs
          }
        : undefined,
      // Pagination support (AD default page size is 1000)
      page: true,
    });
  }

  // ── Test connection ──

  async testConnection(config: {
    domainController: string;
    port: number;
    baseDn: string;
    bindDn: string;
    bindPassword: string;
    useLdaps: boolean;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    return new Promise((resolve) => {
      const ad = this.createAdClient(config);

      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'Tempo de ligação excedido. Verifique o controlador de domínio e a porta.',
        });
      }, 15000);

      ad.authenticate(config.bindDn, config.bindPassword, (err) => {
        clearTimeout(timeout);
        if (err) {
          this.logger.error(`AD test failed: ${err.message}`);
          let message = 'Falha na ligação ao Active Directory.';
          if (err.message.includes('invalid credentials') || err.message.includes('49')) {
            message = 'Credenciais inválidas. Verifique o utilizador e palavra-passe do serviço.';
          } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
            message = 'Não foi possível contactar o controlador de domínio. Verifique o endereço e porta.';
          } else if (err.message.includes('CERT_')) {
            message = 'Erro de certificado TLS. O servidor usa um certificado auto-assinado.';
          }
          resolve({ success: false, message, details: err.message });
        } else {
          resolve({
            success: true,
            message: 'Ligação ao Active Directory estabelecida com sucesso.',
            details: {
              url: `${config.useLdaps ? 'ldaps' : 'ldap'}://${config.domainController}:${config.port}`,
              baseDn: config.baseDn,
            },
          });
        }
      });
    });
  }

  // ── Query teachers from AD ──

  async queryTeachers(config: {
    domainController: string;
    port: number;
    baseDn: string;
    bindDn: string;
    bindPassword: string;
    useLdaps: boolean;
    teacherGroupDns: string[];
    userFilter?: string;
  }): Promise<{ users: AdUserEntry[]; errors: string[] }> {
    return new Promise((resolve) => {
      const ad = this.createAdClient(config);
      const errors: string[] = [];

      // Build LDAP filter for teacher group members
      // memberOf filter for each group, excluding disabled accounts
      const groupFilters = (config.teacherGroupDns.length > 0
        ? config.teacherGroupDns
        : DEFAULT_TEACHER_GROUPS
      ).map((g) => `(memberOf=${g})`);

      const baseFilter = '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))';
      const additionalFilter = config.userFilter || '';

      let finalFilter: string;
      if (groupFilters.length === 1 && !additionalFilter) {
        finalFilter = `(${baseFilter}${groupFilters[0]})`;
      } else {
        const orClause = groupFilters.length > 0 ? `(|${groupFilters.join('')})` : '';
        finalFilter = `(${baseFilter}${orClause}${additionalFilter})`;
      }

      const attrs = [
        'sAMAccountName',
        'userPrincipalName',
        'displayName',
        'givenName',
        'sn',
        'department',
        'title',
        'telephoneNumber',
        'physicalDeliveryOfficeName',
        'mail',
        'objectSid',
        'objectGUID',
        'userAccountControl',
        'memberOf',
        'distinguishedName',
      ];

      ad.findUsers(finalFilter, attrs, (err, result) => {
        if (err) {
          this.logger.error(`AD query failed: ${err.message}`);
          resolve({ users: [], errors: [`Erro na pesquisa AD: ${err.message}`] });
          return;
        }
        const users = (result?.users || []) as AdUserEntry[];
        this.logger.log(`Found ${users.length} teacher(s) in Active Directory`);
        resolve({ users, errors });
      });
    });
  }

  // ── Map AD user to preview object and check conflicts ──

  async buildPreview(
    adUsers: AdUserEntry[],
    institutionId: string,
  ): Promise<AdPreviewUser[]> {
    const preview: AdPreviewUser[] = [];

    // Fetch existing users by email and SID for conflict detection
    const emails = adUsers
      .map((u) => sanitizeStr(u.userPrincipalName || u.mail).toLowerCase())
      .filter(Boolean);

    // Get existing users by email
    const existingByEmail = new Map<string, { id: string; email: string; firstName: string; lastName: string; adSid: string | null }>();
    if (emails.length > 0) {
      const existing = await this.prisma.user.findMany({
        where: { email: { in: emails }, institutionId, deletedAt: null },
        select: { id: true, email: true, firstName: true, lastName: true, adSid: true },
      });
      for (const u of existing) {
        existingByEmail.set(u.email, u);
      }
    }

    // Get existing users by AD SID
    const sids = adUsers
      .map((u) => sidToString(u.objectSid as Buffer))
      .filter(Boolean) as string[];

    const existingBySid = new Map<string, { id: string; email: string }>();
    if (sids.length > 0) {
      const existing = await this.prisma.user.findMany({
        where: { adSid: { in: sids }, institutionId, deletedAt: null },
        select: { id: true, email: true, adSid: true },
      });
      for (const u of existing) {
        if (u.adSid) existingBySid.set(u.adSid, u);
      }
    }

    for (const adUser of adUsers) {
      const email = sanitizeStr(adUser.userPrincipalName || adUser.mail).toLowerCase();
      const displayName = sanitizeStr(adUser.displayName) || email;
      const firstName = sanitizeStr(adUser.givenName) || displayName.split(' ')[0];
      const lastName = sanitizeStr(adUser.sn) || displayName.split(' ').slice(1).join(' ');
      const sid = sidToString(adUser.objectSid as Buffer);

      // Conflict detection
      const existingSid = sid ? existingBySid.get(sid) : null;
      const existingEmail = existingByEmail.get(email);

      let existsInDb = false;
      let existingUserId: string | undefined;
      let conflict: string | undefined;

      if (existingSid) {
        existsInDb = true;
        existingUserId = existingSid.id;
      } else if (existingEmail) {
        existsInDb = true;
        existingUserId = existingEmail.id;
        if (!existingEmail.adSid && sid) {
          // Email match but no SID link — will update with SID
          conflict = 'Correspondência por email — SID será adicionado';
        }
      }

      // Check if email belongs to a different user (different SID)
      if (existingEmail && existingEmail.adSid && sid && existingEmail.adSid !== sid) {
        conflict = `Email já associado a outro utilizador AD (SID: ${existingEmail.adSid})`;
      }

      preview.push({
        sAMAccountName: sanitizeStr(adUser.sAMAccountName) || email,
        email,
        displayName,
        firstName,
        lastName,
        department: sanitizeStr(adUser.department) || undefined,
        title: sanitizeStr(adUser.title) || undefined,
        phone: sanitizeStr(adUser.telephoneNumber) || undefined,
        office: sanitizeStr(adUser.physicalDeliveryOfficeName) || undefined,
        existsInDb,
        existingUserId,
        conflict,
      });
    }

    return preview;
  }

  // ── Sync teachers into gestEquip ──

  async syncTeachers(
    config: {
      domainController: string;
      port: number;
      baseDn: string;
      bindDn: string;
      bindPassword: string;
      useLdaps: boolean;
      teacherGroupDns: string[];
      userFilter?: string;
    },
    institutionId: string,
  ): Promise<AdSyncResult> {
    const result: AdSyncResult = {
      usersFound: 0,
      usersCreated: 0,
      usersUpdated: 0,
      usersSkipped: 0,
      usersFailed: 0,
      errors: [],
    };

    // Query AD
    const { users: adUsers, errors: queryErrors } = await this.queryTeachers(config);
    result.usersFound = adUsers.length;
    result.errors.push(...queryErrors);

    // Build preview to detect conflicts
    const preview = await this.buildPreview(adUsers, institutionId);

    for (const p of preview) {
      try {
        const adUser = adUsers.find((u) => {
          const uEmail = sanitizeStr(u.userPrincipalName || u.mail).toLowerCase();
          return uEmail === p.email;
        });
        if (!adUser) continue;

        const sid = sidToString(adUser.objectSid as Buffer);
        const guid = guidToString(adUser.objectGUID as Buffer);

        if (p.existsInDb && p.existingUserId) {
          // Update existing user
          await this.prisma.user.update({
            where: { id: p.existingUserId },
            data: {
              firstName: p.firstName,
              lastName: p.lastName,
              phone: p.phone,
              adSid: sid,
              adGuid: guid,
              adSource: 'active_directory',
              adLastSyncAt: new Date(),
            },
          });
          result.usersUpdated++;
        } else if (p.conflict) {
          // Conflict — skip
          result.usersSkipped++;
          result.errors.push(`Ignorado ${p.email}: ${p.conflict}`);
        } else {
          // Create new teacher account
          // Generate a random password — teacher will use Google auth or reset
          const randomPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

          await this.prisma.user.create({
            data: {
              email: p.email,
              firstName: p.firstName,
              lastName: p.lastName,
              phone: p.phone,
              role: 'TEACHER',
              institutionId,
              adSid: sid,
              adGuid: guid,
              adSource: 'active_directory',
              adLastSyncAt: new Date(),
              isActive: true,
              roleConfirmed: false,
            },
          });
          result.usersCreated++;
        }
      } catch (err: any) {
        result.usersFailed++;
        const msg = `Erro ao sincronizar ${p.email}: ${err.message || err}`;
        result.errors.push(msg);
        this.logger.error(msg);
      }
    }

    return result;
  }

  // ── Get AD config for institution (without password) ──

  async getConfig(institutionId: string) {
    const config = await this.prisma.schoolAdConfig.findFirst({
      where: { institutionId },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!config) return null;

    // Remove password from response
    const { bindPassword, ...safeConfig } = config as any;
    return safeConfig;
  }

  // ── Save AD config (encrypt password) ──

  async saveConfig(institutionId: string, dto: any) {
    const encryptedPassword = this.encryption.encrypt(dto.bindPassword);

    const config = await this.prisma.schoolAdConfig.upsert({
      where: {
        institutionId: institutionId,
      },
      create: {
        institutionId,
        domainController: dto.domainController,
        port: dto.port || 636,
        baseDn: dto.baseDn,
        bindDn: dto.bindDn,
        bindPassword: encryptedPassword,
        useLdaps: dto.useLdaps !== false,
        teacherGroupDns: dto.teacherGroupDns || [],
        userFilter: dto.userFilter || null,
        enabled: dto.enabled ?? false,
      },
      update: {
        domainController: dto.domainController,
        port: dto.port || 636,
        baseDn: dto.baseDn,
        bindDn: dto.bindDn,
        bindPassword: encryptedPassword, // always re-encrypt on save
        useLdaps: dto.useLdaps !== false,
        teacherGroupDns: dto.teacherGroupDns || [],
        userFilter: dto.userFilter || null,
        enabled: dto.enabled ?? false,
      },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    const { bindPassword: _, ...safeConfig } = config as any;
    return safeConfig;
  }

  // ── Get full config (with decrypted password) for internal use ──

  async getFullConfig(institutionId: string) {
    const config = await this.prisma.schoolAdConfig.findFirst({
      where: { institutionId },
    });
    if (!config) return null;

    return {
      ...config,
      bindPassword: this.encryption.decrypt(config.bindPassword),
    };
  }

  // ── Log sync operation ──

  async logSync(
    configId: string,
    operation: string,
    status: string,
    startedAt: Date,
    result: AdSyncResult,
  ) {
    return this.prisma.adSyncLog.create({
      data: {
        configId,
        operation,
        status,
        startedAt,
        completedAt: new Date(),
        usersFound: result.usersFound,
        usersCreated: result.usersCreated,
        usersUpdated: result.usersUpdated,
        usersSkipped: result.usersSkipped,
        usersFailed: result.usersFailed,
        errors: result.errors,
      },
    });
  }
}
