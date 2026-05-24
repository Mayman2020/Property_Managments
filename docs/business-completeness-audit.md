# Business Completeness Audit — Real Estate Management System

**تقرير تدقيق اكتمال الأعمال — نظام إدارة العقارات**

**المصدر:** `docs/ar-business-guide.md` + مراجعة الكود (`property-backend`, `property-frontend`)  
**التاريخ:** 2026-05-20 (محدّث بعد Phase 2B)  
**المنظور:** مدير عقارات يومي + Solution Architect

---

## ملخص تنفيذي | Executive Summary

النظام يمتلك **نواة تشغيلية قوية ومكتملة نسبياً** بعد ثلاث موجات تطوير (Phase 1، 2، 2B): عقارات وملاك متعددون بنسب، عقود إيجار، دفعات ومتأخرات، صيانة بـ SLA، شواغر مع نشر تلقائي، معاينات استلام/تسليم، كشوف مالك، وتصدير CSV مالي.

**ما زال ناقصاً للمنافسة الكاملة:** غرامة تأخير تلقائية قابلة للتكوين، دفع إلكتروني، CRM تأجير كامل، PDF كشوف، e-sign، SMS، ومسار `SUSPENDED` لعقود الإيجار.

**مرجع تقني مفصّل:** [`ar-business-guide.md`](ar-business-guide.md) — §17 ملخص الإنجازات.

---

## 1. خريطة دورة الحياة الكاملة | COMPLETE BUSINESS LIFECYCLE MAP

### 1.1 Property → Unit → Tenant → Lease → Payment → Renewal/Termination

| المرحلة | الموجود | الحالة | المرجع |
|---------|---------|--------|--------|
| Property CRUD + ملاك متعددون | إنشاء/تعديل، `property_owners` | ✅ | `/admin/properties`, `PROPERTY_LINKED_TO_OWNER` |
| Unit + إشغال | `is_rented`, `is_reserved`, sync | ✅ | `/admin/units`, `syncUnitRentedFromContracts()` |
| تسجيل مستأجر | ملف + بوابة | ✅ | `/admin/tenants` |
| DRAFT → موافقة مالك → ACTIVE | مسار كامل | ✅ | `submit-for-owner-approval`, `activate`, `/owner-portal/decision` |
| جدول دفعات | عند التفعيل + WAIVED | ✅ | `generatePaymentSchedule()` |
| تحصيل إيجار | تسجيل يدوي + إثبات + تأكيد محاسب | ✅ | `RentPaymentService`, `/tenant-portal/.../proof` |
| متأخرات | مجدول → `OVERDUE` + `RENT_OVERDUE` | ✅ | Phase 1 — `ContractScheduler` + `RentPaymentService` |
| غرامات تأخير | حقل `lateFee` فقط | ⚠️ | **إدخال يدوي** — لا قاعدة تلقائية |
| تجديد | طلب → موافقة مالك → عقد جديد | ✅ | `request-renewal`, `renewal-decision`, escalation |
| إنهاء | طلب → موافقة → TERMINATED | ✅ | `terminate`, `termination-decision` |
| انتهاء تلقائي | EXPIRED | ✅ | `ContractScheduler`, `CONTRACT_EXPIRING_SOON` |
| تسليم | تأمين، أضرار، معاينة، clear-unit | ✅ | handover + **MOVE_OUT SIGNED إلزامي** (2B) + `link-damages` |
| SUSPENDED | enum + واجهة | ❌ | **لا مسار Java يضبط الحالة** |
| شاغر → عقد | قوائم + استفسارات + تحويل + نشر يدوي/تلقائي | ✅ | Phase 1 convert؛ Phase 2B `VacancyPublishingService` + `POST /vacancies` |

### 1.2 Maintenance Request → Assignment → Execution → Invoice → Payment

