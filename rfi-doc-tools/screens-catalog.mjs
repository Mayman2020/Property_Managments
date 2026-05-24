/** Full system screen catalog — routes, dialogs, and Arabic descriptions */

export const PORTALS = {
  admin: { email: 'admin@propmgmt.com', password: '12345', prefix: '/admin' },
  tenant: { email: 'rami.sulaiman@email.com', password: '12345', prefix: '/tenant' },
  officer: { email: 'officer.khalid@propmgmt.com', password: '12345', prefix: '/officer' },
  employee: { email: 'officer.khalid@propmgmt.com', password: '12345', prefix: '/employee' },
  owner: { email: 'ahmed.alsaeed@email.com', password: '12345', prefix: '/admin' }
};

export const STATIC_PAGES = [
  // ── Auth ──
  { id: 'auth-login', chapter: 'المصادقة', route: '/auth/login', portal: null, title: 'تسجيل الدخول', desc: 'بوابة الدخول الموحدة لجميع المستخدمين.', business: 'نقطة الدخول الآمنة وتوزيع الجلسات حسب الدور.' },
  { id: 'auth-change-password', chapter: 'المصادقة', route: '/change-password', portal: 'admin', title: 'تغيير كلمة المرور', desc: 'شاشة إلزامية عند أول دخول أو كلمة مؤقتة.', business: 'سياسة أمن كلمات المرور.' },

  // ── Admin overview ──
  { id: 'admin-dashboard', chapter: 'نظرة عامة', route: '/admin/dashboard', portal: 'admin', title: 'لوحة المعلومات', desc: 'مؤشرات الإشغال والعقود والصيانة والتنبيهات.', business: 'رؤية تنفيذية فورية لأداء المحفظة العقارية.' },
  { id: 'admin-notifications', chapter: 'نظرة عامة', route: '/admin/notifications', portal: 'admin', title: 'الإشعارات', desc: 'مركز الإشعارات التشغيلية والمالية والتعاقدية.', business: 'متابعة الأحداث الحرجة دون تأخير.' },
  { id: 'admin-my-requests', chapter: 'نظرة عامة', route: '/admin/my-requests', portal: 'admin', title: 'طلباتي', desc: 'طلبات الصيانة والإجراءات المرتبطة بالمستخدم الحالي.', business: 'تتبع شخصي لمهام المستخدم ضمن سير العمل.' },
  { id: 'admin-profile', chapter: 'نظرة عامة', route: '/admin/profile', portal: 'admin', title: 'الملف الشخصي', desc: 'بيانات الحساب وتغيير كلمة المرور والصورة.', business: 'إدارة هوية المستخدم وإعدادات الحساب.' },
  { id: 'admin-audit-log', chapter: 'نظرة عامة', route: '/admin/audit-log', portal: 'admin', title: 'سجل التدقيق', desc: 'تتبع العمليات والتغييرات على البيانات.', business: 'الامتثال والمساءلة وأمن المعلومات.' },

  // ── Directory ──
  { id: 'admin-properties', chapter: 'الدليل', route: '/admin/properties', portal: 'admin', title: 'قائمة العقارات', desc: 'سجل المشاريع والمباني مع البحث والتصفية.', business: 'أساس هيكل الأصول العقارية.' },
  { id: 'admin-units', chapter: 'الدليل', route: '/admin/units', portal: 'admin', title: 'إدارة الوحدات', desc: 'الوحدات حسب العقار والطابق وحالة الإشغال.', business: 'تخطيط الإشغال والتسعير.' },
  { id: 'admin-tenants', chapter: 'الدليل', route: '/admin/tenants', portal: 'admin', title: 'إدارة المستأجرين', desc: 'بيانات المستأجرين والضمانات والربط بالوحدات.', business: 'إدارة علاقة المستأجر كاملة.' },
  { id: 'admin-owners', chapter: 'الدليل', route: '/admin/owners', portal: 'admin', title: 'إدارة الملاك', desc: 'سجل الملاك وربطهم بالعقارات والبوابة.', business: 'حوكمة ملكية الأصول والتواصل مع المالك.' },
  { id: 'admin-contractors', chapter: 'الدليل', route: '/admin/contractors', portal: 'admin', title: 'شركات المقاولين', desc: 'شركات الصيانة الخارجية وبيانات التعاقد.', business: 'إدارة الموردين والصيانة التعاقدية.' },
  { id: 'admin-ratings', chapter: 'الدليل', route: '/admin/ratings', portal: 'admin', title: 'تقييمات الخدمة', desc: 'تقييمات زيارات الصيانة والشكاوى.', business: 'قياس جودة الخدمة وتحسين الأداء.' },
  { id: 'admin-legal-entities', chapter: 'الدليل', route: '/admin/legal-entities', portal: 'admin', title: 'الكيانات القانونية', desc: 'الشركات والسجلات التجارية المالكة للعقارات.', business: 'دعم تعدد الكيانات ضمن منصة واحدة.' },
  { id: 'admin-hr-employees', chapter: 'الموارد البشرية', route: '/admin/hr/employees', portal: 'admin', title: 'الموظفون', desc: 'سجل الموظفين والأقسام والرواتب الأساسية.', business: 'ربط الموارد البشرية بالعقارات.' },
  { id: 'admin-hr-leaves', chapter: 'الموارد البشرية', route: '/admin/hr/leaves', portal: 'admin', title: 'الإجازات', desc: 'طلبات الإجازة والأرصدة والموافقات.', business: 'إدارة حضور الفريق التشغيلي.' },
  { id: 'admin-hr-payroll', chapter: 'الموارد البشرية', route: '/admin/hr/payroll', portal: 'admin', title: 'مسيرات الرواتب', desc: 'إنشاء واعتماد وصرف الرواتب.', business: 'أتمتة الرواتب المرتبطة بالعقار.' },

  // ── Operations ──
  { id: 'admin-maintenance-list', chapter: 'العمليات', route: '/admin/maintenance', portal: 'admin', title: 'طلبات الصيانة', desc: 'قائمة الطلبات وحالاتها والتعيين.', business: 'دورة صيانة كاملة من التسجيل للإغلاق.' },
  { id: 'admin-maintenance-new', chapter: 'العمليات', route: '/admin/maintenance/new', portal: 'admin', title: 'طلب صيانة جديد', desc: 'نموذج إنشاء طلب صيانة.', business: 'تسجيل أعطال وطلبات الصيانة الدورية.' },
  { id: 'admin-inventory', chapter: 'العمليات', route: '/admin/inventory', portal: 'admin', title: 'المخزون', desc: 'أصناف المخزون وحركات الصرف والإضافة.', business: 'ضبط قطع الغيار وتكاليف الصيانة.' },
  { id: 'admin-reports-hub', chapter: 'التقارير', route: '/admin/reports', portal: 'admin', title: 'مركز التقارير', desc: 'بوابة التقارير التشغيلية والمالية.', business: 'تقارير إدارية موحدة.' },
  { id: 'admin-report-contract-expiry', chapter: 'التقارير', route: '/admin/reports/contract-expiry', portal: 'admin', title: 'تقرير انتهاء العقود', desc: 'عقود قريبة من الانتهاء.', business: 'التخطيط للتجديد أو الإخلاء.' },
  { id: 'admin-report-occupancy', chapter: 'التقارير', route: '/admin/reports/occupancy', portal: 'admin', title: 'تحليلات الإشغال', desc: 'نسب الإشغال حسب العقار والفترة.', business: 'تحسين العائد من الوحدات الشاغرة.' },
  { id: 'admin-report-maintenance', chapter: 'التقارير', route: '/admin/reports/maintenance', portal: 'admin', title: 'تقرير الصيانة', desc: 'إحصائيات وتكاليف الصيانة.', business: 'مراقبة أداء الصيانة والميزانية.' },
  { id: 'admin-report-budget', chapter: 'التقارير', route: '/admin/reports/budget-vs-actual', portal: 'admin', title: 'الميزانية مقابل الفعلي', desc: 'مقارنة المصروفات بالميزانية.', business: 'رقابة مالية على مستوى العقار.' },

  // ── Contracts ──
  { id: 'admin-contracts-dashboard', chapter: 'العقود', route: '/admin/contracts/dashboard', portal: 'admin', title: 'لوحة العقود', desc: 'إحصائيات العقود والإجراءات السريعة.', business: 'متابعة دورة حياة التعاقد.' },
  { id: 'admin-contracts-list', chapter: 'العقود', route: '/admin/contracts/list', portal: 'admin', title: 'سجل العقود', desc: 'عقود الإيجار وعقود الصيانة في قائمة واحدة.', business: 'مرجع تعاقدي شامل.' },
  { id: 'admin-contracts-templates', chapter: 'العقود', route: '/admin/contracts/templates', portal: 'admin', title: 'قوالب العقود', desc: 'قوالب جاهزة لعقود الإيجار.', business: 'تسريع إنشاء العقود وتوحيد الصياغة.' },
  { id: 'admin-contracts-complaints', chapter: 'العقود', route: '/admin/contracts/complaints', portal: 'admin', title: 'الشكاوى والمخالفات', desc: 'شكاوى المستأجرين ومتابعة الحل.', business: 'إدارة المخاطر ورضا المستأجر.' },
  { id: 'admin-vacancies-list', chapter: 'العقود', route: '/admin/vacancies/list', portal: 'admin', title: 'الوحدات الشاغرة', desc: 'إعلانات التأجير للوحدات الشاغرة.', business: 'تسويق الوحدات وجذب مستأجرين.' },

  // ── Finance ──
  { id: 'admin-finance-dashboard', chapter: 'المالية', route: '/admin/finance/dashboard', portal: 'admin', title: 'لوحة المالية', desc: 'ملخص الإيرادات والمصروفات.', business: 'رؤية مالية لكل عقار أو محفظة.' },
  { id: 'admin-finance-expenses', chapter: 'المالية', route: '/admin/finance/expenses', portal: 'admin', title: 'المصروفات', desc: 'تسجيل ومتابعة مصروفات التشغيل.', business: 'ضبط التكاليف التشغيلية.' },
  { id: 'admin-finance-revenues', chapter: 'المالية', route: '/admin/finance/revenues', portal: 'admin', title: 'الإيرادات', desc: 'إيرادات الإيجار والتحصيل.', business: 'متابعة الدخل التعاقدي.' },
  { id: 'admin-finance-budget', chapter: 'المالية', route: '/admin/finance/budget', portal: 'admin', title: 'الميزانية', desc: 'إعداد ومتابعة ميزانيات العقارات.', business: 'تخطيط مالي سنوي.' },
  { id: 'admin-finance-pnl', chapter: 'المالية', route: '/admin/finance/reports/pnl', portal: 'admin', title: 'تقرير الأرباح والخسائر', desc: 'بيان الدخل للفترة.', business: 'تقارير مالية للإدارة والملاك.' },
  { id: 'admin-finance-cashflow', chapter: 'المالية', route: '/admin/finance/reports/cashflow', portal: 'admin', title: 'تقرير التدفق النقدي', desc: 'حركة النقد الداخل والخارج.', business: 'سيولة وتخطيط نقدي.' },
  { id: 'admin-finance-owner-statement', chapter: 'المالية', route: '/admin/finance/reports/owner-statement', portal: 'admin', title: 'كشف حساب المالك', desc: 'بيان مالي للمالك عن عقاراته.', business: 'شفافية مع الملاك.' },
  { id: 'admin-finance-overdue', chapter: 'المالية', route: '/admin/finance/overdue-payments', portal: 'admin', title: 'المتأخرات', desc: 'دفعات متأخرة وإشعارات التحصيل.', business: 'تقليل التعثر والذمم المدينة.' },

  // ── Portals (admin paths) ──
  { id: 'admin-accountant-rent', chapter: 'بوابة المحاسب', route: '/admin/accountant-portal/rent-confirmation', portal: 'admin', title: 'تأكيد الإيجار', desc: 'مراجعة إثباتات السداد من المستأجرين.', business: 'تحقق محاسبي قبل اعتماد الدفعة.' },
  { id: 'admin-accountant-renewal', chapter: 'بوابة المحاسب', route: '/admin/accountant-portal/renewal-requests', portal: 'admin', title: 'طلبات التجديد', desc: 'متابعة طلبات تجديد العقود.', business: 'تنسيق التجديد بين الأطراف.' },
  { id: 'admin-accountant-maint-inv', chapter: 'بوابة المحاسب', route: '/admin/accountant-portal/maintenance-invoices', portal: 'admin', title: 'فواتير صيانة المقاولين', desc: 'مراجعة واعتماد فواتير عقود الصيانة.', business: 'ضبط مدفوعات الموردين.' },
  { id: 'admin-owner-portal-dash', chapter: 'بوابة المالك', route: '/admin/owner-portal/dashboard', portal: 'admin', title: 'لوحة المالك', desc: 'ملخص عقارات المالك وإيراداته.', business: 'شفافية مع مالك العقار.' },
  { id: 'admin-owner-portal-statements', chapter: 'بوابة المالك', route: '/admin/owner-portal/statements', portal: 'admin', title: 'كشوف المالك', desc: 'كشوف حساب وتحصيل.', business: 'تقارير مالية للمالك.' },
  { id: 'admin-owner-portal-properties', chapter: 'بوابة المالك', route: '/admin/owner-portal/properties', portal: 'admin', title: 'عقارات المالك', desc: 'قائمة عقارات المالك وحالتها.', business: 'متابعة الأصول المملوكة.' },
  { id: 'admin-owner-approvals', chapter: 'بوابة المالك', route: '/admin/owner-portal/contract-approvals', portal: 'admin', title: 'موافقات العقود', desc: 'عقود بانتظار موافقة المالك.', business: 'حوكمة قرارات التأجير والإنهاء.' },

  // ── Settings ──
  { id: 'admin-users', chapter: 'الإعدادات', route: '/admin/users', portal: 'admin', title: 'إدارة المستخدمين', desc: 'إنشاء المستخدمين وتعيين الأدوار.', business: 'إدارة الهوية والوصول.' },
  { id: 'admin-user-access', chapter: 'الإعدادات', route: '/admin/user-access', portal: 'admin', title: 'صلاحيات الوصول للعقارات', desc: 'ربط المستخدمين بالعقارات المسموحة.', business: 'عزل البيانات بين العقارات.' },
  { id: 'admin-screens', chapter: 'الإعدادات', route: '/admin/screens', portal: 'admin', title: 'إدارة الشاشات', desc: 'تفعيل/تعطيل شاشات النظام.', business: 'تخصيص واجهة النظام.' },
  { id: 'admin-permissions', chapter: 'الإعدادات', route: '/admin/permissions', portal: 'admin', title: 'صلاحيات الأدوار', desc: 'مصفوفة صلاحيات لكل دور.', business: 'الحد الأدنى من الصلاحيات.' },
  { id: 'admin-module-settings', chapter: 'الإعدادات', route: '/admin/module-settings', portal: 'admin', title: 'وحدات النظام', desc: 'تفعيل الموديولات لكل عقار.', business: 'تخصيص الحل حسب احتياج العميل.' },
  { id: 'admin-lookups', chapter: 'الإعدادات', route: '/admin/lookups', portal: 'admin', title: 'القوائم المرجعية', desc: 'الدول، المدن، التصنيفات.', business: 'توحيد البيانات المرجعية.' },

  // ── Tenant portal ──
  { id: 'tenant-my-unit', chapter: 'بوابة المستأجر', route: '/tenant/my-unit', portal: 'tenant', title: 'وحدتي', desc: 'بيانات الوحدة والعقد الحالي.', business: 'خدمة ذاتية للمستأجر.' },
  { id: 'tenant-contracts', chapter: 'بوابة المستأجر', route: '/tenant/my-contracts', portal: 'tenant', title: 'عقودي', desc: 'قائمة عقود الإيجار.', business: 'شفافية تعاقدية.' },
  { id: 'tenant-receipts', chapter: 'بوابة المستأجر', route: '/tenant/rent-receipts', portal: 'tenant', title: 'إيصالات الإيجار', desc: 'سجل الدفعات وإرفاق الإثباتات.', business: 'تسهيل التحصيل والتوثيق.' },
  { id: 'tenant-contract-request', chapter: 'بوابة المستأجر', route: '/tenant/contract-request', portal: 'tenant', title: 'طلب عقد', desc: 'طلب تجديد أو عقد جديد.', business: 'أتمتة طلبات التجديد.' },
  { id: 'tenant-requests', chapter: 'بوابة المستأجر', route: '/tenant/requests', portal: 'tenant', title: 'طلبات الصيانة', desc: 'متابعة طلبات الصيانة المقدمة.', business: 'تجربة مستأجر متكاملة.' },
  { id: 'tenant-new-request', chapter: 'بوابة المستأجر', route: '/tenant/new-request', portal: 'tenant', title: 'طلب صيانة جديد', desc: 'نموذج تقديم عطل أو صيانة.', business: 'تسريع الاستجابة للأعطال.' },
  { id: 'tenant-complaints', chapter: 'بوابة المستأجر', route: '/tenant/complaints', portal: 'tenant', title: 'تقديم شكوى', desc: 'تسجيل شكوى أو مخالفة.', business: 'قناة تواصل رسمية.' },
  { id: 'tenant-notifications', chapter: 'بوابة المستأجر', route: '/tenant/notifications', portal: 'tenant', title: 'إشعارات المستأجر', desc: 'تنبيهات العقد والدفع والصيانة.', business: 'إبقاء المستأجر على اطلاع.' },
  { id: 'tenant-my-requests', chapter: 'بوابة المستأجر', route: '/tenant/my-requests', portal: 'tenant', title: 'طلباتي', desc: 'ملخص طلبات المستخدم.', business: 'تتبع شخصي.' },
  { id: 'tenant-profile', chapter: 'بوابة المستأجر', route: '/tenant/profile', portal: 'tenant', title: 'ملف المستأجر', desc: 'بيانات الحساب الشخصي.', business: 'إدارة الحساب.' },

  // ── Officer portal ──
  { id: 'officer-schedule', chapter: 'بوابة الصيانة', route: '/officer/schedule', portal: 'officer', title: 'جدول الزيارات', desc: 'مواعيد الزيارات المجدولة.', business: 'تنظيم عمل الفني الميداني.' },
  { id: 'officer-requests', chapter: 'بوابة الصيانة', route: '/officer/requests', portal: 'officer', title: 'طلبات الصيانة (فني)', desc: 'قائمة الطلبات المعينة للفني.', business: 'تنفيذ الصيانة الميدانية.' },
  { id: 'officer-my-requests', chapter: 'بوابة الصيانة', route: '/officer/my-requests', portal: 'officer', title: 'طلباتي (فني)', desc: 'طلبات المستخدم الفني.', business: 'متابعة شخصية.' },
  { id: 'officer-profile', chapter: 'بوابة الصيانة', route: '/officer/profile', portal: 'officer', title: 'ملف الفني', desc: 'بيانات حساب الفني.', business: 'إدارة الحساب.' },
  { id: 'officer-notifications', chapter: 'بوابة الصيانة', route: '/officer/notifications', portal: 'officer', title: 'إشعارات الفني', desc: 'تنبيهات التعيين والجدولة.', business: 'استجابة سريعة للطوارئ.' },

  // ── Employee portal ──
  { id: 'employee-payslips', chapter: 'بوابة الموظف', route: '/employee/my-payslips', portal: 'employee', title: 'كشوف الراتب', desc: 'عرض مسيرات الرواتب الشخصية.', business: 'خدمة ذاتية للموظف.' },
  { id: 'employee-notifications', chapter: 'بوابة الموظف', route: '/employee/notifications', portal: 'employee', title: 'إشعارات الموظف', desc: 'تنبيهات الموارد البشرية.', business: 'تواصل داخلي.' },
  { id: 'employee-profile', chapter: 'بوابة الموظف', route: '/employee/profile', portal: 'employee', title: 'ملف الموظف', desc: 'بيانات الحساب.', business: 'إدارة الحساب.' }
];

