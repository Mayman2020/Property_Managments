/**
 * QA role credentials.
 *
 * The repository's seed migration V151 originally created one account per role,
 * but a later purge wiped them. The bootstrap spec re-creates the role accounts
 * via the live admin UI / API. Until then, only SUPER_ADMIN is guaranteed to
 * authenticate. Any spec that needs a different role must wait until bootstrap
 * has completed or mark itself "Blocked" through `recordRow`.
 */

export type RoleKey =
  | 'SUPER_ADMIN'
  | 'GENERAL_MANAGER'
  | 'ACCOUNTANT'
  | 'HR_OFFICER'
  | 'MAINTENANCE_OFFICER_INTERNAL'
  | 'MAINTENANCE_OFFICER_COMPANY'
  | 'MAINTENANCE_COMPANY'
  | 'PROPERTY_GUARD'
  | 'PROCEDURES_CLERK'
  | 'OWNER'
  | 'TENANT';

export interface RoleCredential {
  role: RoleKey;
  email: string;
  password: string;
  /**
   * Set by the bootstrap spec once the account is confirmed to authenticate. If
   * `false`, dependent specs should record `Status=Blocked` instead of failing.
   */
  available?: boolean;
}

/**
 * Canonical QA accounts. Passwords match V151 (`12345`). Emails follow the
 * V151 pattern so we can re-use them without inventing new identities.
 */
export const QA_CREDENTIALS: Record<RoleKey, RoleCredential> = {
  SUPER_ADMIN: { role: 'SUPER_ADMIN', email: 'admin@propmgmt.com', password: '12345' },
  GENERAL_MANAGER: { role: 'GENERAL_MANAGER', email: 'qa.gm@propmgmt.com', password: '12345' },
  ACCOUNTANT: { role: 'ACCOUNTANT', email: 'qa.accountant@propmgmt.com', password: '12345' },
  HR_OFFICER: { role: 'HR_OFFICER', email: 'qa.hr@propmgmt.com', password: '12345' },
  MAINTENANCE_OFFICER_INTERNAL: {
    role: 'MAINTENANCE_OFFICER_INTERNAL',
    email: 'qa.officer.internal@propmgmt.com',
    password: '12345'
  },
  MAINTENANCE_OFFICER_COMPANY: {
    role: 'MAINTENANCE_OFFICER_COMPANY',
    email: 'qa.officer.company@propmgmt.com',
    password: '12345'
  },
  MAINTENANCE_COMPANY: {
    role: 'MAINTENANCE_COMPANY',
    email: 'qa.maint.company@propmgmt.com',
    password: '12345'
  },
  PROPERTY_GUARD: {
    role: 'PROPERTY_GUARD',
    email: 'qa.guard@propmgmt.com',
    password: '12345'
  },
  PROCEDURES_CLERK: {
    role: 'PROCEDURES_CLERK',
    email: 'qa.clerk@propmgmt.com',
    password: '12345'
  },
  OWNER: { role: 'OWNER', email: 'qa.owner@propmgmt.com', password: '12345' },
  TENANT: { role: 'TENANT', email: 'qa.tenant2@propmgmt.com', password: '12345' }
};