| المرحلة | الحالة | ملاحظة |
|---------|--------|--------|
| إنشاء (مستأجر/إدارة) | ✅ | `/tenant/new-request` |
| تعيين + طابور شركة | ✅ | `assign`, `/officer/company-queue` |
| جدولة + قبول/رفض | ✅ | `REQUEST_SCHEDULED`, `SCHEDULE_*` |
| تقرير زيارة + إغلاق | ✅ | `visit-report` → `COMPLETED` |
| SLA على الطلب | ✅ Phase 2 | `sla_deadline` + `sla_breached`؛ URGENT +4h … LOW +72h؛ `OperationalScheduler` |
| تصعيد طوارئ | ✅ Phase 2 | URGENT متأخر >1h → GM؛ غير مُعيّن >1h → إعادة تعيين تلقائي |
| فاتورة → محاسب | ✅ | `/accountant-portal/maintenance-invoices` |
| `REQUEST_COMPLETED` | ✅ Phase 1 | عند إغلاق الطلب |
| `MAINTENANCE_REQUEST_OVERDUE` | ✅ Phase 2 | عند تجاوز `sla_deadline` |

### 1.3 عقد صيانة (مقاول)

| المرحلة | الحالة |
|---------|--------|
| DRAFT → ACTIVE + موافقة مالك | ✅ |
| إنهاء / تجديد | ✅ |
| أقساط فواتير + مجدول | ✅ |
| ربط تلقائي بمصروف | ⚠️ يدوي غالباً |

### 1.4 Owner → Approval → Statements

| المرحلة | الحالة |
|---------|--------|
| بوابة مالك + موافقات | ✅ |
| كشوف شهرية (عرض) | ✅ | `OwnerStatement` + بوابة مالك |
| توليد كشوف من المعاملات | ✅ Phase 1/2 | مجدول شهري + حصص إيراد + مصروفات مُقسّمة |
| تقسيم إيراد بين ملاك % | ✅ Phase 2 | `ownership_percentage` + `owner_revenue_shares` |
| PDF للمالك | ❌ | — |
| `OWNER_STATEMENT` notify | ✅ Phase 1 | `OWNER_STATEMENT` |

### 1.5 Employee → Payroll → Leave

| المرحلة | الحالة |
|---------|--------|
| موظفون + رواتب SUBMITTED→PAID | ✅ |
| كشوف موظف | ✅ `/employee/my-payslips` |
| إجازات + تنبيه رصيد | ✅ |
| سلف راتب | ⚠️ `SALARY_ADVANCE_*` **غير مُرسلة** |
| `PAYROLL_GENERATED` | ❌ |

### 1.6 Vacancy & Inspections (Phase 2B)

| المرحلة | الحالة | ملاحظة |
|---------|--------|--------|
| نشر شاغر عند EXPIRED/TERMINATED | ✅ | `ContractScheduler` + `finalizeTerminationApproval` |
| مصدر إعلان MANUAL / AUTO | ✅ | V163 + واجهة |
| backfill شواغر | ✅ | `POST /dev/schedulers/vacancy-auto-publish` |
| معاينة MOVE_IN / MOVE_OUT | ✅ | V162 + APIs + واجهة |
| توقيع مفتش + مستأجر | ✅ | `UnitInspectionService.sign` |
| ربط أضرار معاينة بالتأمين | ✅ | `link-damages` → `terminationDamagesAmount` |
| clear-unit بدون معاينة | ❌ ممنوع | 400 — سلوك مقصود |

---

## 2. قواعد أعمال ناقصة | MISSING BUSINESS RULES