/** Dynamic detail pages — route built from API discovery */
export const DYNAMIC_PAGES = [
  { id: 'admin-maintenance-detail', chapter: 'العمليات', portal: 'admin', apiPath: '/maintenance/requests?page=0&size=1', idField: 'id', route: (id) => `/admin/maintenance/${id}`, title: 'تفاصيل طلب صيانة', desc: 'تفاصيل الطلب والجدولة وتقارير الزيارة.', business: 'متابعة تنفيذ الصيانة خطوة بخطوة.' },
  { id: 'admin-contract-detail', chapter: 'العقود', portal: 'admin', apiPath: '/contracts?page=0&size=20', idField: 'id', filter: (r) => !r.source || r.source === 'LEASE' || r.contractType === 'LEASE', route: (id) => `/admin/contracts/${id}`, title: 'تفاصيل عقد إيجار', desc: 'بيانات العقد والجدول الزمني للدفعات والملحقات.', business: 'إدارة العقد النشط كاملاً.' },
  { id: 'admin-contract-renew', chapter: 'العقود', portal: 'admin', apiPath: '/contracts?page=0&size=20', idField: 'id', filter: (r) => !r.source || r.source === 'LEASE' || r.contractType === 'LEASE', route: (id) => `/admin/contracts/${id}/renew`, title: 'تجديد عقد إيجار', desc: 'نموذج تجديد العقد والزيادات.', business: 'أتمتة التجديد متعدد السنوات.' },
  {
    id: 'admin-maint-contract-detail',
    chapter: 'العقود',
    portal: 'admin',
    apiPath: '/maintenance-contracts',
    idField: 'contractId',
    route: (id) => `/admin/contracts/maintenance/${id}`,
    title: 'تفاصيل عقد صيانة',
    desc: 'عقد صيانة مع شركة مقاول وفواتيره.',
    business: 'إدارة تكاليف الصيانة التعاقدية.'
  },
  { id: 'admin-contractor-detail', chapter: 'الدليل', portal: 'admin', apiPath: '/contractor-companies?page=0&size=1', idField: 'id', route: (id) => `/admin/contractors/${id}`, title: 'تفاصيل شركة مقاول', desc: 'بيانات الشركة وعقودها وموظفيها.', business: 'إدارة علاقة المورد.' },
  { id: 'admin-hr-employee-detail', chapter: 'الموارد البشرية', portal: 'admin', apiPath: '/hr/employees?page=0&size=1', idField: 'id', route: (id) => `/admin/hr/employees/${id}`, title: 'تفاصيل موظف', desc: 'ملف الموظف الكامل.', business: 'سجل موارد بشرية.' },
  { id: 'admin-hr-payroll-detail', chapter: 'الموارد البشرية', portal: 'admin', apiPath: '/hr/payroll?page=0&size=1', idField: 'id', route: (id) => `/admin/hr/payroll/${id}`, title: 'تفاصيل مسير راتب', desc: 'تفاصيل الرواتب والبدلات والخصومات.', business: 'اعتماد وصرف الرواتب.' },
  { id: 'admin-vacancy-inquiries', chapter: 'العقود', portal: 'admin', apiPath: '/vacancies?page=0&size=1', idField: 'id', route: (id) => `/admin/vacancies/${id}/inquiries`, title: 'استفسارات التأجير', desc: 'استفسارات المستأجرين المحتملين.', business: 'تحويل الاستفسارات لعقود.' },
  { id: 'tenant-contract-detail', chapter: 'بوابة المستأجر', portal: 'tenant', apiPath: '/tenant-portal/my-contracts', idField: 'id', route: (id) => `/tenant/contracts/${id}`, title: 'تفاصيل عقد (مستأجر)', desc: 'عرض العقد وجدول الدفعات.', business: 'شفافية للمستأجر.' },
  { id: 'officer-request-detail', chapter: 'بوابة الصيانة', portal: 'officer', apiPath: '/maintenance/requests?page=0&size=1', idField: 'id', route: (id) => `/officer/requests/${id}`, title: 'تفاصيل طلب (فني)', desc: 'تفاصيل الطلب المعين للفني.', business: 'تنفيذ ميداني.' },
  { id: 'officer-visit-report', chapter: 'بوابة الصيانة', portal: 'officer', apiPath: '/maintenance/requests?page=0&size=1', idField: 'id', route: (id) => `/officer/requests/${id}/visit-report`, title: 'تقرير زيارة', desc: 'نموذج تقرير الزيارة والأعمال المنفذة.', business: 'توثيق إنجاز الصيانة.' },
  { id: 'employee-payslip-detail', chapter: 'بوابة الموظف', portal: 'employee', apiPath: '/hr/payroll/my-payslips', idField: 'id', route: (id) => `/employee/my-payslips/${id}`, title: 'تفاصيل كشف راتب', desc: 'تفاصيل الراتب الشهري.', business: 'خدمة ذاتية.' }
];

