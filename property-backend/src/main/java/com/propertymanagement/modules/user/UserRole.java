package com.propertymanagement.modules.user;

/**
 * Application roles (aligned with {@code users.role} and Spring {@code hasRole}).
 * <p>Staff: system admin (full), general manager (view/approve, no delete), accountant (operations),
 * internal maintenance, contractor company staff, property guard, procedures clerk (payroll profile).</p>
 */
public enum UserRole {
    /** مدير النظام — full access including contract activation */
    SUPER_ADMIN,
    /** المدير العام — broad read/approve/reject; no destructive deletes */
    GENERAL_MANAGER,
    /** المحاسب — properties, units, tenants, contracts, finance, receipts */
    ACCOUNTANT,
    /** شركة الصيانة / مقاول — assigned maintenance work */
    MAINTENANCE_CONTRACTOR,
    /** موظف صيانة داخل العقار */
    MAINTENANCE_OFFICER,
    /** حارس العقار */
    PROPERTY_GUARD,
    /** مخلص إجراءات — registered mainly for payroll visibility */
    PROCEDURES_CLERK,
    OWNER,
    TENANT;

    /** Internal building technician or maintenance-company (contractor) login. */
    public static boolean isMaintenanceStaff(UserRole r) {
        return r == MAINTENANCE_OFFICER || r == MAINTENANCE_CONTRACTOR;
    }
}