| القاعدة (معيار السوق) | الوضع الحالي | الفجوة |
|------------------------|--------------|--------|
| غرامة تأخير تلقائية بعد N يوم | `lateFee` يدوي | ❌ |
| فترة سماح ثم جزاء % | `RENT_GRACE_PERIOD_ENDING` للمحاسب فقط | ⚠️ |
| تسوية تأمين إلزامية | APIs موجودة | ⚠️ بدون checklist إلزامي |
| عتبات موافقة (مبلغ > X → GM) | موافقة ثنائية فقط | ❌ |
| تصعيد موافقة مالك المتأخرة | — | ❌ |
| تصعيد إيجار عند التجديد | ✅ PERCENTAGE / FIXED | |
| تقسيم % بين ملاك | `property_owners` + حصص عند الدفع | ✅ Phase 2 |
| inquiry → عقد | تحويل inquiry لمسودة عقد (Phase 1) | ⚠️ | CRM كامل (معاينات مجدولة ميدانياً) لا يزال ❌ |
| معاينة إلزامية قبل clear-unit | MOVE_OUT SIGNED | ✅ Phase 2B | — |
| نشر شاغر بعد انتهاء عقد | تلقائي | ✅ Phase 2B | يدوي من الوحدات أيضاً |
| منع تفعيل عقد بمستند منتهي | `DOCUMENT_EXPIRY_WARNING` ميت | ❌ |
| تجاوز ميزانية يمنع مصروف | `BUDGET_THRESHOLD` ميت | ❌ |
| فترة إشعار قانوني للإنهاء | terminate بدون تحقق | ⚠️ |

---

## 3. مسارات عمل ناقصة | MISSING WORKFLOWS

| المسار | الحالة | ملاحظة |
|--------|--------|--------|
| **Tenant acquisition funnel** | ❌ | لا lead → معاينة → طلب → عرض → عقد |
| **Move-in inspection** | ✅ Phase 2B | `unit_inspections` + `/admin/inspections/:id` + تبويب عقد |
| **Move-out inspection** | ✅ Phase 2B | checklist + توقيع + `link-damages`؛ `report-damages` يبقى مساراً يدوياً سريعاً |
| **Dispute resolution** | ❌ | شكاوى بسيطة — بدون مراحل وساطة |
| **Emergency maintenance escalation** | ✅ Phase 2 | URGENT SLA + GM + إعادة تعيين؛ لا SMS |
| **Budget vs actual alerts** | ❌ | تقرير فقط — `BUDGET_THRESHOLD_EXCEEDED` غير مفعّل |
| **Rent dunning متدرج** | ⚠️ | RENT_DUE + grace للمحاسب — **لا سلسلة للمستأجر** |
| **إقفال شهر مالي** | ❌ | — |
| **تعديل عقد mid-term** | ⚠️ | ملحقات — **بدون موافقة رسمية** |
| **نشر شاغر تلقائي** | ✅ Phase 2B | عند EXPIRED/TERMINATED؛ ليس بعد `clear-unit` فقط |

---

## 4. فجوات الإشعارات | NOTIFICATION GAPS

### 4.1 مُفعّلة (Phase 1 / 2 / 2B)

| النوع | المحفّز |
|-------|---------|
| `RENT_OVERDUE` | دفعة → OVERDUE |
| `REQUEST_COMPLETED` | إغلاق طلب صيانة |
| `OWNER_STATEMENT` | توليد كشف مالك |
| `RENTAL_INQUIRY_RECEIVED` | استفسار شاغر |
| `MAINTENANCE_REQUEST_OVERDUE` | تجاوز `sla_deadline` (Phase 2) |
| `VACANCY_PUBLISHED` | نشر شاغر يدوي/تلقائي (2B) |
| `INSPECTION_SCHEDULED` / `INSPECTION_COMPLETED` | معاينات (2B) |

### 4.2 ما زال معرّفاً ولا يُرسل (أو جزئياً)

| النوع | ملاحظة |
|-------|--------|
| `BUDGET_THRESHOLD_EXCEEDED` | enum موجود — لا ربط عند المصروف |
| `SALARY_ADVANCE_*` (4) | سلف راتب صامتة |
| `PAYROLL_GENERATED` | غير مُرسل |
| `FINANCE_ALERT` | عام — غير مُستخدم |
| `NEW_LOGIN_ALERT` / `ACCOUNT_LOCKED` | أمان — يحتاج SMTP/تفعيل |
| `DOCUMENT_EXPIRY_WARNING` | امتثال — غير مُفعّل |
| `MAINTENANCE_UPDATE` | تحديثات وسيطة للصيانة |