/** Dialog / form captures from list pages */
export const DIALOG_RECIPES = [
  { id: 'dialog-property-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/properties', clicks: ['app-page-header button[mat-flat-button]', 'button:has(mat-icon:text("add"))'], title: 'إضافة عقار', desc: 'نموذج إنشاء عقار جديد.', business: 'توسيع المحفظة العقارية.' },
  { id: 'dialog-property-view', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/properties', clicks: ['table tbody tr:first-child button mat-icon:text("visibility")', 'table tbody tr:first-child .app-icon-btn.accent'], title: 'عرض تفاصيل عقار', desc: 'عرض بيانات العقار والمرفقات.', business: 'مراجعة دون تعديل.' },
  { id: 'dialog-property-edit', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/properties', clicks: ['table tbody tr:first-child button mat-icon:text("edit")'], title: 'تعديل عقار', desc: 'تعديل بيانات العقار والطوابق.', business: 'تحديث سجل الأصل.' },
  { id: 'dialog-unit-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/units', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة وحدة', desc: 'إنشاء وحدة ضمن عقار.', business: 'توسيع الوحدات القابلة للتأجير.' },
  { id: 'dialog-tenant-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/tenants', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة مستأجر', desc: 'تسجيل مستأجر وربطه بوحدة.', business: 'بدء دورة التأجير.' },
  { id: 'dialog-owner-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/owners', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة مالك', desc: 'تسجيل مالك عقار.', business: 'ربط الملكية بالنظام.' },
  { id: 'dialog-contractor-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/contractors', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة شركة مقاول', desc: 'تسجيل شركة صيانة خارجية.', business: 'توسيع شبكة الموردين.' },
  { id: 'dialog-legal-entity-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/legal-entities', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة كيان قانوني', desc: 'تسجيل شركة مالكة.', business: 'تعدد الكيانات.' },
  { id: 'dialog-inventory-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/inventory', clicks: ['button:has(mat-icon:text("add"))', 'app-page-header button[mat-flat-button]'], title: 'إضافة صنف مخزون', desc: 'تعريف صنف وكمية.', business: 'ضبط المخزون.' },
  { id: 'dialog-contract-add-choice', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/contracts/list', clicks: ['app-page-header button[mat-flat-button]', 'button:has(mat-icon:text("add"))'], title: 'إنشاء عقد (اختيار النوع)', desc: 'اختيار عقد إيجار أو صيانة.', business: 'بدء التعاقد.' },
  { id: 'dialog-expense-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/finance/expenses', clicks: ['button[mat-flat-button]'], title: 'إضافة مصروف', desc: 'تسجيل مصروف تشغيلي.', business: 'توثيق التكاليف.' },
  { id: 'dialog-revenue-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/finance/revenues', clicks: ['button[mat-flat-button]'], title: 'إضافة إيراد', desc: 'تسجيل إيراد.', business: 'توثيق الدخل.' },
  { id: 'dialog-hr-employee-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/hr/employees', clicks: ['button.navy-btn', 'button[mat-flat-button]'], title: 'إضافة موظف', desc: 'تسجيل موظف جديد.', business: 'توسيع الفريق.' },
  { id: 'dialog-hr-leave-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/hr/leaves', clicks: ['button.navy-btn', 'button[mat-flat-button]'], title: 'طلب إجازة', desc: 'تقديم طلب إجازة.', business: 'إدارة الحضور.' },
  { id: 'dialog-user-add', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/users', clicks: ['app-page-header button[mat-flat-button]', 'button:has(mat-icon:text("add"))'], title: 'إضافة مستخدم', desc: 'إنشاء حساب مستخدم وتعيين دور.', business: 'إدارة الهوية.' },
  { id: 'dialog-contract-template', chapter: 'النماذج', portal: 'admin', listRoute: '/admin/contracts/templates', clicks: ['button[mat-flat-button]', 'button:has(mat-icon:text("add"))'], title: 'قالب عقد', desc: 'إنشاء أو تعديل قالب عقد.', business: 'توحيد صياغة العقود.', optional: true }
];
