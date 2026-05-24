import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..');
const outPath = path.join(docsDir, 'business-guide-ar.docx');

const rtl = { bidirectional: true };
const run = (text, bold = false) =>
  new TextRun({ text, bold, rightToLeft: true, font: 'Arial' });
const p = (text, opts = {}) =>
  new Paragraph({
    ...rtl,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 120 },
    children: [run(text, opts.bold)],
    ...opts.extra,
  });
const h1 = (text) =>
  new Paragraph({
    ...rtl,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400, after: 200 },
    children: [run(text, true)],
  });
const h2 = (text) =>
  new Paragraph({
    ...rtl,
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300, after: 160 },
    children: [run(text, true)],
  });
const h3 = (text) =>
  new Paragraph({
    ...rtl,
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 200, after: 120 },
    children: [run(text, true)],
  });

function table(headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text, header = false) =>
    new TableCell({
      borders,
      width: { size: 33, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          ...rtl,
          alignment: AlignmentType.RIGHT,
          children: [run(text, header)],
        }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) })),
    ],
  });
}

const children = [
  h1('دليل الأعمال والشاشات — نظام إدارة العقارات'),
  p('وثيقة مرجعية بالعربية — آخر تحديث: 20 مايو 2026'),
  p('تصف كل دور، كل شاشة، مسار العمل من البداية للنهاية، ثم الثغرات والتطورات المقترحة.'),

  h2('١. نظرة عامة على النظام'),
  p('النظام يدير دورة حياة العقار السكني والتجاري من التسجيل حتى التشغيل اليومي.'),
  h3('الكيانات الأساسية'),
  table(
    ['الكيان', 'الوصف'],
    [
      ['عقار Property', 'مبنى أو مجمع عقاري'],
      ['وحدة Unit', 'شقة أو مكتب — شاغرة أو محجوزة أو مؤجرة'],
      ['مالك Owner', 'موافقة عقود وكشوف'],
      ['مستأجر Tenant', 'عقود ودفعات وصيانة وشكاوى'],
      ['عقد إيجار', 'يربط مستأجر + وحدة + عقار'],
      ['جدول دفعات', 'أقساط شهرية بعد التفعيل'],
      ['طلب صيانة', 'بلاغ مرتبط بوحدة أو عقار'],
      ['عقد وفاتورة صيانة', 'مقاولين وفواتير'],
    ]
  ),
  h3('البوابات الأربع'),
  table(
    ['البوابة', 'المسار', 'المستخدمون'],
    [
      ['إدارة النظام', '/admin/', 'مدير النظام، المدير العام، المحاسب، حارس، مخلص إجراءات'],
      ['بوابة المستأجر', '/tenant/', 'المستأجر'],
      ['بوابة الصيانة', '/officer/', 'فني أو شركة صيانة'],
      ['بوابة الموظف', '/employee/', 'موظف داخلي — رواتب'],
    ]
  ),

  h2('٢. الأدوار — وظيفة كل مستخدم'),
  table(
    ['الدور', 'الاسم', 'المهام'],
    [
      ['SUPER_ADMIN', 'مدير النظام', 'صلاحيات كاملة: عقارات، مستخدمين، تفعيل عقود'],
      ['GENERAL_MANAGER', 'المدير العام', 'إشراف، موافقات، تقارير'],
      ['ACCOUNTANT', 'المحاسب', 'إيرادات، مصروفات، إيصالات، متأخرات'],
      ['PROCEDURES_CLERK', 'مخلص إجراءات', 'رواتب وموارد بشرية'],
      ['PROPERTY_GUARD', 'حارس العقار', 'عرض محدود حسب العقار'],
      ['MAINTENANCE_OFFICER_INTERNAL', 'فني داخلي', 'زيارات وطلبات وإغلاق'],
      ['MAINTENANCE_OFFICER_COMPANY', 'فني شركة', 'طابور الشركة'],
      ['MAINTENANCE_COMPANY', 'شركة صيانة', 'طابور وفواتير وموظفين'],
      ['OWNER', 'مالك', 'موافقة مسودات وكشوف'],
      ['TENANT', 'مستأجر', 'وحدة وعقود وصيانة'],
    ]
  ),

  h2('٣. شاشات بوابة الإدارة'),
  h3('٣.١ نظرة عامة'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['لوحة التحكم', '/admin/dashboard', 'مؤشرات ونشاط أخير'],
      ['الإشعارات', '/admin/notifications', 'كل التنبيهات'],
      ['سجل العمليات', '/admin/audit-log', 'تتبع العمليات'],
      ['الملف الشخصي', '/admin/profile', 'الحساب'],
    ]
  ),
  h3('٣.٢ الدليل'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['العقارات', '/admin/properties', 'إنشاء وربط مالك'],
      ['الوحدات', '/admin/units', 'وحدات لكل عقار'],
      ['المستأجرون', '/admin/tenants', 'سجل المستأجرين'],
      ['الملاك', '/admin/owners', 'بيانات الملاك'],
      ['المستخدمون', '/admin/users', 'حسابات وأدوار'],
      ['الجداول المرجعية', '/admin/lookups', 'أنواع وحالات'],
      ['الكيانات القانونية', '/admin/legal-entities', 'فوترة وعقود'],
    ]
  ),
  h3('٣.٣ العقود'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['لوحة العقود', '/admin/contracts/dashboard', 'KPI عقود'],
      ['قائمة العقود', '/admin/contracts/list', 'إيجار وصيانة'],
      ['تفاصيل العقد', '/admin/contracts/:id', 'مسودة وتفعيل ودفعات'],
      ['موافقات العقود', '/admin/owner-portal/contract-approvals', 'موافقة المالك'],
      ['الشكاوى', '/admin/contracts/complaints', 'شكاوى المستأجرين'],
    ]
  ),
  h3('٣.٤ المالية'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['اللوحة المالية', '/admin/finance/dashboard', 'إيراد ومصروف ومتأخرات'],
      ['المصروفات', '/admin/finance/expenses', 'تسجيل مصروفات'],
      ['الإيرادات', '/admin/finance/revenues', 'إيرادات غير الإيجار'],
      ['تأكيد الإيصالات', '/admin/accountant-portal/rent-confirmation', 'تأكيد دفعات'],
      ['فواتير الصيانة', '/admin/accountant-portal/maintenance-invoices', 'مقاولين'],
    ]
  ),
  h3('٣.٥ الصيانة'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['طلبات الصيانة', '/admin/maintenance', 'كل الطلبات'],
      ['طلب جديد', '/admin/maintenance/new', 'من الإدارة'],
      ['المخزن', '/admin/inventory', 'قطع غيار'],
      ['المقاولون', '/admin/contractors', 'شركات صيانة'],
    ]
  ),
  h3('٣.٦ تقارير وHR'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['مركز التقارير', '/admin/reports', 'تقارير تشغيلية'],
      ['انتهاء العقود', '/admin/reports/contract-expiry', 'عقود قريبة الانتهاء'],
      ['الإشغال', '/admin/reports/occupancy', 'نسب إشغال'],
      ['الموظفون', '/admin/hr/employees', 'موارد بشرية'],
      ['الرواتب', '/admin/hr/payroll', 'مسير رواتب'],
    ]
  ),
  h3('٣.٧ بوابة المالك'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['لوحة المالك', '/admin/owner-portal/dashboard', 'ملخص'],
      ['كشوف المالك', '/admin/owner-portal/statements', 'كشوف حساب'],
      ['عقارات المالك', '/admin/owner-portal/properties', 'عقاراته'],
    ]
  ),

  h2('٤. بوابة المستأجر'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['وحدتي', '/tenant/my-unit', 'ملخص الوحدة'],
      ['عقودي', '/tenant/my-contracts', 'عقود الإيجار'],
      ['إيصالات', '/tenant/rent-receipts', 'دفعات'],
      ['طلب صيانة', '/tenant/new-request', 'بلاغ جديد'],
      ['الشكاوى', '/tenant/complaints', 'شكوى للإدارة'],
    ]
  ),

  h2('٥. بوابة الصيانة'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['جدولي', '/officer/schedule', 'مواعيد'],
      ['طلبات', '/officer/requests', 'مسندة'],
      ['تقرير زيارة', '/officer/.../visit-report', 'إغلاق'],
      ['طابور الشركة', '/officer/company-queue', 'استلام'],
    ]
  ),

  h2('٦. بوابة الموظف'),
  table(
    ['الشاشة', 'المسار', 'الغرض'],
    [
      ['إصداراتي', '/employee/my-payslips', 'كشوف رواتب'],
      ['الإشعارات', '/employee/notifications', 'HR'],
    ]
  ),

  h2('٧. مسار العمل الكامل'),
  h3('المرحلة ٠ — الدخول'),
  p('تسجيل الدخول → تغيير كلمة المرور → توجيه حسب الدور. مدير النظام يفعّل الصلاحيات والشاشات.'),
  h3('المرحلة A — عقار ووحدات'),
  table(
    ['خطوة', 'من', 'الشاشة', 'النتيجة'],
    [
      ['1', 'مدير/محاسب', 'العقارات', 'عقار جديد'],
      ['2', 'مدير/محاسب', 'الوحدات', 'وحدات شاغرة'],
      ['3', 'تلقائي', 'لوحة التحكم', 'تحديث المؤشرات'],
    ]
  ),
  h3('المرحلة B — أطراف'),
  table(
    ['خطوة', 'من', 'الشاشة', 'النتيجة'],
    [
      ['4', 'مدير', 'المستخدمون', 'محاسب'],
      ['5', 'مدير', 'الملاك', 'بوابة مالك'],
      ['6', 'مدير', 'المستأجرون', 'بوابة مستأجر'],
    ]
  ),
  h3('المرحلة C — عقد إيجار'),
  table(
    ['خطوة', 'من', 'الشاشة', 'النتيجة'],
    [
      ['7', 'إدارة', 'عقد جديد', 'DRAFT — وحدة محجوزة'],
      ['8', 'إدارة', 'إرسال للمالك', 'PENDING_OWNER_APPROVAL'],
      ['9', 'مالك/مدير', 'موافقات', 'ACTIVE + جدول دفعات'],
      ['10', 'تلقائي', 'الوحدات', 'مؤجرة'],
    ]
  ),
  h3('المرحلة D — مالية'),
  table(
    ['خطوة', 'من', 'الشاشة', 'النتيجة'],
    [
      ['11', 'محاسب', 'دفعة', 'PAYMENT_RECEIVED'],
      ['12', 'محاسب', 'تأكيد إيصالات', 'تأكيد رسمي'],
      ['14', 'مجدول', '—', 'RENT_DUE و OVERDUE'],
    ]
  ),
  h3('المرحلة E — صيانة'),
  table(
    ['خطوة', 'من', 'الشاشة', 'النتيجة'],
    [
      ['15', 'مستأجر/إدارة', 'طلب', 'مفتوح'],
      ['16', 'إدارة', 'تعيين', 'ASSIGNED'],
      ['17', 'فني', 'تقرير زيارة', 'COMPLETED'],
      ['19', 'محاسب', 'فواتير', 'في التقارير'],
    ]
  ),
  h3('المرحلة F و G'),
  p('F: إشعارات + سجل عمليات + شكاوى. G: لوحة التحكم وتقارير من /dashboard/stats و /finance/dashboard و /recent-activity'),

  h2('٨. الإشعارات الرئيسية'),
  table(
    ['الحدث', 'النوع', 'لمن'],
    [
      ['مسودة عقد', 'CONTRACT_AWAITING_OWNER_REVIEW', 'المالك'],
      ['تفعيل', 'CONTRACT_ACTIVATED', 'مستأجر ومحاسب'],
      ['استحقاق', 'RENT_DUE', 'مستأجر'],
      ['متأخر', 'RENT_OVERDUE', 'مستأجر ومحاسب'],
      ['دفعة', 'PAYMENT_RECEIVED', 'مستأجر'],
      ['صيانة', 'REQUEST_CREATED', 'إدارة وفني'],
      ['إغلاق', 'REQUEST_COMPLETED', 'مستأجر'],
    ]
  ),

  h2('٩. الثغرات المعروفة'),
  table(
    ['#', 'الثغرة', 'ملاحظة'],
    [
      ['1', 'مجدول 09:00', 'API اختبار /dev/schedulers/run-all'],
      ['2', 'بريد SMTP', 'يحتاج إعداد'],
      ['3', 'واجهة HR', 'تحسين تدريجي'],
      ['4', 'موافقة مالك مزدوجة', 'تدريب مستخدم'],
      ['5', 'E2E كامل', 'بيئة + بيانات'],
      ['6', 'home-portal', 'غير مربوط'],
    ]
  ),

  h2('١٠. التطورات المقترحة'),
  h3('قصيرة المدى'),
  table(
    ['التطوير', 'الفائدة'],
    [
      ['توحيد UI', 'تجربة واحدة'],
      ['Playwright A-G', 'ثقة إنتاج'],
      ['SMS/WhatsApp', 'وصول أسرع'],
      ['PDF مالك', 'متطلب شائع'],
    ]
  ),
  h3('متوسطة المدى'),
  table(
    ['التطوير', 'الفائدة'],
    [
      ['تطبيق جوال', 'مستأجر'],
      ['بوابة /owner', 'فصل المالك'],
      ['دفع إلكتروني', 'تقليل متأخرات'],
    ]
  ),
  h3('طويلة المدى'),
  table(
    ['التطوير', 'الفائدة'],
    [
      ['Power BI', 'تحليلات'],
      ['multi-tenant', 'توسع'],
      ['IoT', 'مباني ذكية'],
      ['e-sign', 'عقود قانونية'],
    ]
  ),

  h2('١١. خلاصة تنفيذية'),
  p('يبدأ: عقار → وحدات → مستخدمين. القلب: عقد إيجار → دفعات. المحاسب يغلق المالية. المالك يوافق. المستأجر والفني يشغّلان الصيانة. لوحة التحكم للمتابعة اليومية.'),
  p('API: /api/v1 — GET /dashboard/stats ، GET /dashboard/recent-activity'),
];

const doc = new Document({
  sections: [{ properties: {}, children }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log('Created:', outPath);