### 4.3 إشعارات مطلوبة وغير موجودة في enum

| إشعار | المحفّز | المستلم |
|-------|---------|---------|
| تطبيق غرامة تأخير | يوم N بعد الاستحقاق | مستأجر |
| تأخر موافقة مالك | pending > X أيام | GM + مالك |
| سلسلة dunning للمستأجر | +7 أيام بعد OVERDUE | مستأجر |
| إقفال شهر مالي | إقفال | محاسب |

### 4.4 مستلمون

| الحدث | الحالة |
|-------|--------|
| إيجار متأخر | ✅ `RENT_OVERDUE` للمستأجر والمحاسب (Phase 1) |
| رفض مالك | ✅ fan-out للمستأجر والمحاسب |
| معاينة مجدولة | ✅ `INSPECTION_SCHEDULED` (2B) |

---

## 5. فجوات الأدوار والصلاحيات | ROLE & PERMISSION GAPS

| الدور | ضعف / ناقص |
|-------|------------|
| **GENERAL_MANAGER** | لا SLA للموافقات المعلقة؛ لا لوحة تنفيذية للتعثر |
| **ACCOUNTANT** | لا مطابقة بنك؛ لا غرامات تلقائية؛ لا تصدير ERP |
| **OWNER** | بوابة داخل `/admin` وليس `/owner`؛ لا PDF؛ لا تحليل محفظة؛ لا ضريبة |
| **TENANT** | **لا دفع إلكتروني**؛ لا طلب تعديل عقد؛ لا checklist خروج؛ لا رفع مستندات |
| **MAINTENANCE_OFFICER** | لا صرف قطع من المخزن؛ لا تسجيل وقت/تكلفة |
| **PROPERTY_GUARD** | لا سجل زوار |

### تقارير ناقصة حسب الدور

| الدور | تقارير مفقودة |
|-------|----------------|
| GM | NOI محفظة، أعمار الذمم، موافقات معلقة |
| Accountant | مطابقة بنك، AR aging، غرامات مستحقة، VAT |
| Owner | تقسيم شركاء، YoY، PDF |
| Tenant | كشف سنوي للضريبة |
| Maintenance mgr | SLA، تكلفة/عقار |

---

## 6. اكتمال المالية | FINANCIAL COMPLETENESS

| المجال | الحالة | فجوة |
|--------|--------|------|
| إثبات إيراد إيجار عند الدفع | ✅ | — |
| تأمين كإيراد عند التفعيل | ✅ | ⚠️ قد يتعارض مع محاسبة الالتزام |
| فئات مصروفات معيارية | ⚠️ | CRUD بدون chart of accounts إلزامي |
| كشف مالك | ✅ Phase 1/2 | توليد مجدول + حصص ملاك؛ ليس ledger حي بالكامل |
| تصدير CSV | ✅ Phase 2 | `GET /finance/export/csv` — ليس QuickBooks |
| مطابقة بنك | ❌ | — |
| PnL / cashflow | ✅ | `/admin/finance/reports` |
| ميزانية vs فعلي | ⚠️ | تقرير بدون تنبيه |
| ديون معدومة / شطب | ❌ | — |
| فواتير ضريبية VAT | ❌ | — |

---

## 7. امتثال وتنظيم | REGULATORY & COMPLIANCE GAPS

| المتطلب | الحالة |
|---------|--------|
| قوالب عقود + بنود إلزامية | ⚠️ قوالب بدون e-sign |
| حقوق مستأجر (إشعار، سقف تأمين) | ❌ |
| سجل عمليات | ✅ `/admin/audit-log` — سياسة احتفاظ ❌ |
| GDPR / حذف بيانات | ❌ |
| توقيع إلكتروني | ❌ |
| أرشيف PDF غير قابل للتعديل | ❌ |

---

## 8. تكاملات خارجية | INTEGRATION GAPS

