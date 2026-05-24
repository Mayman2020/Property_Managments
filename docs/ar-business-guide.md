# الدليل التقني الكامل لأعمال نظام إدارة العقارات

> مستخرج من الكود الفعلي (Backend Spring + Frontend Angular).  
> آخر مراجعة: 2026-05-20 (شامل Phase 1 + Phase 2 + Phase 2B)  
> API الأساسي: `/api/v1`

---

## فهرس المحتويات

1. [معمارية النظام](#1-معمارية-النظام)
2. [الأدوار والصلاحيات](#2-الأدوار-والصلاحيات)
3. [العقارات والوحدات والعلاقات](#3-العقارات-والوحدات-والعلاقات)
4. [عقد الإيجار — دورة الحياة الكاملة](#4-عقد-الإيجار--دورة-الحياة-الكاملة)
5. [جدول دفعات الإيجار والمدفوعات](#5-جدول-دفعات-الإيجار-والمدفوعات)
6. [عقد الصيانة (مقاول)](#6-عقد-الصيانة-مقاول)
7. [طلبات الصيانة](#7-طلبات-الصيانة)
8. [الشكاوى](#8-الشكاوى)
9. [الإشعارات — كل الأنواع](#9-الإشعارات--كل-الأنواع)
10. [المالية](#10-المالية)
11. [الموارد البشرية والرواتب](#11-الموارد-البشرية-والرواتب)
12. [المهام المجدولة Cron](#12-المهام-المجدولة-cron)
13. [بوابات المستخدمين](#13-بوابات-المستخدمين)
14. [كل الشاشات والـ API](#14-كل-الشاشات-وال-api)
15. [مسار التشغيل من الصفر](#15-مسار-التشغيل-من-الصفر)
16. [ثغرات وملاحظات تقنية](#16-ثغرات-وملاحظات-تقنية)
17. [ملخص إنجازات التطوير (Phase 1 / 2 / 2B)](#17-ملخص-إنجازات-التطوير-phase-1--2--2b)
18. [تقرير تدقيق اكتمال الأعمال](#18-تقرير-تدقيق-اكتمال-الأعمال-مرجع-منفصل)

---

## 1. معمارية النظام

| الطبقة | التقنية | المسار |
|--------|---------|--------|
| Frontend | Angular | `property-frontend` — منفذ 4500 |
| Backend | Spring Boot | `property-backend` — `/api/v1` منفذ 8080 |
| المصادقة | JWT + أدوار نشطة | رؤوس: `Authorization`, `X-Active-Role`, `X-Selected-Property-Id` |

**البوابات:**

| البوابة | Prefix | الأدوار الداخلة |
|---------|--------|-----------------|
| إدارة | `/admin` | SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, MAINTENANCE_*, PROPERTY_GUARD, PROCEDURES_CLERK, OWNER |
| مستأجر | `/tenant` | TENANT (+ GM/SUPER للاختبار) |
| صيانة | `/officer` | فنيون وشركات صيانة |
| موظف | `/employee` | موظف مرتبط بـ HR |

**طبقات الأمان في Backend:**

1. `SecurityConfig` — كل الطلبات تحتاج JWT ما عدا `/auth/**`
2. `@PreAuthorize` — على بوابات محددة (مالك، tenant، dev)
3. `@RequiresPermission(module, action)` — مصفوفة صلاحيات من DB + defaults في `RolePermissionService`
4. `PropertyScopeService` — تقييد البيانات حسب العقار المسند

---

## 2. الأدوار والصلاحيات

**الملف:** `UserRole.java`

| الدور | العربي | نطاق العقار | صلاحيات تشغيلية رئيسية |
|-------|--------|-------------|------------------------|
| `SUPER_ADMIN` | مدير النظام | كل العقارات | كل شيء؛ يتجاوز `@RequiresPermission`؛ تشغيل `/dev/schedulers` |
| `GENERAL_MANAGER` | مدير عام | غير مقيد | موافقات، تقارير، عقود، مالية — بدون حذفات مدمرة غالباً |
| `ACCOUNTANT` | محاسب | `user_property_access` | مالية، تأكيد دفعات، فواتير صيانة، متأخرات |
| `PROCEDURES_CLERK` | مخلص إجراءات | حسب المسند | HR عرض، رواتب |
| `PROPERTY_GUARD` | حارس عقار | مسند | dashboard عرض، maintenance عرض |
| `MAINTENANCE_OFFICER_INTERNAL` | فني داخلي | مسند | schedule, maintenance, my_requests |
| `MAINTENANCE_OFFICER_COMPANY` | فني شركة | مسند + `contractorCompanyId` | نفس الفني + company-queue |
| `MAINTENANCE_COMPANY` | شركة صيانة | مسند | طابور، فواتير، موظفو الشركة |
| `OWNER` | مالك | عقاراته فقط | owner-portal؛ `denyOwnerMutation` يمنع تعديل شاشات الموظفين |
| `TENANT` | مستأجر | عقده/وحدته | tenant-portal فقط |

**صلاحيات الواجهة (Frontend):** `PermissionService.can(module, action)` — actions: `view`, `create`, `edit`, `delete`, `menu`, `assign`, `approve`, `reject`, `schedule`, `start`, `submit`, `rate`...

**وحدات قابلة للتعطيل:** `module-settings` — finance, contracts, hr, notifications, audit, owner_portal, vacancies...

---

## 3. العقارات والوحدات والعلاقات

### 3.1 العقار Property

- إنشاء/تعديل: `PropertyService` — `/properties`
- مالك أساسي: `property.owner_id`
- ملاك إضافيون: جدول `property_owners` مع **`ownership_percentage`** (مجموع 100% لكل عقار) — **Phase 2**
- عند تأكيد دفعة إيجار: **`owner_revenue_shares`** — توزيع المبلغ حسب النسبة (`OwnerRevenueShareService`) — **Phase 2**
- كشوف المالك: إيراد من الحصص + مصروفات مُقسّمة بنسبة الملكية (`OwnerStatementGenerationService`) — **Phase 1/2**
- APIs إدارية: `GET /owner-portal/admin/owners/{id}/revenue-shares`, `GET /properties/{id}/revenue-split`
- نموذج العقار: `ownerShares` في `PropertyRequest` + عمود % في نموذج العقار (واجهة)
- إشعار عند الربط: `PROPERTY_LINKED_TO_OWNER`

### 3.2 الوحدة Unit

**ليست enum** — أعلام: `is_rented`, `is_reserved`, `has_damage`, `cleared_at`

| الحالة المحسوبة | القاعدة في الكود |
|-----------------|------------------|
| **مؤجرة** `rented` | يوجد عقد إيجار في: `ACTIVE`, `SUSPENDED`, `PENDING_TERMINATION_APPROVAL`, `PENDING_RENEWAL_APPROVAL` |
| **محجوزة** `reserved` | عقد `DRAFT` أو `PENDING_OWNER_APPROVAL` بدون عقد "حي" |
| **شاغرة** | لا rented ولا reserved |

**مزامنة تلقائية:** `LeaseContractService.syncUnitRentedFromContracts()` بعد كل تغيير عقد أو انتهاء مجدول.

**بعد الإنهاء:** `clearUnit()` → `UNIT_CLEARED` + الوحدة متاحة — **يتطلب معاينة تسليم (`MOVE_OUT`) موقّعة** قبل التفريغ (Phase 2B).

**نشر شاغر من قائمة الوحدات:** زر «نشر شاغر» للوحدات غير المؤجرة/المحجوزة → `POST /vacancies` (مصدر `MANUAL`).

### 3.5 الشواغر والإعلانات (Vacancies) — Phase 1 + 2B

**الجداول:** `vacancy_listings` (وحدة واحدة لكل `unit_id` — UNIQUE), `rental_inquiries`, `vacancy_photos`

| الحقل / المفهوم | الوصف |
|-----------------|--------|
| `is_published` | يعادل «إعلان نشط» في المواصفات |
| `listing_source` | `MANUAL` أو `AUTO_PUBLISHED` (V163) |
| `asking_rent` | من عقد منتهٍ أو من إيجار الوحدة عند النشر اليدوي |

**نشر تلقائي (Phase 2B):** `VacancyPublishingService.autoPublishFromContract`

| المحفّز | متى |
|---------|-----|
| `ContractScheduler` | `ACTIVE` → `EXPIRED` عند `endDate < today` |
| `LeaseContractService.finalizeTerminationApproval` | موافقة مالك على الإنهاء → `TERMINATED` |

- يتخطى النشر إذا وُجد إعلان **`is_published=true`** لنفس الوحدة.
- يُحدّث الصف الموجود لنفس `unit_id` أو يُنشئ صفاً جديداً.
- إشعار: `VACANCY_PUBLISHED` → SUPER_ADMIN, GENERAL_MANAGER, محاسبو العقار.

**API (Backend `/api/v1`):**

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/vacancies` | قائمة الإعلانات (بحث، ترقيم) |
| POST | `/vacancies` | نشر يدوي (`CreateVacancyRequest`) |
| GET | `/vacancies/by-unit/{unitId}` | إعلان الوحدة إن وُجد |
| GET | `/vacancies/{id}/inquiries` | استفسارات الإعلان |
| POST | `/vacancies/{listingId}/inquiries` | استفسار جديد → `RENTAL_INQUIRY_RECEIVED` |
| PATCH | `/vacancies/inquiries/{id}/status` | NEW / CONTACTED / CONVERTED |
| POST | `/vacancies/inquiries/{id}/convert` | مسودة مستأجر + عقد DRAFT (Phase 1) |
| POST | `/dev/schedulers/vacancy-auto-publish` | backfill لعقود TERMINATED/EXPIRED بدون إعلان (SUPER_ADMIN) |

**واجهة Admin:** `/admin/vacancies/list` — شارة مصدر (Auto أخضر / Manual رمادي).  
**صلاحيات:** SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT؛ إنشاء يدوي يتطلب صلاحية `vacancies`.

### 3.3 المستأجر Tenant

- ملف: `tenant` مرتبط `user_id`, `unit_id`, `property_id`
- عند مسودة عقد: `TENANT_DRAFT_LEASE_PENDING_OWNER`
- عند التفعيل: ربط بوابة + `CONTRACT_ACTIVATED`

### 3.4 المالك Owner

- `user_id` + `portal_access`
- يستقبل: مسودات، إنهاء، تجديد، كشوف
- مسارات: `/owner-portal/*`

---

## 4. عقد الإيجار — دورة الحياة الكاملة

**الملفات:** `ContractStatus.java`, `LeaseContractService.java`, `OwnerApprovalService.java`, `ContractRenewalService.java`, `OwnerPortalDraftContractService.java`

### 4.1 كل حالات العقد

| الحالة | المعنى | الوحدة |
|--------|--------|--------|
| `DRAFT` | مسودة قابلة للتعديل والإلغاء | محجوزة |
| `PENDING_OWNER_APPROVAL` | أُرسل للمالك للمراجعة | محجوزة |
| `ACTIVE` | عقد ساري — جدول دفعات | مؤجرة |
| `PENDING_TERMINATION_APPROVAL` | طلب إنهاء بانتظار المالك — العقد فعلياً ما زال حياً | مؤجرة |
| `PENDING_RENEWAL_APPROVAL` | طلب تجديد بانتظار المالك | مؤجرة |
| `TERMINATED` | مُنهى بعد موافقة | تُعاد حسب sync |
| `EXPIRED` | انتهى `endDate` (مجدول) | تُعاد حسب sync |
| `RENEWED` | استُبدل بعقد جديد | — |
| `CANCELLED` | مسودة/معلّق أُلغي | تُحرر |
| `SUSPENDED` | **معرّف في enum** — يُعتبر عقد حياً للوحدة؛ **لا يوجد مسار Java يضبطه حالياً** | مؤجرة |

### 4.2 مخطط الانتقالات

```
[*] ──create()──► DRAFT
DRAFT ──submitForOwnerApproval()──► PENDING_OWNER_APPROVAL
DRAFT ──activate() [موظف]──► ACTIVE
PENDING_OWNER_APPROVAL ──activate() / موافقة مالك──► ACTIVE
PENDING_OWNER_APPROVAL ──رفض مالك──► DRAFT
DRAFT / PENDING_OWNER_APPROVAL ──cancelDraft()──► CANCELLED

ACTIVE ──terminate()──► PENDING_TERMINATION_APPROVAL
PENDING_TERMINATION_APPROVAL ──موافقة مالك──► TERMINATED (+ waiveRemainingSchedule)
PENDING_TERMINATION_APPROVAL ──رفض/إلغاء──► ACTIVE

ACTIVE ──requestRenewal()──► PENDING_RENEWAL_APPROVAL
PENDING_RENEWAL_APPROVAL ──موافقة──► عقد جديد ACTIVE + الأصل RENEWED
PENDING_RENEWAL_APPROVAL ──رفض/إلغاء──► ACTIVE

ACTIVE ──[ContractScheduler: endDate < today]──► EXPIRED
```

### 4.3 العمليات — API — من يفعلها — الإشعار

| العملية | Method / Path | الحالة قبل → بعد | من | إشعار |
|---------|---------------|------------------|-----|-------|
| إنشاء عقد | `POST /contracts` | → `DRAFT` | إدارة | `CONTRACT_AWAITING_OWNER_REVIEW`, `TENANT_DRAFT_LEASE_PENDING_OWNER` |
| تعديل مسودة | `PUT /contracts/{id}` | `DRAFT` فقط | إدارة | — |
| إرسال للمالك | `PATCH /contracts/{id}/submit-for-owner-approval` | `DRAFT` → `PENDING_OWNER_APPROVAL` | إدارة | إعادة إشعار مالك |
| تفعيل | `PATCH /contracts/{id}/activate` | `DRAFT`/`PENDING` → `ACTIVE` | موظف/مالك | `CONTRACT_ACTIVATED` + جدول دفعات + إيراد تأمين |
| موافقة مالك (تفعيل) | `PATCH /owner-portal/contracts/{id}/decision` APPROVED | → `ACTIVE` | مالك | `CONTRACT_ACTIVATED` |
| رفض موافقة تفعيل | decision REJECTED | → `DRAFT` | مالك | `TENANT_LEASE_OWNER_APPROVAL_DENIED`, `ACCOUNTANT_LEASE_*` |
| إلغاء مسودة | `PATCH /contracts/{id}/cancel` | → `CANCELLED` | إدارة/مالك | `GENERAL` |
| رفض مسودة (بوابة مالك) | `PATCH /owner-portal/draft-contracts/{id}/reject` | → `CANCELLED` | مالك | `TENANT_LEASE_REJECTED_BY_OWNER` |
| تعديل مسودة (مالك) | `PATCH .../amend` | يبقى `DRAFT` | مالك | `TENANT_LEASE_AMENDED_BY_OWNER` |
| طلب إنهاء | `PATCH /contracts/{id}/terminate` | `ACTIVE` → `PENDING_TERMINATION_APPROVAL` | إدارة | `CONTRACT_TERMINATION_REQUESTED`, `TENANT_CONTRACT_TERMINATION_REQUESTED` |
| إلغاء طلب إنهاء | `PATCH .../cancel-termination-request` | → `ACTIVE` | إدارة | — |
| موافقة إنهاء | `PATCH /owner-portal/.../termination-decision` APPROVED | → `TERMINATED` | مالك | `CONTRACT_TERMINATION_APPROVED` + محاسب/مستأجر |
| رفض إنهاء | termination-decision REJECTED | → `ACTIVE` | مالك | `CONTRACT_TERMINATION_REJECTED` |
| طلب تجديد | `POST /contracts/{id}/request-renewal` | → `PENDING_RENEWAL_APPROVAL` | إدارة | `CONTRACT_RENEWAL_REQUESTED`, `TENANT_CONTRACT_RENEWAL_REQUESTED` |
| إلغاء طلب تجديد | `PATCH .../cancel-renewal-request` | → `ACTIVE` | إدارة | — |
| موافقة تجديد | `PATCH .../renewal-decision` APPROVED | عقد جديد + `RENEWED` | مالك | `CONTRACT_RENEWAL_APPROVED`, `ACCOUNTANT_CONTRACT_RENEWAL_APPROVED` |
| رفض تجديد | renewal-decision REJECTED | → `ACTIVE` | مالك | `CONTRACT_RENEWAL_REJECTED` |
| انتهاء تلقائي | مجدول | `ACTIVE` → `EXPIRED` | نظام | `CONTRACT_EXPIRING` + **نشر شاغر تلقائي (2B)** |
| تنبيه قبل 3 أيام | مجدول | — | نظام | `CONTRACT_EXPIRING_SOON` |
| تجديد إداري مباشر | `ContractRenewalService.renew()` | مسودة جديدة؛ الأصل ACTIVE حتى التفعيل | إدارة | — |
| إنهاء بموافقة مالك | `finalizeTerminationApproval` | → `TERMINATED` | مالك | إشعارات إنهاء + **نشر شاغر (2B)** |

### 4.4 ما بعد الإنهاء / الانتهاء (Handover)

| العملية | API | إشعار | ملاحظة |
|---------|-----|-------|--------|
| عدم الرغبة في التجديد | `POST /contracts/{id}/no-renewal-intent` | `NO_RENEWAL_INTENT_SUBMITTED` | |
| إرجاع التأمين | `POST /contracts/{id}/return-deposit` | `DEPOSIT_RETURNED` | |
| الإبلاغ عن أضرار | `POST /contracts/{id}/report-damages` | `UNIT_DAMAGE_REPORTED` | يدوي على العقد |
| مستأجر يرفع إيصال أضرار | `POST .../submit-damage-receipt` | `DAMAGE_RECEIPT_SUBMITTED` | |
| تأكيد دفع الأضرار | `POST .../confirm-damage-payment` | `DAMAGE_PAYMENT_CONFIRMED` | |
| **معاينة تسليم** | `POST /contracts/{id}/inspections` type=MOVE_OUT | `INSPECTION_SCHEDULED` | Phase 2B — انظر §7.1.2 |
| **ربط أضرار المعاينة بالتأمين** | `PATCH /inspections/{id}/link-damages` | — | يضبط `terminationDamagesAmount` |
| تفريغ الوحدة | `POST /contracts/{id}/clear-unit` | `UNIT_CLEARED` | **يفشل 400** بدون MOVE_OUT موقّع |

### 4.5 أزرار شاشة تفاصيل العقد (Frontend)

**المسار:** `/admin/contracts/:id`

| الزر | يظهر عندما | API |
|------|------------|-----|
| تعديل مسودة | `DRAFT` / `PENDING_OWNER_APPROVAL` | `PUT /contracts/{id}` أو amend مالك |
| رفض/إلغاء مسودة | نفس الحالات | `PATCH cancel` أو reject مالك |
| إرسال للمالك | `DRAFT` + مالك معرّف | `PATCH submit-for-owner-approval` |
| تفعيل | `DRAFT` / `PENDING_OWNER_APPROVAL` | `PATCH activate` |
| تجديد | `ACTIVE` | `POST request-renewal` |
| إنهاء | `ACTIVE` / `SUSPENDED` | `PATCH terminate` |
| إلغاء طلب إنهاء | `PENDING_TERMINATION_APPROVAL` | `PATCH cancel-termination-request` |
| إلغاء طلب تجديد | `PENDING_RENEWAL_APPROVAL` | `PATCH cancel-renewal-request` |
| موافقة/رفض إنهاء (بانر) | `PENDING_TERMINATION_APPROVAL` | `PATCH owner-portal/termination-decision` |
| تسجيل دفعة / تأكيد إيصال | جدول الدفعات | `POST` payment / `PATCH proof/review` / `mark-paid` |
| ملحقات / رسوم | تبويبات | annexes / contract-fees CRUD |

---

## 5. جدول دفعات الإيجار والمدفوعات

**الملفات:** `PaymentScheduleStatus.java`, `RentPaymentService.java`, `ContractScheduler.checkOverduePayments()`

### 5.1 حالات قسط الجدول

| الحالة | كيف تُنشأ |
|--------|-----------|
| `PENDING` | عند `activate()` — `generatePaymentSchedule()` |
| `WAIVED` | أشهر مجانية (`freeMonths`) |
| `OVERDUE` | مجدول: `PENDING` + `dueDate < today` + عقد `ACTIVE` |
| `PENDING_CONFIRMATION` | مستأجر `uploadProof()` |
| `PAYMENT_REJECTED` | محاسب `reviewProof()` REJECTED |
| `PAID` | قبول إثبات / `markPaidByAccountant()` / `recordPayment()` كامل |
| `PARTIAL` | `recordPayment()` بمبلغ أقل من المستحق |

### 5.2 مسارات الدفع

| العملية | API | النتيجة |
|---------|-----|---------|
| رفع إثبات (مستأجر) | `POST /tenant-portal/contracts/{id}/payment-schedule/{sid}/proof` | `PENDING_CONFIRMATION` |
| مراجعة إثبات | `PATCH /payment-schedule/{id}/proof/review` | APPROVED→`PAID` / REJECTED→`PAYMENT_REJECTED` |
| تسجيل دفعة (إدارة) | `POST` على schedule | `PAID` أو `PARTIAL` + `RentPayment` + `PAYMENT_RECEIVED` |
| تأكيد محاسب | `PATCH .../mark-paid` | `PAID` + إيراد في `OtherRevenue` |
| قائمة متأخرات | `GET /payments/overdue` | شاشة `/admin/finance/overdue-payments` |

### 5.3 إشعارات الإيجار المرتبطة بالدفع

| الحدث | النوع | ملاحظة |
|-------|-------|--------|
| استحقاق بعد 3 أيام | `RENT_DUE` | `ContractScheduler` + `notifyUpcomingRentDue` |
| سجل متأخر في DB | `OVERDUE` على الصف | يرسل `RENT_OVERDUE` (مستأجر + محاسب) عبر `ContractScheduler` |
| غرامة تأخير | `late_fee_applied` | بعد فترة السماح — `LateFeeProperties` + `applyLateFeeAccrual` |
| تصعيد +7 أيام | `RENT_GRACE_PERIOD_ENDING` | `checkRentDunningEscalation` — محاسب + GM |
| فترة سماح تنتهي | `RENT_GRACE_PERIOD_ENDING` | `OperationalScheduler` 09:30 — للمحاسبين |
| دفعة مقبولة/مرفوضة | `PAYMENT_RECEIVED` | عناوين مختلفة حسب السياق |

---

## 6. عقد الصيانة (مقاول)

**الملف:** `MaintenanceContractService.java` — حالة `String` (ليست enum Java)

| الحالة | المعنى |
|--------|--------|
| `DRAFT` | مسودة |
| `PENDING_OWNER_APPROVAL` | بانتظار المالك |
| `ACTIVE` | ساري |
| `CANCELLED` | ملغى |
| `PENDING_TERMINATION_APPROVAL` | طلب إنهاء |
| `ENDED` | منتهٍ بعد موافقة |
| `PENDING_RENEWAL_APPROVAL` | طلب تجديد |
| `RENEWED` | مُجدّد بعقد جديد |

**عمليات:** create → approve/activate → requestTermination → decideTermination → requestRenewal → decideRenewal → فواتير (`MaintenanceContractInvoiceService`)

**إشعارات:** `MAINTENANCE_CONTRACT_*` (موافقة، رفض، إنهاء، تجديد، فاتورة، استحقاق، دفع)

**مجدول:** تنبيهات أقساط فواتير الصيانة قبل 3 أيام ويوم الاستحقاق.

---

## 7. طلبات الصيانة

**الملف:** `RequestStatus.java`, `MaintenanceRequestService.java`

### 7.1 الحالات

`PENDING` → `ASSIGNED` → `SCHEDULED` → `IN_PROGRESS` → (`COMPLETED` | `TENANT_ABSENT` | `NEEDS_REVISIT` | `CANCELLED`)

### 7.1.1 SLA (Phase 2)

| الأولوية | موعد الاستجابة من الإنشاء |
|----------|---------------------------|
| URGENT | +4 ساعات |
| HIGH | +24 ساعة |
| NORMAL | +48 ساعة |
| LOW | +72 ساعة |

- أعمدة: `sla_deadline`, `sla_breached`
- مجدول `OperationalScheduler.checkMaintenanceRequestOverdue`: إشعار `MAINTENANCE_REQUEST_OVERDUE`؛ URGENT متأخر >1h → GM؛ URGENT غير مُعيّن >1h → إعادة تعيين
- تقرير: `GET /maintenance/requests/sla-report`
- QA: `POST /dev/schedulers/maintenance-sla`

### 7.1.2 معاينات الاستلام/التسليم (Phase 2B)

**Migration:** `V162__unit_inspections.sql` (الجداول أُزيلت سابقاً في V98 — أُعيد إنشاؤها بمخطط جديد)

**الجداول:**

| الجدول | الحقول الرئيسية |
|--------|-----------------|
| `unit_inspections` | `unit_id`, `contract_id`, `inspection_type`, `status`, `inspector_id`, `tenant_signed_at`, `inspector_signed_at`, `total_deduction` |
| `unit_inspection_items` | `area`, `condition` (GOOD/FAIR/DAMAGED/MISSING), `notes`, `photo_url`, `estimated_deduction` |

**سير العمل:**

```
إنشاء (PENDING) → تعبئة بنود + صور → complete (COMPLETED)
  → توقيع مفتش + توقيع مستأجر → SIGNED
  → [MOVE_OUT فقط] link-damages → ثم clear-unit مسموح
```

**عند الإنشاء:** قالب افتراضي (Living Room, Kitchen, Bathroom, Bedroom, Hallway) + `INSPECTION_SCHEDULED` للمستأجر.

**API إدارة (`/api/v1`):**

| Method | Path | الوصف |
|--------|------|--------|
| GET/POST | `/contracts/{contractId}/inspections` | قائمة / إنشاء (`type`: MOVE_IN \| MOVE_OUT) |
| GET | `/inspections/{id}` | تفاصيل + البنود |
| POST | `/inspections/{id}/items` | إضافة بند |
| PATCH | `/inspections/{id}/items/{itemId}` | حالة، ملاحظات، `photoUrl` (بعد `/files/upload`) |
| PATCH | `/inspections/{id}/complete` | كل البنود لها `condition` |
| PATCH | `/inspections/{id}/sign` | `{ role: INSPECTOR \| TENANT }` |
| PATCH | `/inspections/{id}/link-damages` | مجموع خصم DAMAGED/MISSING → عقد + `remainingDeposit` |

**بوابة مستأجر:**

| Method | Path |
|--------|------|
| GET | `/tenant-portal/contracts/{id}/inspections` |
| PATCH | `/tenant-portal/inspections/{id}/sign` (TENANT فقط) |

**واجهة Admin:**

| المسار | الوظيفة |
|--------|---------|
| `/admin/contracts/:id` — تبويب Inspections | قائمة + إنشاء move-in/out |
| `/admin/inspections/:id` | نموذج المعاينة: بنود، صور، توقيع، ملخص أضرار |

**إشعارات:** `INSPECTION_SCHEDULED`, `INSPECTION_COMPLETED` (بعد توقيع الطرفين).

### 7.2 انتقالات مسموحة

```
PENDING → ASSIGNED → SCHEDULED → IN_PROGRESS
NEEDS_REVISIT → SCHEDULED
SCHEDULED + رفض موعد مستأجر → ASSIGNED
IN_PROGRESS + تقرير زيارة → COMPLETED | TENANT_ABSENT | NEEDS_REVISIT | IN_PROGRESS | CANCELLED
أي (غير نهائي) → CANCELLED
```

### 7.3 API رئيسية

| العملية | API | إشعار |
|---------|-----|-------|
| إنشاء | `POST /maintenance/requests` | `REQUEST_CREATED` |
| تعيين فني | `PATCH .../assign` | `REQUEST_ASSIGNED` |
| جدولة زيارة | `PATCH .../schedule` | `REQUEST_SCHEDULED` |
| قبول/رفض موعد | `accept-schedule` / `reject-schedule` | `REQUEST_SCHEDULE_ACCEPTED` / `REJECTED` |
| بدء العمل | `PATCH .../start` | — |
| تقرير زيارة | `POST visit-report` | `REQUEST_VISIT_REPORTED` → قد `COMPLETED` |
| إلغاء | `PATCH cancel` | `REQUEST_CANCELLED` |
| تقييم | rating | `REQUEST_RATED` |
| ربط مزود بعقار | assignment | `MAINTENANCE_PROVIDER_ASSIGNED` / `UNASSIGNED` |

**ملاحظة:** `REQUEST_COMPLETED` معرّف في enum لكن **لا يُرسل من Java** حالياً — يُستخدم `REQUEST_VISIT_REPORTED` أو أنواع أخرى.

---

## 8. الشكاوى

**الملف:** `TenantComplaintService.java` — حالة نصية

| الحالة | الانتقال |
|--------|----------|
| `OPEN` | `create()` — `COMPLAINT_SUBMITTED` |
| `IN_REVIEW` | `assign(officerId)` |
| `RESOLVED` | `resolve()` — `COMPLAINT_REPLY_RECEIVED` |
| `CLOSED` | `closeComplaint()` — `COMPLAINT_CLOSED` |
| تقييم | — | `COMPLAINT_RATED` |

**ربط صيانة:** `createMaintenanceRequest()` من شكوى → طلب `URGENT`.

---

## 9. الإشعارات — كل الأنواع

**الملف:** `NotificationType.java` (130+ قيمة)

### 9.1 عقود الإيجار

| النوع | متى يُرسل | المستلم |
|-------|-----------|---------|
| `CONTRACT_AWAITING_OWNER_REVIEW` | إنشاء/تحديث مسودة | مالك(ين) |
| `TENANT_DRAFT_LEASE_PENDING_OWNER` | مسودة جديدة | مستأجر |
| `TENANT_LEASE_REJECTED_BY_OWNER` | رفض مسودة مالك | مستأجر |
| `TENANT_LEASE_AMENDED_BY_OWNER` | تعديل مسودة مالك | مستأجر |
| `TENANT_LEASE_OWNER_APPROVAL_DENIED` | رفض تفعيل | مستأجر |
| `ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED` | رفض تفعيل | محاسبون |
| `CONTRACT_ACTIVATED` | تفعيل | مستأجر، محاسب |
| `CONTRACT_EXPIRING` | انتهاء (EXPIRED) | أطراف العقد |
| `CONTRACT_EXPIRING_SOON` | قبل 3 أيام من endDate | مستأجر، مالك، محاسب |
| `CONTRACT_TERMINATION_REQUESTED` | طلب إنهاء | مالك |
| `TENANT_CONTRACT_TERMINATION_REQUESTED` | طلب إنهاء | مستأجر |
| `CONTRACT_TERMINATION_APPROVED` | موافقة إنهاء | محاسب، مستأجر |
| `CONTRACT_TERMINATION_REJECTED` | رفض إنهاء | محاسب، مستأجر |
| `CONTRACT_RENEWAL_REQUESTED` | طلب تجديد | مالك |
| `TENANT_CONTRACT_RENEWAL_REQUESTED` | طلب تجديد | مستأجر |
| `CONTRACT_RENEWAL_APPROVED` / `REJECTED` | قرار تجديد | مالك |
| `ACCOUNTANT_CONTRACT_RENEWAL_APPROVED` / `REJECTED` | قرار تجديد | محاسب |
| `NO_RENEWAL_INTENT_SUBMITTED` | عدم رغبة تجديد | مالك، محاسب |
| `DEPOSIT_RETURNED` | إرجاع تأمين | مستأجر |
| `UNIT_DAMAGE_REPORTED` | أضرار | مستأجر، مالك |
| `DAMAGE_RECEIPT_SUBMITTED` | إيصال أضرار | محاسب، مالك |
| `DAMAGE_PAYMENT_CONFIRMED` | تأكيد أضرار | مالك |
| `UNIT_CLEARED` | تفريغ وحدة | مالك |

### 9.2 دفعات إيجار

| النوع | متى | ملاحظة |
|-------|-----|--------|
| `RENT_DUE` | dueDate = اليوم+3 | مجدول |
| `RENT_GRACE_PERIOD_ENDING` | متأخر ≥3 أيام | محاسبون |
| `RENT_OVERDUE` | أول يوم OVERDUE + عند غرامة التأخير | `RentPaymentService.notifyRentOverdue` |
| `REQUEST_COMPLETED` | إغلاق طلب صيانة | `MaintenanceRequestService` |
| `OWNER_STATEMENT` | كشف شهري | `OwnerStatementGenerationService` (أول كل شهر) |
| `RENTAL_INQUIRY_RECEIVED` | استفسار شاغر | `VacancyService.createInquiry` |
| `VACANCY_PUBLISHED` | نشر إعلان شاغر (يدوي/تلقائي) | `VacancyPublishingService` / `VacancyService.createListing` |
| `INSPECTION_SCHEDULED` | إنشاء معاينة move-in/out | `UnitInspectionService.create` |
| `INSPECTION_COMPLETED` | توقيع مفتش + مستأجر | `UnitInspectionService.sign` |
| `DOCUMENT_EXPIRY_WARNING` | مرفقات تنتهي خلال 30 يوم | `OperationalScheduler` 08:00 |
| `MAINTENANCE_REQUEST_OVERDUE` | تجاوز SLA حسب الأولوية | `OperationalScheduler` 09:00 |
| `BUDGET_THRESHOLD_EXCEEDED` | تجاوز ميزانية فئة | `FinanceService.createExpense` |
| `NEW_LOGIN_ALERT` / `ACCOUNT_LOCKED` | تسجيل دخول / قفل | `AuthService` |
| `PAYMENT_RECEIVED` | قبول/رفض/تسجيل دفعة | مستأجر |

### 9.3 صيانة — عقود وفواتير

`MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW`, `APPROVED`, `REJECTED`, `TERMINATION_*`, `RENEWAL_*`, `INVOICE_ISSUED`, `PAYMENT_SCHEDULED`, `PAYMENT_DUE_SOON`, `PAYMENT_DUE_TODAY`, `PAYMENT_RECEIVED`

### 9.4 صيانة — طلبات

`REQUEST_CREATED`, `ASSIGNED`, `SCHEDULED`, `SCHEDULE_ACCEPTED`, `SCHEDULE_REJECTED`, `VISIT_REPORTED`, `RATED`, `CANCELLED`, `MAINTENANCE_PROVIDER_ASSIGNED`, `UNASSIGNED`

### 9.5 شكاوى

`COMPLAINT_SUBMITTED`, `REPLY_RECEIVED`, `CLOSED`, `RATED`

### 9.6 HR ورواتب

| مُرسل | غير مُرسل حالياً |
|-------|------------------|
| `PAYROLL_SUBMITTED`, `APPROVED`, `REJECTED`, `MARKED_PAID`, `PAYSLIP_AVAILABLE` | `PAYROLL_GENERATED` |
| `LEAVE_REQUEST_SUBMITTED`, `APPROVED`, `REJECTED`, `LEAVE_BALANCE_LOW` | `SALARY_ADVANCE_*` (4 أنواع) |

### 9.7 تشغيل وعقار

`INVENTORY_LOW_STOCK`, `PROPERTY_LINKED_TO_OWNER`, `UNIT_ADDED_TO_OWNER_PROPERTY`, `TENANT_REGISTERED_ON_OWNER_PROPERTY`, `GENERAL`

### 9.8 معرّفة في النظام — غير مُطبّقة أو جزئياً

`FINANCE_ALERT`, `MAINTENANCE_UPDATE`, `PAYROLL_GENERATED`, `SALARY_ADVANCE_*` — باقي الأنواع مُفعّلة في Phase 1/2 (مثل `REQUEST_COMPLETED`, `MAINTENANCE_REQUEST_OVERDUE`, `OWNER_STATEMENT`, `BUDGET_THRESHOLD_EXCEEDED`, `DOCUMENT_EXPIRY_WARNING`, `NEW_LOGIN_ALERT`, `ACCOUNT_LOCKED`).

**API إشعارات:** `GET /notifications/my`, `PATCH /notifications/{id}/read`, `PATCH /notifications/my/read-all`

---

## 10. المالية

**Controller:** `FinanceController` — صلاحية `finance`

| الوحدة | API | الوصف |
|--------|-----|--------|
| لوحة | `GET /finance/dashboard` | إيراد، مصروف، صافي، متأخرات |
| مصروفات | `/finance/expenses` CRUD | صيانة، تشغيل... |
| إيرادات | `/finance/revenues` CRUD | غير الإيجار |
| ميزانية | `/finance/budgets` | عرض — تجاوز `BUDGET_THRESHOLD_EXCEEDED` غير مفعّل |
| تقارير | PnL, cashflow, owner-statements | `/finance/reports/*` |
| **تصدير CSV (Phase 2)** | `GET /finance/export/csv?from=&to=&type=` | `RENT_INCOME`, `EXPENSES`, `PAYROLL`, `ALL` — `FinanceExportService` |
| واجهة التقارير | `/admin/finance/reports/*` | بطاقة تنزيل CSV (من/إلى، نوع) |
| اختبار تصدير | `POST /dev/schedulers/finance-export-test` | عدد الصفوف فقط (SUPER_ADMIN) |
| إيراد إيجار تلقائي | عند قبول دفعة | `RentPaymentService.createRentRevenueIfMissing` |
| تأمين عند التفعيل | `recordDepositAsIncome` | `OtherRevenue` REV-DEPOSIT |

**بوابة المحاسب** `/accountant-portal`:

| الشاشة | API |
|--------|-----|
| تأكيد إيصالات | receipts + review |
| طلبات تجديد | renewal-requests + process |
| فواتير صيانة | maintenance-invoices |

---

## 11. الموارد البشرية والرواتب

| الوحدة | مسار | سير العمل |
|--------|------|-----------|
| موظفون | `/hr/employees` | CRUD + ربط `linkedUserId` |
| إجازات | `/hr/leaves` | طلب → موافقة/رفض |
| رواتب | `/hr/payroll` | `DRAFT`→`SUBMITTED`→`APPROVED`→`PAID` |
| حضور | `/hr/attendance` | موجود |
| بوابة موظف | `/employee/my-payslips` | `GET /hr/payroll/my-payslips` |

---

## 12. المهام المجدولة Cron

### ContractScheduler — يومياً 09:00

| Job | الوظيفة |
|-----|---------|
| `checkOverduePayments` | `PENDING` → `OVERDUE` |
| `checkExpiringContracts` | `ACTIVE` → `EXPIRED` + إشعار + **نشر شاغر** |
| `checkUpcomingRentDueReminders` | `RENT_DUE` (اليوم+3) |
| `checkContractsExpiringIn3Days` | `CONTRACT_EXPIRING_SOON` |
| `checkUpcomingMaintenanceInvoiceInstallments` | صيانة +3 أيام |
| `checkMaintenanceInvoiceInstallmentsDueToday` | استحقاق اليوم |

### OperationalScheduler

| Cron | Job |
|------|-----|
| `0 0 8 * * *` | `INVENTORY_LOW_STOCK` |
| `0 30 8 * * *` | `LEAVE_BALANCE_LOW` |
| `0 0 9 * * *` | `checkMaintenanceRequestOverdue` — SLA طلبات الصيانة |
| `0 30 9 * * *` | `RENT_GRACE_PERIOD_ENDING` |

**اختبار يدوي (SUPER_ADMIN فقط):** `POST /dev/schedulers/run-all`، `POST /dev/schedulers/maintenance-sla`، `POST /dev/schedulers/finance-export-test`، `POST /dev/schedulers/vacancy-auto-publish`.

---

## 13. بوابات المستخدمين

### 13.1 المستأجر `/tenant-portal`

| Endpoint | الوظيفة |
|----------|---------|
| `my-contract`, `my-contracts` | عقود |
| `payment-schedule` | جدول دفعات |
| `proof` | رفع إثبات |
| `receipts` | إيصالات |
| `contract-requests` | طلبات من البوابة |
| `no-renewal-intent`, `submit-damage-receipt` | ما بعد الإنهاء |
| `contracts/{id}/inspections` | معاينات العقد (قراءة + توقيع مستأجر) |

### 13.2 المالك `/owner-portal`

| Endpoint | الوظيفة |
|----------|---------|
| `pending-approvals` + `decision` | تفعيل/رفض |
| `pending-terminations` + `termination-decision` | إنهاء |
| `pending-renewals` + `renewal-decision` | تجديد |
| `draft-contracts` | قائمة/رفض/تعديل مسودة |
| `dashboard`, `statements`, `properties` | عرض |

### 13.3 الفني `/officer`

جدول، طلبات مسندة، تقرير زيارة، company-queue، فواتير، موظفو الشركة.

---

## 14. كل الشاشات والـ API

### Admin — ملخص

| المجموعة | شاشات | Module |
|----------|-------|--------|
| نظرة | dashboard, notifications, audit-log, profile | dashboard, notifications, audit |
| دليل | properties, units, tenants, owners, users, lookups, legal-entities | properties, units, tenants, users, settings |
| عقود | contracts/dashboard, list, :id (تبويب inspections), templates, complaints, renew, owner-portal/contract-approvals | contracts |
| معاينات | inspections/:id | contracts |
| مالية | finance/*, accountant-portal/*, overdue-payments | finance |
| صيانة | maintenance, inventory, contractors | maintenance, inventory, contractors |
| تقارير | reports/*, ratings | reports, ratings |
| HR | hr/employees, leaves, payroll | hr |
| مالك | owner-portal/* | owner_portal |
| إعداد | user-access, screens, permissions, module-settings, vacancies | super admin |

### Tenant

`my-unit`, `my-contracts`, `contracts/:id` (معاينات + توقيع), `rent-receipts`, `new-request`, `requests`, `complaints`, `contract-request`, `notifications`, `profile`

### Officer

`schedule`, `requests`, `visit-report`, `company-queue`, `invoices`, `my-staff`, `notifications`, `profile`

### Employee

`my-payslips`, `notifications`, `profile`

---

## 15. مسار التشغيل من الصفر

```
1. SUPER_ADMIN: module-settings + permissions + lookups + users
2. إنشاء Property + Units (شاغرة)
3. إنشاء Accountant + Owner + Tenant (users + ربط عقار)
4. LeaseContract create → DRAFT (وحدة محجوزة)
5. [اختياري] submit-for-owner-approval → PENDING_OWNER_APPROVAL
6. Owner approve أو staff activate → ACTIVE
   → generatePaymentSchedule
   → CONTRACT_ACTIVATED
   → deposit revenue
7. دورة شهرية: RENT_DUE → دفع/إثبات → PAYMENT_RECEIVED
   → OVERDUE إن تأخر → RENT_GRACE_PERIOD_ENDING
8. صيانة: REQUEST_CREATED → ... → COMPLETED
9. نهاية عقد: terminate أو EXPIRED
   → [2B] نشر شاغر تلقائي إن لم يكن إعلان نشط
   → handover: deposit, report-damages (أو معاينة MOVE_OUT + link-damages)
   → معاينة MOVE_OUT موقّعة → clear-unit → UNIT_CLEARED
10. [2B] استفسار شاغر → CONTACTED → convert → مسودة عقد
11. dashboard + reports + [2] تصدير CSV للمحاسبة
```

---

## 16. ثغرات وملاحظات تقنية

| # | الملاحظة | التفصيل |
|---|----------|---------|
| 1 | Phase 1 | إشعارات مربوطة، غرامة تأخير، dunning، استفسارات شاغر + تحويل لعقد، كشوف مالك مجدولة، `OWNER_STATEMENT` |
| 2 | Phase 2 | تقسيم % ملاك + `owner_revenue_shares`، SLA صيانة بموعد (`sla_deadline`)، تصدير CSV مالي |
| 3 | Phase 2B | نشر شاغر تلقائي، معاينات move-in/out + ربط clear-unit |
| 4 | `SUSPENDED` (إيجار) | أُزيل من enum عقود الإيجار |
| 5 | `home-portal` | حُذف من الواجهة |
| 6 | مسار موافقة مزدوج | DRAFT + PENDING_OWNER_APPROVAL + draft-contracts |
| 7 | SMTP | بريد التسجيل يحتاج إعداد |
| 8 | PDF كشف مالك / بوابة `/owner` مستقلة | غير منفذة |

---

## مراجع ملفات الكود

| المجال | مسار Java |
|--------|-----------|
| عقود إيجار | `modules/contract/lease/service/LeaseContractService.java` |
| موافقة مالك | `modules/contract/lease/service/OwnerApprovalService.java` |
| مجدول | `modules/contract/scheduler/ContractScheduler.java` |
| دفعات | `modules/contract/payment/service/RentPaymentService.java` |
| صيانة عقد | `modules/maintenance/contract/service/MaintenanceContractService.java` |
| طلب صيانة | `modules/maintenance/request/service/MaintenanceRequestService.java` |
| إشعارات | `modules/notification/entity/NotificationType.java` |
| صلاحيات | `modules/permission/service/RolePermissionService.java` |
| Frontend عقد | `features/contracts/contract-detail/` |
| شواغر | `modules/vacancy/service/VacancyPublishingService.java` |
| معاينات | `modules/inspection/service/UnitInspectionService.java` |
| تصدير مالي | `modules/finance/service/FinanceExportService.java` |
| Routes | `features/admin/admin.routes.ts` |

---

## 17. ملخص إنجازات التطوير (Phase 1 / 2 / 2B)

جدول مرجعي لما أُضيف في الكود (Flyway من V159 فما فوق — لا تعدّل migrations أقدم).

### Phase 1 — تشغيل وإشعارات

| الميزة | Backend | Frontend |
|--------|---------|----------|
| إشعارات مربوطة | `REQUEST_COMPLETED`, `RENT_OVERDUE`, `OWNER_STATEMENT`, `BUDGET_THRESHOLD`, `DOCUMENT_EXPIRY`, `NEW_LOGIN`/`ACCOUNT_LOCKED` | مركز إشعارات |
| غرامة تأخير | `late_fee` على الدفعة + `ContractScheduler` | — |
| Dunning | `checkRentDunningEscalation` | — |
| استفسار شاغر | `VacancyService` convert inquiry | `/admin/vacancies` |
| كشوف مالك | `OwnerStatementGenerationService` مجدول | بوابة مالك — «حصتك %» |

### Phase 2 — ملاك وSLA وتصدير

| الميزة | Backend | Frontend |
|--------|---------|----------|
| نسب ملكية | V160 `ownership_percentage`, `owner_revenue_shares` | نموذج عقار — عمود % |
| SLA صيانة | V161 `sla_deadline`, `sla_breached`, تقرير sla-report | قائمة طلبات — عمود SLA |
| CSV مالي | `FinanceExportService`, `GET /finance/export/csv` | finance-reports — تنزيل |

### Phase 2B — شواغر ومعاينات

| الميزة | Backend | Frontend |
|--------|---------|----------|
| نشر شاغر تلقائي | V163 `listing_source`, `VacancyPublishingService` | شارة مصدر + زر نشر من الوحدات |
| معاينات | V162 جداول، `UnitInspectionService`, بوابة مستأجر | تبويب inspections + `/admin/inspections/:id` |
| clear-unit | يتطلب MOVE_OUT SIGNED | رسالة خطأ واضحة |

**Migrations:** V159 (Phase 1)، V160 (ملاك)، V161 (SLA)، V162 (معاينات)، V163 (مصدر شاغر).

---

## 18. تقرير تدقيق اكتمال الأعمال (مرجع منفصل)

تقرير مستقل يغطي: خرائط دورة الحياة (✅/⚠️/❌)، قواعد أعمال ناقصة، مسارات غير موجودة، فجوات إشعارات، أدوار، مالية، امتثال، تكاملات، ومصفوفة أولويات + خطة 3 مراحل.

| الملف | الوصف |
|-------|--------|
| [business-completeness-audit.md](business-completeness-audit.md) | التقرير كامل (محدّث بعد Phase 2B) |
| [business-completeness-audit.docx](business-completeness-audit.docx) | نسخة Word |

*أعد توليد Word للتقرير:* `cd docs/scripts && node build-audit-word.mjs`

---

*هذه الوثيقة هي المرجع التقني الكامل للبزنس. نسخة Word: `docs/business-guide-ar.docx` — أعد التوليد: `cd docs/scripts && node build-full-word.mjs`*
