/** شاشات كل دور — بدون حوارات (dialogs) */

export const ROLE_USERS = {
  accountant: { email: 'accountant@propmgmt.com', password: '12345', label: 'المحاسب' },
  owner: { email: 'ahmed.alsaeed@email.com', password: '12345', label: 'المالك' },
  tenant: { email: 'rami.sulaiman@email.com', password: '12345', label: 'المستأجر' },
  officer_internal: { email: 'officer.khalid@propmgmt.com', password: '12345', label: 'موظف صيانة (داخلي)' },
  company: { email: 'demo.company@propmgmt.com', password: '12345', label: 'شركة الصيانة', ensure: true },
  officer_company: { email: 'demo.officer.company@propmgmt.com', password: '12345', label: 'موظف شركة صيانة', ensure: true }
};

function screen(id, route, title, actions, opts = {}) {
  return { id, route, title, actions, ...opts };
}

export const ROLE_SECTIONS = [
  {
    roleKey: 'accountant',
    chapter: '1. المحاسب',
    intro: 'دور المحاسب يركز على المالية، العقود، التحصيل، فواتير الصيانة، والتقارير — مع صلاحية عرض معظم بيانات التشغيل.',
    screens: [
      screen('acc-dashboard', '/admin/dashboard', 'لوحة المعلومات', [
        'متابعة مؤشرات الإشغال والإيرادات والصيانة',
        'الوصول السريع للتنبيهات التشغيلية'
      ]),
      screen('acc-finance-dashboard', '/admin/finance/dashboard', 'لوحة المالية', [
        'عرض ملخص الإيرادات والمصروفات حسب العقار',
        'اختيار عقار محدد لتصفية الأرقام'
      ], { selectProperty: true }),
      screen('acc-finance-revenues', '/admin/finance/revenues', 'الإيرادات', [
        'مراجعة إيرادات الإيجار المحصّلة',
        'تصفية حسب العقار والفترة'
      ], { selectProperty: true }),
      screen('acc-finance-expenses', '/admin/finance/expenses', 'المصروفات', [
        'مراجعة مصروفات التشغيل والصيانة',
        'تصفية حسب العقار'
      ], { selectProperty: true }),
      screen('acc-finance-budget', '/admin/finance/budget', 'الميزانية', [
        'مقارنة الميزانية المعتمدة بالفعلي',
        'اختيار عقار لعرض بند الميزانية'
      ], { selectProperty: true }),
      screen('acc-finance-overdue', '/admin/finance/overdue-payments', 'المتأخرات', [
        'متابعة الدفعات المتأخرة',
        'تحديد المستأجرين والعقود المتعثرة'
      ]),
      screen('acc-finance-pnl', '/admin/finance/reports/pnl', 'تقرير الأرباح والخسائر', [
        'استخراج بيان الدخل للفترة',
        'تصفية حسب العقار'
      ], { selectProperty: true }),
      screen('acc-rent-confirmation', '/admin/accountant-portal/rent-confirmation', 'تأكيد إيجار', [
        'مراجعة إثباتات السداد المرفوعة من المستأجرين',
        'اعتماد أو رفض الإثبات'
      ]),
      screen('acc-renewal-requests', '/admin/accountant-portal/renewal-requests', 'طلبات التجديد', [
        'متابعة طلبات تجديد العقود',
        'التنسيق مع الإدارة والمالك'
      ]),
      screen('acc-maint-invoices', '/admin/accountant-portal/maintenance-invoices', 'فواتير صيانة المقاولين', [
        'مراجعة فواتير عقود الصيانة الشهرية',
        'اعتماد الدفع أو الرفض'
      ]),
      screen('acc-contracts-dashboard', '/admin/contracts/dashboard', 'لوحة العقود', [
        'عرض إحصائيات العقود النشطة والمنتهية',
        'متابعة العقود قريبة الانتهاء'
      ]),
      screen('acc-contracts-list', '/admin/contracts/list', 'سجل العقود', [
        'البحث في عقود الإيجار وعقود الصيانة',
        'فتح تفاصيل العقد من الرقم'
      ]),
      screen('acc-contracts-complaints', '/admin/contracts/complaints', 'الشكاوى', [
        'متابعة شكاوى المستأجرين',
        'تعيين مسؤول ومتابعة الحل'
      ]),
      screen('acc-properties', '/admin/properties', 'العقارات', [
        'عرض قائمة العقارات',
        'تصفية حسب عقار محدد عند توفر أكثر من عقار'
      ], { selectScopedProperty: true }),
      screen('acc-units', '/admin/units', 'الوحدات', [
        'عرض وحدات عقار محدد',
        'متابعة حالة الإشغال والإيجار'
      ], { queryPropertyId: 1 }),
      screen('acc-tenants', '/admin/tenants', 'المستأجرين', [
        'عرض المستأجرين وعقودهم',
        'تصفية حسب العقار'
      ], { selectProperty: true }),
      screen('acc-maintenance', '/admin/maintenance', 'طلبات الصيانة', [
        'متابعة طلبات الصيانة لكل العقارات',
        'تعيين الفنيين ومتابعة الحالة'
      ]),
      screen('acc-reports', '/admin/reports', 'مركز التقارير', [
        'الوصول لتقارير الإشغال والصيانة والعقود'
      ]),
      screen('acc-report-occupancy', '/admin/reports/occupancy', 'تقرير الإشغال', [
        'تحليل نسب الإشغال',
        'تصدير للإدارة'
      ]),
      screen('acc-report-contract-expiry', '/admin/reports/contract-expiry', 'انتهاء العقود', [
        'متابعة العقود القريبة من الانتهاء'
      ]),
      screen('acc-owners', '/admin/owners', 'الملاك', [
        'عرض بيانات الملاك',
        'تصفية حسب العقار المرتبط'
      ], { selectProperty: true }),
      screen('acc-contractors', '/admin/contractors', 'شركات المقاولين', [
        'عرض شركات الصيانة المتعاقدة',
        'تصفية حسب العقار'
      ], { selectProperty: true }),
      screen('acc-hr-payroll', '/admin/hr/payroll', 'مسيرات الرواتب', [
        'مراجعة الرواتب المعتمدة',
        'متابعة حالة الصرف'
      ], { selectProperty: true }),
      screen('acc-notifications', '/admin/notifications', 'الإشعارات', [
        'متابعة التنبيهات المالية والتعاقدية'
      ]),
      screen('acc-profile', '/admin/profile', 'الملف الشخصي', [
        'تحديث بيانات الحساب وكلمة المرور'
      ])
    ]
  },
  {
    roleKey: 'owner',
    chapter: '2. المالك',
    intro: 'بوابة المالك لعرض عقاراته، كشوفه المالية، وموافقات العقود دون التدخل التشغيلي الكامل.',
    screens: [
      screen('own-dashboard', '/admin/dashboard', 'لوحة المعلومات', [
        'متابعة أداء عقاراته المملوكة',
        'عرض مؤشرات الإشغال والإيرادات'
      ]),
      screen('own-portal-dashboard', '/admin/owner-portal/dashboard', 'لوحة المالك', [
        'ملخص العقارات والإيرادات',
        'مؤشرات الأداء المالي'
      ]),
      screen('own-portal-properties', '/admin/owner-portal/properties', 'عقاراتي', [
        'عرض العقارات المملوكة وحالتها',
        'متابعة الوحدات والإشغال'
      ]),
      screen('own-portal-statements', '/admin/owner-portal/statements', 'كشوف الحساب', [
        'تحميل كشوف التحصيل والمصروفات',
        'مراجعة صافي العائد'
      ]),
      screen('own-contract-approvals', '/admin/owner-portal/contract-approvals', 'موافقات العقود', [
        'الموافقة على عقود إيجار جديدة',
        'الموافقة على التجديد أو الإنهاء'
      ]),
      screen('own-properties', '/admin/properties', 'العقارات (عرض)', [
        'عرض تفاصيل العقارات المملوكة فقط'
      ], { selectScopedProperty: true }),
      screen('own-units', '/admin/units', 'الوحدات', [
        'متابعة وحدات العقار وحالة الإشغال'
      ], { queryPropertyId: 1 }),
      screen('own-contracts-list', '/admin/contracts/list', 'عقود الإيجار', [
        'عرض عقود عقاراته',
        'متابعة تواريخ الانتهاء والإيجار'
      ]),
      screen('own-finance-dashboard', '/admin/finance/dashboard', 'الملخص المالي', [
        'عرض إيرادات ومصروفات عقاراته'
      ], { selectProperty: true }),
      screen('own-finance-overdue', '/admin/finance/overdue-payments', 'المتأخرات', [
        'متابعة متأخرات مستأجري عقاراته'
      ]),
      screen('own-maintenance', '/admin/maintenance', 'الصيانة', [
        'متابعة طلبات الصيانة على عقاراته'
      ]),
      screen('own-notifications', '/admin/notifications', 'الإشعارات', [
        'تنبيهات الموافقات والتحصيل'
      ]),
      screen('own-profile', '/admin/profile', 'الملف الشخصي', [
        'تحديث بيانات الحساب'
      ])
    ]
  },
  {
    roleKey: 'tenant',
    chapter: '3. المستأجر',
    intro: 'بوابة الخدمة الذاتية للمستأجر: وحدته، عقوده، السداد، الصيانة، والشكاوى.',
    screens: [
      screen('ten-my-unit', '/tenant/my-unit', 'وحدتي', [
        'اختيار الوحدة المستأجرة من القائمة',
        'عرض حالة العقد والإيجار القادم',
        'متابعة طلبات الصيانة للوحدة'
      ], { selectTenantUnit: true }),
      screen('ten-my-contracts', '/tenant/my-contracts', 'عقودي', [
        'اختيار عقد من القائمة',
        'عرض تفاصيل العقد وجدول الدفعات'
      ], { selectTenantContract: true }),
      screen('ten-rent-receipts', '/tenant/rent-receipts', 'إيصالات الإيجار', [
        'عرض سجل الدفعات',
        'رفع إثبات السداد'
      ]),
      screen('ten-contract-request', '/tenant/contract-request', 'طلب تجديد / عقد', [
        'اختيار العقد المراد تجديده',
        'تقديم طلب تجديد'
      ], { selectTenantContract: true }),
      screen('ten-requests', '/tenant/requests', 'طلبات الصيانة', [
        'عرض طلبات الصيانة السابقة',
        'متابعة حالة التنفيذ'
      ]),
      screen('ten-new-request', '/tenant/new-request', 'طلب صيانة جديد', [
        'تقديم بلاغ عطل أو صيانة',
        'إرفاق صور ووصف المشكلة'
      ]),
      screen('ten-complaints', '/tenant/complaints', 'الشكاوى', [
        'تقديم شكوى مرتبطة بالوحدة',
        'متابعة الردود'
      ], { selectTenantUnit: true }),
      screen('ten-notifications', '/tenant/notifications', 'الإشعارات', [
        'تنبيهات العقد والدفع والصيانة'
      ]),
      screen('ten-profile', '/tenant/profile', 'الملف الشخصي', [
        'تحديث بيانات التواصل وكلمة المرور'
      ])
    ]
  },
  {
    roleKey: 'officer_internal',
    chapter: '4. موظف الصيانة (داخلي)',
    intro: 'فني صيانة تابع للعقار — جدول الزيارات وتنفيذ الطلبات الميدانية.',
    screens: [
      screen('off-int-schedule', '/officer/schedule', 'جدول الزيارات', [
        'عرض مواعيد الزيارات اليومية والأسبوعية',
        'الانتقال لتفاصيل الطلب'
      ]),
      screen('off-int-requests', '/officer/requests', 'طلبات الصيانة', [
        'عرض الطلبات المعينة له',
        'بدء التنفيذ وتحديث الحالة'
      ]),
      screen('off-int-request-detail', '/officer/requests/1', 'تفاصيل طلب صيانة', [
        'عرض تفاصيل العطل والوحدة',
        'تسجيل تقرير الزيارة بعد الإنجاز'
      ], { dynamicRequestId: true }),
      screen('off-int-my-requests', '/officer/my-requests', 'طلباتي', [
        'متابعة الطلبات التي أنشأها أو يتابعها'
      ]),
      screen('off-int-profile', '/officer/profile', 'الملف الشخصي', [
        'تحديث بيانات الحساب'
      ])
    ]
  },
  {
    roleKey: 'company',
    chapter: '5. شركة الصيانة',
    intro: 'حساب الشركة المتعاقدة — إدارة الطابور، الفريق، والفواتير.',
    screens: [
      screen('co-schedule', '/officer/schedule', 'جدول الزيارات', [
        'جدولة زيارات فريق الشركة'
      ]),
      screen('co-requests', '/officer/requests', 'طلبات الصيانة', [
        'عرض الطلبات المسندة للشركة',
        'توزيعها على الفنيين'
      ]),
      screen('co-company-queue', '/officer/company-queue', 'طابور الشركة', [
        'طلبات جديدة بانتظار التعيين',
        'سحب الطلب وتوزيعه'
      ]),
      screen('co-my-staff', '/officer/my-staff', 'فريق العمل', [
        'إدارة فنيي الشركة',
        'تفعيل/تعطيل الحسابات'
      ]),
      screen('co-invoices', '/officer/invoices', 'فواتير الشركة', [
        'عرض فواتير عقود الصيانة',
        'متابعة حالة الدفع'
      ]),
      screen('co-my-requests', '/officer/my-requests', 'طلباتي', [
        'متابعة الطلبات الشخصية'
      ]),
      screen('co-profile', '/officer/profile', 'الملف الشخصي', [
        'بيانات حساب الشركة'
      ])
    ]
  },
  {
    roleKey: 'officer_company',
    chapter: '6. موظف شركة الصيانة',
    intro: 'فني تابع لشركة مقاول — ينفذ الطلبات من طابور الشركة ويسجل تقارير الزيارة.',
    screens: [
      screen('off-co-schedule', '/officer/schedule', 'جدول الزيارات', [
        'مواعيد الزيارات المعينة له'
      ]),
      screen('off-co-requests', '/officer/requests', 'طلبات الصيانة', [
        'تنفيذ الطلبات المسندة',
        'تحديث الحالة ميدانياً'
      ]),
      screen('off-co-request-detail', '/officer/requests/1', 'تفاصيل الطلب', [
        'عرض تفاصيل الطلب',
        'إدخال تقرير الزيارة'
      ], { dynamicRequestId: true }),
      screen('off-co-company-queue', '/officer/company-queue', 'طابور الشركة', [
        'طلبات متاحة للسحب',
        'بدء العمل على طلب جديد'
      ]),
      screen('off-co-invoices', '/officer/invoices', 'فواتير (عرض)', [
        'متابعة فواتير الشركة'
      ]),
      screen('off-co-my-requests', '/officer/my-requests', 'طلباتي', [
        'متابعة طلباته الشخصية'
      ]),
      screen('off-co-profile', '/officer/profile', 'الملف الشخصي', [
        'تحديث الحساب'
      ])
    ]
  }
];