| التكامل | الحالة |
|---------|--------|
| بوابة دفع | ❌ إثبات يدوي فقط |
| SMS / WhatsApp | ❌ |
| SMTP بريد | ⚠️ يحتاج إعداد |
| سجل حكومي (إيجار) | ❌ |
| تصدير محاسبة (QuickBooks/Xero) | ⚠️ CSV فقط (Phase 2) |
| تقويم زيارات | ❌ |
| BI | ❌ |
| موقع شواغر عام | ❌ |

---

## 9. مصفوفة الأولويات | PRIORITY MATRIX

مرتبة: **أثر عالي + جهد منخفض** أولاً.

| الفجوة | أثر (1-5) | جهد (1-5) | الأولوية |
|--------|:---------:|:---------:|:---------:|
| ~~إرسال `RENT_OVERDUE`~~ | — | — | **مُنجز Phase 1** |
| ~~إرسال `REQUEST_COMPLETED`~~ | — | — | **مُنجز Phase 1** |
| ربط `SALARY_ADVANCE_*` بسلف الراتب | 3 | 1 | **عالي** |
| تفعيل `BUDGET_THRESHOLD_EXCEEDED` عند المصروف | 4 | 2 | **عالي** |
| قاعدة غرامة تأخير (أيام + %) | 5 | 3 | **عالي** |
| ~~استفسار شاغر → عقد~~ | — | — | **مُنجز Phase 1** |
| ~~توليد كشف مالك~~ | — | — | **مُنجز Phase 1/2** |
| دفع إلكتروني للمستأجر | 5 | 4 | **متوسط** |
| SMS/WhatsApp لـ RENT_DUE والصيانة | 4 | 3 | **متوسط** |
| ~~فحص دخول/خروج~~ | — | — | **مُنجز Phase 2B** (مخطط جديد V162) |
| إزالة أو تطبيق `SUSPENDED` | 2 | 2 | **متوسط** |
| ~~تقسيم % ملاك~~ | — | — | **مُنجز Phase 2** |
| ~~تصعيد صيانة + SLA~~ | — | — | **مُنجز Phase 2** |
| CRM تأجير كامل | 5 | 5 | **منخفض** |
| e-sign | 4 | 5 | **منخفض** |
| إصلاح `home-portal` يتيم | 1 | 1 | **عالي** (تنظيف) |
| `NEW_LOGIN_ALERT` / `ACCOUNT_LOCKED` | 3 | 2 | **عالي** |

---

## 10. ما تم إنجازه — ملخص Phase 1 / 2 / 2B

| Phase | أهم الإنجازات |
|-------|----------------|
| **1** | إشعارات تشغيلية، غرامة تأخير، dunning، استفسار شاغر → عقد، كشوف مالك مجدولة، `OWNER_STATEMENT` |
| **2** | `ownership_percentage` + `owner_revenue_shares`، SLA صيانة (`sla_deadline`)، تقرير SLA، تصدير CSV (`RENT_INCOME` / `EXPENSES` / `PAYROLL` / `ALL`) |
| **2B** | نشر شاغر تلقائي (`AUTO_PUBLISHED`)، معاينات move-in/out، `clear-unit` يتطلب MOVE_OUT موقّع، إشعارات `VACANCY_PUBLISHED` / `INSPECTION_*` |

**Flyway:** V159 → V163 (لا تعديل أقدم).

---

## 11. إضافات مقترحة على مراحل | RECOMMENDED ADDITIONS (Phased)

### المرحلة 1 (1–2 شهر) — Quick wins

1. ~~ربط الإشعارات الميتة~~ — **مُنجز (Phase 1).**
2. قاعدة غرامة تأخير قابلة للتكوين لكل عقار.
3. سلسلة dunning: يوم -3 `RENT_DUE` → يوم +1 `RENT_OVERDUE` → يوم +7 grace.
4. ~~استفسار شاغر → عقد~~ — **مُنجز (Phase 1).**
5. ~~كشوف مالك + `OWNER_STATEMENT`~~ — **مُنجز (Phase 1/2).**
6. تنظيف: `SUSPENDED` أو تطبيقه؛ حذف/ربط `home-portal`.
7. SMTP + `NEW_LOGIN_ALERT`.

### المرحلة 2 (3–6 أشهر) — اكتمال جوهرى

1. بوابة دفع → `PAID` تلقائي + إيصال.
2. ~~فحص دخول/خروج بصور وتوقيع~~ — **مُنجز (Phase 2B).**
3. ~~نشر شاغر تلقائي عند انتهاء العقد~~ — **مُنجز (Phase 2B).**
4. ~~تقسيم إيراد بين ملاك حسب %~~ — **مُنجز (Phase 2).**
5. لوحة SLA للموافقات المعلقة.
6. ~~`MAINTENANCE_REQUEST_OVERDUE` + إعادة تعيين~~ — **مُنجز (Phase 2).**
7. ~~تصدير ERP/CSV~~ — **مُنجز (Phase 2):** `GET /finance/export/csv`.
8. بوابة `/owner` مستقلة.

### المرحلة 3 (6–12 شهر) — ميزة تنافسية

1. CRM تأجير كامل.
2. e-sign + أرشيف عقد PDF + hash في audit.
3. إدارة نزاعات مرتبطة بالشكاوى.
4. BI + تنبؤ شغور/إيجار.
5. تكامل سجل حكومي.
6. IoT صيانة استباقية.

---

## كود منفصل أو ناقص | Disconnected / Incomplete Code

| العنصر | الموقع | المشكلة |
|--------|--------|---------|
| `ContractStatus.SUSPENDED` | `ContractStatus.java` | يُقرأ ولا يُضبط |
| بعض `NotificationType` | `NotificationType.java` | جزء مُفعّل (Phase 1/2/2B) — الباقي في §4.2 |
| ~~`VacancyService`~~ | vacancy | **مُحدّث** — create + inquiries + convert |
| ~~`VacancyPublishingService`~~ | vacancy | **جديد Phase 2B** |
| ~~`OwnerStatementGenerationService`~~ | ownerportal | **مُفعّل** مجدول |
| `home-portal` | frontend | غير في routes |
| ~~`unit_inspections`~~ | inspection | **مُفعّل Phase 2B** (V162) |
| `lateFee` | `RentPayment` | تخزين + حساب جزئي Phase 1 — قواعد عقار قابلة للتكوين لا تزال ❌ |
| `FinanceExportService` | finance | **جديد Phase 2** — CSV فقط (ليس QuickBooks) |

---

## خلاصة لمدير العقارات

**يمكنك التشغيل اليومي:** تسجيل أصول وملاك بنسب، تأجير، تحصيل، صيانة بمواعيد SLA، شواغر (يدوي أو تلقائي عند انتهاء العقد)، معاينات استلام/تسليم مع توقيع، كشوف مالك، وتصدير CSV للمحاسبة.

**ما يزال يدوياً أو ناقصاً:** غرامة تأخير بقواعد مرنة لكل عقار، دفع إلكتروني، PDF كشوف، CRM كامل للمعاينات الميدانية، وتكامل محاسبة خارجي (QuickBooks).

**أعلى عائد تالي:** قواعد غرامة تأخير قابلة للتكوين + سلسلة dunning للمستأجر + SMTP للبريد.

---

## مراجع

- `docs/ar-business-guide.md` — الدليل التقني الكامل
- `docs/business-guide-ar.docx` — نسخة Word للدليل
- `property-backend/.../NotificationType.java`
- `property-backend/.../LeaseContractService.java`
- `property-backend/.../vacancy/service/VacancyPublishingService.java`
- `property-backend/.../inspection/service/UnitInspectionService.java`
- `property-backend/.../finance/service/FinanceExportService.java`

---

*إعادة توليد Word:* `cd docs/scripts && node build-audit-word.mjs` — الدليل الكامل: `node build-full-word.mjs`
