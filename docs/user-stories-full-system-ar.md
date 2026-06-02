# وثيقة User Stories الشاملة — نظام إدارة العقارات
## Complete User Stories & Test Specification

**التاريخ:** 2026-05-31  
**الإصدار:** 1.0  
**الغرض:** مرجع اختبار شامل (يدوي + AI آلي) يغطي كل شاشة وكل تدفّق وكل دور في النظام.  
**البيئة:** Frontend `http://localhost:4500` · Backend `http://localhost:8081/api/v1` · DB schema `property_mgmt`

---

## كيف تُقرأ هذه الوثيقة

كل **Epic** = موديول/مجال في النظام.  
كل **User Story** بالصيغة:

> **US-XXX** — كـ «دور»، أريد أن «أفعل شيئاً»، حتى «أحقق هدفاً».

ويتبعها:
- **الشاشة / المسار** (Route)
- **الـ API** المستخدم
- **معايير القبول** (Acceptance Criteria) بصيغة Given/When/Then
- **خطوات الاختبار** (Manual + تلميح للأتمتة)
- **النتيجة** ☐ Pass ☐ Fail

**رموز الأدوار:**  
SA = SUPER_ADMIN · GM = GENERAL_MANAGER · AC = ACCOUNTANT · HR = HR_OFFICER · OW = OWNER · TN = TENANT · MC = MAINTENANCE_COMPANY · MO = MAINTENANCE_OFFICER (INTERNAL/COMPANY) · PG = PROPERTY_GUARD · PC = PROCEDURES_CLERK

---

## بيانات الدخول الافتراضية (بعد purge V180)

| الحقل | القيمة |
|-------|--------|
| البريد | `admin@propmgmt.com` |
| المستخدم | `superadmin` |
| كلمة المرور | `12345` |

---

# EPIC 01 — المصادقة والحساب (Auth & Profile)

### US-001 — تسجيل الدخول
> كـ مستخدم، أريد تسجيل الدخول بالبريد وكلمة المرور، حتى أصل إلى لوحتي حسب دوري.

- **المسار:** `/auth/login`
- **API:** `POST /auth/login`
- **معايير القبول:**
  - Given بيانات صحيحة، When أضغط دخول، Then أُوجَّه للوحة الدور (SA→`/admin/home`، TN→`/tenant/my-unit`، MO→`/officer/schedule`).
  - Given بيانات خاطئة، Then تظهر رسالة خطأ ولا يتم الدخول.
  - Given `mustChangePassword=true`، Then أُوجَّه إلى `/change-password`.
- **اختبار:** جرّب دخول صحيح/خاطئ لكل دور. (Auto: `POST /auth/login` ثم تحقق من التوكن والـ redirect.)
- ☐ Pass ☐ Fail

### US-002 — تغيير كلمة المرور
> كـ مستخدم، أريد تغيير كلمة المرور، حتى أؤمّن حسابي.

- **المسار:** `/change-password`
- **API:** `POST /auth/change-password`
- **معايير القبول:** كلمة المرور الجديدة تُحفظ، ويتم إلغاء `mustChangePassword`، وتسجيل الدخول التالي يعمل بالجديدة.
- ☐ Pass ☐ Fail

### US-003 — الملف الشخصي
> كـ أي مستخدم، أريد عرض/تعديل بياناتي (اسم، هاتف، صورة)، حتى تبقى محدّثة.

- **المسار:** `/admin/profile` · `/tenant/profile` · `/officer/profile` · `/employee/profile`
- **API:** `GET /users/me` · `PUT /users/{id}`
- **معايير القبول:** التعديل يُحفظ ويظهر بعد إعادة التحميل؛ الصورة تُرفع وتظهر.
- ☐ Pass ☐ Fail

### US-004 — تسجيل الخروج
> كـ مستخدم، أريد الخروج، حتى أنهي الجلسة بأمان.

- **معايير القبول:** الخروج يمسح التوكن ويعيد إلى `/auth/login`؛ المسارات المحمية تُمنع بعدها.
- ☐ Pass ☐ Fail

---

# EPIC 02 — لوحة التحكم والرئيسية (Dashboard & Home)

### US-010 — الرئيسية (Home Portal)
> كـ مستخدم إداري، أريد رؤية كروت روابط سريعة حسب صلاحياتي، حتى أتنقل بسرعة.

- **المسار:** `/admin/home`
- **معايير القبول:** تظهر فقط الكروت المسموح بها للدور؛ كل كرت يفتح المسار الصحيح.
- ☐ Pass ☐ Fail

### US-011 — لوحة التحكم الرئيسية
> كـ SA/GM، أريد رؤية KPIs (عقارات، وحدات، إشغال، صيانة، إيراد)، حتى أتابع الأداء.

- **المسار:** `/admin/dashboard`
- **API:** `GET /dashboard/stats` · `/dashboard/requests-by-status` · `/dashboard/monthly-trend` · `/dashboard/recent-activity`
- **معايير القبول:**
  - Given وجود بيانات، Then الأرقام تطابق الواقع (عدد العقارات/الوحدات/العقود).
  - الرسوم البيانية تُحمَّل بدون أخطاء؛ النشاط الأخير يعرض أحدث العمليات.
  - فلتر العقار (لو ظاهر) يحدّث الأرقام.
- ☐ Pass ☐ Fail

---

# EPIC 03 — العقارات (Properties)

### US-020 — قائمة العقارات
> كـ SA/GM، أريد عرض كل العقارات مع pagination وبحث، حتى أديرها.

- **المسار:** `/admin/properties`
- **API:** `GET /properties`
- **معايير القبول:** القائمة تظهر مع pager (حجم 6)، بحث، وزر رجوع؛ الأعمدة صحيحة (الاسم، الكود، عدد الوحدات).
- ☐ Pass ☐ Fail

### US-021 — إضافة عقار
> كـ SA/GM، أريد إضافة عقار باسم عربي/إنجليزي ومالك ومرفقات، حتى أبني الشجرة.

- **API:** `POST /properties`
- **معايير القبول:**
  - الحقول المطلوبة (الاسم AR/EN، المالك) يُتحقق منها.
  - يجب إرفاق مستند ملكية واحد على الأقل للمالك.
  - بعد الحفظ يظهر العقار في القائمة، ويصل إشعار `PROPERTY_LINKED_TO_OWNER` للمالك.
- ☐ Pass ☐ Fail

### US-022 — تعديل/حذف عقار
> كـ SA/GM، أريد تعديل أو حذف عقار، حتى أصحّح البيانات.

- **API:** `PUT /properties/{id}` · `DELETE /properties/{id}`
- **معايير القبول:** لا يُسمح بحذف عقار به وحدات نشطة (رسالة `PROPERTY_HAS_UNITS`).
- ☐ Pass ☐ Fail

### US-023 — مرفقات العقار
> كـ SA/GM، أريد رفع/عرض/حذف مستندات العقار، حتى أوثّق الملكية.

- **API:** `POST/GET/DELETE /properties/.../attachments`
- **معايير القبول:** الرفع، العرض (view)، والتنزيل (download) يعملون؛ الحذف يزيل المرفق.
- ☐ Pass ☐ Fail

---

# EPIC 04 — الوحدات والطوابق (Units & Floors)

### US-030 — قائمة الوحدات
> كـ SA/GM، أريد عرض الوحدات وفلترتها بالعقار/الحالة، حتى أتابع الإشغال.

- **المسار:** `/admin/units`
- **API:** `GET /units`
- **معايير القبول:** فلتر LOV للعقار؛ تظهر الحالة (شاغرة/مؤجرة)، الإيجار، المساحة.
- ☐ Pass ☐ Fail

### US-031 — إضافة/تعديل وحدة
> كـ SA/GM، أريد إضافة وحدة برقم وإيجار ونوع، حتى أؤجّرها لاحقاً.

- **API:** `POST/PUT /units/{id}`
- **معايير القبول:**
  - لا يتجاوز عدد الوحدات سعة العقار/الطابق (رسائل `FLOOR_CAPACITY_REACHED` / `PROPERTY_UNIT_CAPACITY_REACHED`).
  - بعد الحفظ يصل إشعار `UNIT_ADDED_TO_OWNER_PROPERTY` للمالك.
- ☐ Pass ☐ Fail

### US-032 — حذف وحدة
> كـ SA/GM، أريد حذف وحدة شاغرة، حتى أنظّف البيانات.

- **معايير القبول:** لا يُسمح بحذف وحدة مؤجرة (`UNIT_IS_RENTED`)؛ يجب جعلها شاغرة أولاً.
- ☐ Pass ☐ Fail

---

# EPIC 05 — الملاك (Owners)

### US-040 — قائمة الملاك
> كـ SA/GM، أريد عرض الملاك مع pagination، حتى أديرهم.

- **المسار:** `/admin/owners`
- **API:** `GET /owners`
- **معايير القبول:** pager حجم 6، بحث، زر رجوع.
- ☐ Pass ☐ Fail

### US-041 — إضافة مالك وربطه بعقار
> كـ SA/GM، أريد إضافة مالك وتفعيل بوابته، حتى يدير عقاراته ويوافق على العقود.

- **API:** `POST /owners`
- **معايير القبول:**
  - يجب اختيار مالك واحد على الأقل و إرفاق مستند ملكية.
  - عند تفعيل `portalAccess` يُنشأ مستخدم OWNER ويصله إشعار.
  - دعم تعدد الملاك (`property_owners`) وحصص الإيرادات (`owner_revenue_shares`).
- ☐ Pass ☐ Fail

---

# EPIC 06 — المستأجرون (Tenants)

### US-050 — قائمة المستأجرين
> كـ SA/GM/AC، أريد عرض المستأجرين مع فلاتر وبحث، حتى أتابعهم.

- **المسار:** `/admin/tenants`
- **API:** `GET /tenants`
- **معايير القبول:** فلاتر LOV بدون خلفية مظللة مزدوجة؛ pager؛ عمود العقار/الوحدة.
- ☐ Pass ☐ Fail

### US-051 — إضافة مستأجر (Onboarding كامل)
> كـ SA/GM/AC، أريد إضافة مستأجر مع عقد إيجار في دايالوج واحد، حتى أختصر الخطوات.

- **المسار:** دايالوج في `/admin/tenants`
- **API:** `POST /tenants` (onboarding)
- **معايير القبول:**
  - رفع الصورة الشخصية وصورة البطاقة المدنية (مطلوب).
  - اختيار العقار/الوحدة، تواريخ الإيجار، الإيجار الشهري، تكرار الدفع.
  - إذا الإيجار أقل من الأصلي يظهر حقل سبب التخفيض.
  - دعم «شهر مجاني».
  - بعد الحفظ: يُنشأ مستأجر + عقد + (اختياري) مستخدم بوابة؛ تظهر إشعارات.
- ☐ Pass ☐ Fail

### US-052 — تعديل مستأجر
> كـ SA/GM/AC، أريد تعديل بيانات المستأجر، حتى أصحّحها.

- **API:** `PUT /tenants/{id}`
- ☐ Pass ☐ Fail

---

# EPIC 07 — العقود (Lease Contracts)

### US-060 — لوحة العقود
> كـ SA/GM/AC/OW، أريد لوحة العقود (KPI cards)، حتى أرى الحالة العامة.

- **المسار:** `/admin/contracts/dashboard`
- **معايير القبول:** كروت `estate-stat-card`؛ أرقام صحيحة (نشط/منتهٍ/مسوّدة).
- ☐ Pass ☐ Fail

### US-061 — قائمة العقود
> كـ SA/GM/AC/OW، أريد قائمة العقود مع فلاتر حالة/نوع، حتى أبحث.

- **المسار:** `/admin/contracts/list`
- **API:** `GET /lease-contracts`
- **معايير القبول:** فلاتر LOV (بدون صندوق مظلل)؛ pager؛ تفاصيل كل عقد.
- ☐ Pass ☐ Fail

### US-062 — تفاصيل العقد + جدول الدفع
> كـ SA/GM/AC، أريد رؤية بنود العقد وجدول الإيجار والرسوم، حتى أتابع التحصيل.

- **المسار:** `/admin/contracts/:id`
- **API:** `GET /lease-contracts/{id}` · `GET .../payment-schedule`
- **معايير القبول:** يظهر الجدول والرسوم والمرفقات؛ إجراء «إرسال لموافقة المالك» متاح للمسوّدة.
- ☐ Pass ☐ Fail

### US-063 — تجديد العقد
> كـ SA/GM/AC، أريد تجديد عقد، حتى أمدّد الإيجار.

- **المسار:** `/admin/contracts/:id/renew`
- **API:** `POST .../renewals`
- **معايير القبول:** مدة لا تتجاوز 12 شهراً (`CONTRACT_DURATION_MAX_12`)؛ بعد التجديد يُحدّث الجدول.
- ☐ Pass ☐ Fail

### US-064 — إنهاء العقد
> كـ SA/GM/AC، أريد طلب إنهاء عقد بسبب، حتى تبدأ دورة الموافقة.

- **API:** `PATCH .../terminate`
- **معايير القبول:** سبب الإنهاء مطلوب؛ يصل إشعار `CONTRACT_TERMINATION_REQUESTED`.
- ☐ Pass ☐ Fail

### US-065 — قوالب العقود
> كـ SA، أريد إدارة قوالب العقود، حتى أوحّد الصياغة.

- **المسار:** `/admin/contracts/templates`
- **API:** `GET/POST/PUT /contract-templates`
- ☐ Pass ☐ Fail

### US-066 — ملاحق العقد (Annexes)
> كـ SA/GM/AC، أريد إضافة ملحق للعقد، حتى أوثّق التعديلات.

- **API:** `POST/PUT/DELETE /contract-annexes`
- ☐ Pass ☐ Fail

### US-067 — معاينة الوحدة (Inspections)
> كـ SA/GM، أريد تسجيل معاينة للوحدة مع صور وبنود، حتى أوثّق الحالة.

- **المسار:** `/admin/inspections/:id`
- **API:** `GET/POST /lease-contracts/{contractId}/inspections`
- ☐ Pass ☐ Fail

---

# EPIC 08 — موافقات المالك على العقود (Owner Approvals)

### US-070 — قائمة الموافقات
> كـ OW (أو SA/GM/AC)، أريد رؤية العقود المنتظرة موافقتي، حتى أقرّ أو أرفض.

- **المسار:** `/admin/owner-portal/contract-approvals`
- **API:** `GET /owner-approvals` (DRAFT + PENDING_OWNER)
- **معايير القبول:** القائمة تدمج المسوّدات والمنتظرة؛ تظهر تفاصيل كل عقد.
- ☐ Pass ☐ Fail

### US-071 — موافقة/رفض/تعديل العقد
> كـ OW، أريد الموافقة أو الرفض مع سبب، حتى يُفعّل العقد أو يُعاد.

- **API:** `PATCH /owner-approvals/{id}/approve|reject|amend`
- **معايير القبول:**
  - الموافقة → `CONTRACT_ACTIVATED` + إشعار للمستأجر/المحاسب.
  - الرفض يتطلب سبباً → `TENANT_LEASE_REJECTED_BY_OWNER`.
  - التعديل يتطلب سبباً → `TENANT_LEASE_AMENDED_BY_OWNER`.
- ☐ Pass ☐ Fail

---

# EPIC 09 — طلبات الصيانة (Maintenance Requests)

### US-080 — قائمة طلبات الصيانة
> كـ SA/GM/PG، أريد عرض الطلبات وفلترتها، حتى أتابع الصيانة.

- **المسار:** `/admin/maintenance`
- **API:** `GET /maintenance-requests`
- **معايير القبول:** فلاتر LOV؛ pager؛ حالة كل طلب (PENDING…COMPLETED).
- ☐ Pass ☐ Fail

### US-081 — إنشاء طلب صيانة
> كـ SA/GM/TN، أريد إنشاء طلب بوصف وصور وأولوية، حتى تُعالَج المشكلة.

- **المسار:** `/admin/maintenance/new` · `/tenant/new-request`
- **API:** `POST /maintenance-requests`
- **معايير القبول:** الوصف والفئة مطلوبان؛ رفع صور؛ بعد الإنشاء إشعار `REQUEST_CREATED` للمسؤولين.
- ☐ Pass ☐ Fail

### US-082 — تعيين/جدولة الطلب
> كـ SA/GM/MO، أريد تعيين فني وجدولة زيارة، حتى تُنفّذ الصيانة.

- **API:** `PATCH .../assign` · `PATCH .../schedule`
- **معايير القبول:** التعيين → `REQUEST_ASSIGNED`؛ الجدولة → `REQUEST_SCHEDULED`؛ المستأجر يقبل/يرفض الموعد (`REQUEST_SCHEDULE_ACCEPTED/REJECTED`).
- ☐ Pass ☐ Fail

### US-083 — تقرير الزيارة وإكمال الطلب
> كـ MO، أريد تسجيل تقرير الزيارة والبنود، حتى أُغلق الطلب.

- **المسار:** `/officer/requests/:id/visit-report`
- **API:** `POST .../visit-report`
- **معايير القبول:** بعد التقرير الحالة → COMPLETED/NEEDS_REVISIT؛ إشعار `REQUEST_COMPLETED`.
- ☐ Pass ☐ Fail

### US-084 — تقييم الزيارة (مستأجر)
> كـ TN، أريد تقييم زيارة الصيانة المكتملة (1–4)، حتى أقيّم الخدمة.

- **API:** `POST /maintenance-requests/{id}/rating`
- **معايير القبول:**
  - التقييم متاح فقط لطلب COMPLETED/NEEDS_REVISIT.
  - لا يُسمح بتقييم مكرر (conflict).
  - بعد التقييم يصل `REQUEST_RATED` للمالك/الأدمن/المحاسب ويظهر في `/admin/ratings`.
- ☐ Pass ☐ Fail

---

# EPIC 10 — بوابة فني الصيانة (Officer Portal)

### US-090 — جدول الفني
> كـ MO، أريد رؤية مواعيد زياراتي، حتى أنظّم يومي.

- **المسار:** `/officer/schedule`
- ☐ Pass ☐ Fail

### US-091 — طلباتي (الفني)
> كـ MO، أريد قائمة طلباتي المعيّنة وتفاصيلها، حتى أنفّذها.

- **المسار:** `/officer/requests` · `/officer/requests/:id`
- ☐ Pass ☐ Fail

### US-092 — قائمة الشركة (Company Queue)
> كـ MC، أريد رؤية الطلبات غير المعيّنة لشركتي، حتى أوزّعها على فنييي.

- **المسار:** `/officer/company-queue`
- ☐ Pass ☐ Fail

### US-093 — موظفو الشركة
> كـ MC، أريد إدارة فنيي شركتي، حتى أعيّنهم.

- **المسار:** `/officer/my-staff`
- **API:** `GET /users/assignable-contractor-officers`
- ☐ Pass ☐ Fail

### US-094 — فواتير الفني/الشركة
> كـ MC، أريد تقديم فاتورة صيانة شهرية، حتى أُحصّل المستحقات.

- **المسار:** `/officer/invoices`
- **API:** `POST /maintenance-invoices`
- **معايير القبول:** الفاتورة تُقدَّم بحالة PENDING وتظهر للمحاسب للمراجعة.
- ☐ Pass ☐ Fail

---

# EPIC 11 — شركات الصيانة (Contractor Companies)

### US-100 — قائمة الشركات
> كـ SA/GM، أريد عرض شركات الصيانة، حتى أتعاقد معها.

- **المسار:** `/admin/contractors`
- **API:** `GET /contractor-companies`
- ☐ Pass ☐ Fail

### US-101 — إضافة/تفاصيل شركة
> كـ SA/GM، أريد إضافة شركة وربطها بعقار وإنشاء مستخدم لها، حتى تستقبل الطلبات.

- **المسار:** `/admin/contractors/:id`
- **API:** `POST/PUT /contractor-companies`
- **معايير القبول:** عند إنشاء مستخدم `MAINTENANCE_COMPANY` يجب `contractorCompanyId`.
- ☐ Pass ☐ Fail

---

# EPIC 12 — عقود الصيانة وفواتيرها (Maintenance Contracts & Invoices)

### US-110 — عقد صيانة مع شركة
> كـ SA/GM/AC، أريد إنشاء عقد صيانة ACTIVE مع شركة، حتى تُولّد الفواتير.

- **المسار:** `/admin/contracts/maintenance`
- **API:** `POST /maintenance-contracts`
- **معايير القبول:** يتطلب قيمة عقد وتواريخ بداية/نهاية؛ يدخل دورة موافقة المالك (`MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW`).
- ☐ Pass ☐ Fail

### US-111 — توليد الفواتير الشهرية
> كـ SA/GM/AC، أريد توليد فواتير شهرية من العقد، حتى أدفعها.

- **API:** `POST /maintenance-contracts/{id}/generate-invoices`
- **معايير القبول:** تُنشأ فاتورة لكل شهر ضمن مدة العقد بمبلغ = القيمة/12؛ لا تكرار لنفس الشهر.
- ☐ Pass ☐ Fail

### US-112 — قائمة فواتير الصيانة (المحاسب)
> كـ AC, أريد تبويبين (فواتير الشركة / دفعات العقود) مع فلاتر، حتى أراجع وأدفع.

- **المسار:** `/admin/accountant-portal/maintenance-invoices`
- **API:** `GET /accountant-portal/maintenance-invoices` · `GET /maintenance-invoices`
- **معايير القبول:**
  - فلاتر: العقار، الشركة، السنة، الشهر + زر **بحث** + زر **Reset** (يمسح ويعيد التحميل).
  - pagination حجم **6** في كلا التبويبين.
  - الكروت تُظهر بيانات الفاتورة وجدول الأقساط كاملاً (الكارت عريض).
- ☐ Pass ☐ Fail

### US-113 — تسجيل دفع فاتورة عقد (كامل/أقساط)
> كـ AC، أريد دفع فاتورة كاملةً أو تقسيطها مع رفع إيصال، حتى أوثّق الصرف.

- **API:** `POST /maintenance-invoices/{id}/payment-plan`
- **معايير القبول:**
  - دايالوج بنفس فكرة «إضافة مستأجر» (هيدر موحّد، فورم Grid، زر X).
  - **رفع الإيصال مطلوب** قبل الحفظ.
  - وضع «دفع كامل» أو «مُجدوَل» (حتى 4 أقساط، القسط الأول اليوم بإيصال).
  - بعد الحفظ: يُسجَّل مصروف على العقار، وتصل إشعارات `MAINTENANCE_CONTRACT_PAYMENT_RECEIVED` **للمالك وشركة الصيانة**.
- ☐ Pass ☐ Fail

### US-114 — دفع قسط + عرض الإيصال
> كـ AC، أريد دفع قسط منفرد وعرض إيصاله لاحقاً، حتى أتابع الأقساط.

- **API:** `PATCH /maintenance-invoices/{invoiceId}/payments/{paymentId}/mark-paid`
- **معايير القبول:**
  - زر «دفع القسط» يظهر للأقساط PENDING فقط.
  - بعد الدفع يظهر زر **«عرض الإيصال»** بجانب القسط المدفوع ويفتح الملف.
  - نص «بانتظار تأكيد دفع المحاسب» يظهر مترجماً (لا مفتاح خام).
- ☐ Pass ☐ Fail

### US-115 — تذكيرات أقساط الصيانة (Scheduler)
> كـ النظام، أريد تنبيه المحاسب قبل/يوم استحقاق القسط، حتى لا يتأخر.

- **API (QA):** `POST /dev/schedulers/*`
- **معايير القبول:** `MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON` (قبل 3 أيام) و`..._DUE_TODAY` (اليوم) تصل للمحاسب.
- ☐ Pass ☐ Fail

---

# EPIC 13 — التقييمات (Ratings)

### US-120 — لوحة التقييمات
> كـ SA/GM/AC/OW، أريد رؤية تقييمات الزيارات والشكاوى مع فلاتر، حتى أقيّم الجودة.

- **المسار:** `/admin/ratings`
- **API:** `GET /dashboard/ratings-details` · `/dashboard/complaint-ratings-details`
- **معايير القبول:**
  - تبويبان (زيارات/شكاوى)؛ KPIs (متوسط، عدد، رضا، تقييمات منخفضة).
  - فلاتر LOV (عقار/وحدة/مستأجر/نجوم/تاريخ) + Reset.
  - pagination حجم **6**.
  - الـ scope: المالك يرى عقاراته فقط.
- ☐ Pass ☐ Fail

---

# EPIC 14 — المخزون (Inventory)

### US-130 — قائمة المخزون
> كـ SA/GM، أريد عرض أصناف المخزون وحركاتها، حتى أتابع الكميات.

- **المسار:** `/admin/inventory`
- **API:** `GET /inventory-items` · `/inventory-transactions`
- **معايير القبول:** فلتر بالعقار/بحث؛ زر مسح الفلاتر؛ إضافة صنف وحركة (وارد/منصرف).
- ☐ Pass ☐ Fail

### US-131 — تنبيه نقص المخزون (Scheduler)
> كـ النظام، أريد تنبيه عند انخفاض الكمية، حتى يُعاد التزويد.

- **معايير القبول:** `INVENTORY_LOW_STOCK` يصل عند تجاوز الحد الأدنى.
- ☐ Pass ☐ Fail

---

# EPIC 15 — الموارد البشرية (HR)

### US-140 — الموظفون
> كـ HR، أريد إدارة الموظفين والأقسام، حتى أبني الهيكل.

- **المسار:** `/admin/hr/employees` · `/admin/hr/employees/new`
- **API:** `GET/POST/PUT /employees` · `/departments`
- ☐ Pass ☐ Fail

### US-141 — الحضور
> كـ HR، أريد تسجيل الحضور، حتى يُحسب الراتب.

- **المسار:** `/admin/hr/attendance`
- **API:** `GET/POST /attendance`
- ☐ Pass ☐ Fail

### US-142 — الإجازات
> كـ HR/موظف، أريد تقديم/اعتماد الإجازات، حتى تُدار الأرصدة.

- **المسار:** `/admin/hr/leaves`
- **API:** `POST /leave-requests` · `PATCH .../approve|reject`
- **معايير القبول:** `LEAVE_REQUEST_SUBMITTED/APPROVED/REJECTED`؛ تنبيه `LEAVE_BALANCE_LOW`.
- ☐ Pass ☐ Fail

### US-143 — الاستقطاعات
> كـ HR، أريد إضافة/عرض/تعديل/حذف استقطاع وإرساله للمحاسب، حتى يُطبّق على الراتب.

- **المسار:** `/admin/hr/deductions`
- **API:** `GET/POST /hr/deductions` · `PUT /hr/deductions/{id}` · `DELETE /hr/deductions/{id}` · `POST .../{id}/send|approve|reject`
- **معايير القبول:**
  - pagination حجم **5** (server-side)، عمود #، pager.
  - الإضافة عبر **دايالوج** (موظف، مبلغ، شهر الراتب، تاريخ، سبب) — وليس prompt.
  - خانة الإجراءات أيقونات ملوّنة مع tooltip زي شاشة المستأجرين: **عرض (👁)** لكل الصفوف، **تعديل (✏️)** و**حذف (🗑)** للحالة **DRAFT** فقط، ثم **إرسال (📤) / موافقة (✔) / رفض (✘)** حسب الحالة.
  - التعديل/الحذف مرفوضان بعد الإرسال (الباك يرجّع 400 لغير DRAFT).
  - `HR_DEDUCTION_SENT_TO_ACCOUNTANT` → موافقة/رفض المحاسب → `..._APPROVED/REJECTED`.
- ☐ Pass ☐ Fail

### US-144 — الرواتب (Payroll)
> كـ HR/GM، أريد إنشاء مسير رواتب واعتماده ودفعه، حتى تُصرف الرواتب.

- **المسار:** `/admin/hr/payroll`
- **API:** `POST /payroll-runs` · `PATCH .../submit|approve|reject` · `POST .../mark-paid`
- **معايير القبول:**
  - **pagination حجم 5** في قائمة المسيّرات + عمود # + pager (يُصفّر مع تغيير فلتر العقار).
  - زر العرض في القائمة وسط/ملوّن مع tooltip؛ صفحة التفاصيل كروت + زر رجوع.
  - الحالات: SUBMITTED→APPROVED/REJECTED→PAID **تظهر مترجمة** (لا مفاتيح خام مثل `REJECTED`) — fallback من `HR.STATUS.*` لو الـ lookup ناقص.
  - بعد PAID يصل `PAYSLIP_AVAILABLE` للموظفين.
- ☐ Pass ☐ Fail

### US-145 — السلف والمكافآت
> كـ HR، أريد إدارة السلف والمكافآت، حتى تنعكس في الراتب.

- **API:** `POST /salary-advances` · `/employee-bonuses`
- **معايير القبول:** `SALARY_ADVANCE_REQUESTED/APPROVED/REJECTED/DEDUCTED`.
- ☐ Pass ☐ Fail

---

# EPIC 16 — المالية (Finance)

### US-150 — لوحة المالية
> كـ AC/GM, أريد KPIs مالية (إيراد، مصروف، صافي)، حتى أتابع الأداء.

- **المسار:** `/admin/finance/dashboard`
- **معايير القبول:** كروت `estate-stat-card`؛ أرقام صحيحة.
- ☐ Pass ☐ Fail

### US-151 — المصروفات
> كـ AC، أريد تسجيل/اعتماد المصروفات، حتى أضبط التكاليف.

- **المسار:** `/admin/finance/expenses`
- **API:** `GET/POST /expenses` · `PATCH .../approve`
- ☐ Pass ☐ Fail

### US-152 — الإيرادات الأخرى
> كـ AC، أريد تسجيل إيرادات غير الإيجار، حتى تكتمل الصورة.

- **المسار:** `/admin/finance/revenues`
- **API:** `GET/POST /other-revenues`
- ☐ Pass ☐ Fail

### US-153 — الميزانية (Budget)
> كـ AC, أريد مقارنة الميزانية بالفعلي مع تنبيهات، حتى أضبط الإنفاق.

- **المسار:** `/admin/finance/budget`
- **API:** `GET /budgets?propertyId&year` · `GET /reports/budget-vs-actual`
- **معايير القبول:**
  - KPIs، فلتر السنة، جدول كامل (بند، ميزانية، فعلي، انحراف، نسبة).
  - الفعلي = مجموع المصروفات الحقيقي (ليس صفراً).
  - تنبيه `BUDGET_THRESHOLD_EXCEEDED` عند تجاوز العتبة (YTD ضمن الفترة المالية).
- ☐ Pass ☐ Fail

### US-154 — الفترات المالية
> كـ AC, أريد إدارة الفترات المالية، حتى تُربط التقارير بها.

- **API:** `GET/POST /financial-periods`
- ☐ Pass ☐ Fail

### US-155 — كشوف الملاك
> كـ AC, أريد توليد كشف حساب المالك، حتى أعرض إيراداته ومصروفاته.

- **المسار:** `/admin/finance/owner-statements`
- **API:** `GET/POST /owner-statements`
- **معايير القبول:** يصل `OWNER_STATEMENT` للمالك؛ يدعم تعدد الملاك وحصص الإيراد.
- ☐ Pass ☐ Fail

---

# EPIC 17 — التقارير (Reports)

### US-160 — مركز التقارير
> كـ SA/GM/AC, أريد قائمة بكل التقارير، حتى أصدّرها.

- **المسار:** `/admin/reports`
- ☐ Pass ☐ Fail

### US-161 — تقرير الإشغال
> كـ SA/GM, أريد نسبة الإشغال لكل عقار، حتى أحلّل الأداء.
- **المسار:** `/admin/reports/occupancy` · ☐ Pass ☐ Fail

### US-162 — تقرير انتهاء العقود
> كـ SA/GM/AC, أريد العقود المنتهية قريباً، حتى أجدّدها.
- **المسار:** `/admin/reports/contract-expiry` · ☐ Pass ☐ Fail

### US-163 — تقرير الصيانة
> كـ SA/GM, أريد إحصاء الطلبات حسب الحالة، حتى أتابع الأداء.
- **المسار:** `/admin/reports/maintenance` · زر Reset للفلاتر · ☐ Pass ☐ Fail

### US-164 — الميزانية مقابل الفعلي
- **المسار:** `/admin/reports/budget-vs-actual` · ☐ Pass ☐ Fail

### US-165 — تقارير مالية إضافية
> الأرباح والخسائر/التدفق النقدي/كشف المالك.
- **المسار:** `/admin/reports/pnl` · `/cashflow` · `/owner-statement` · ☐ Pass ☐ Fail

---

# EPIC 18 — الشواغر والاستفسارات (Vacancies)

### US-170 — إعلانات الشواغر
> كـ SA/GM, أريد إدارة الوحدات الشاغرة المعلنة، حتى أؤجّرها.

- **المسار:** `/admin/vacancies` (يُعاد توجيهه إلى `/admin/units` لتجنّب التكرار)
- **API:** `GET /vacancy-listings`
- ☐ Pass ☐ Fail

### US-171 — استفسارات الإيجار
> كـ SA/GM, أريد متابعة استفسارات الراغبين، حتى أحوّلهم لمستأجرين.

- **المسار:** `/admin/vacancies/:id/inquiries`
- **API:** `GET /rental-inquiries`
- ☐ Pass ☐ Fail

---

# EPIC 19 — بوابة المحاسب (Accountant Portal)

### US-180 — تأكيد الإيجار
> كـ AC, أريد تأكيد دفعات الإيجار ورفع الإيصال، حتى يُغلق الاستحقاق.

- **المسار:** `/admin/accountant-portal/rent-confirmation`
- **API:** `POST /payment-schedule/{scheduleId}/mark-paid`
- **معايير القبول:** بعد التأكيد الحالة → مدفوع؛ إيصال يُرفع؛ `PAYMENT_RECEIVED` يصل.
- ☐ Pass ☐ Fail

### US-181 — طلبات التجديد
> كـ AC, أريد مراجعة طلبات تجديد المستأجرين، حتى أوافق/أرفض.

- **المسار:** `/admin/accountant-portal/renewal-requests`
- **API:** `GET /tenant-portal/renewal-requests`
- **معايير القبول:** `ACCOUNTANT_CONTRACT_RENEWAL_APPROVED/REJECTED`.
- ☐ Pass ☐ Fail

### US-182 — فواتير الصيانة
> (مغطّى في EPIC 12: US-112/113/114).

---

# EPIC 20 — بوابة المالك (Owner Portal)

### US-190 — لوحة المالك
> كـ OW, أريد KPIs لعقاراتي فقط، حتى أتابع استثماري.

- **المسار:** `/admin/owner-portal/dashboard`
- **معايير القبول:** الأرقام مقصورة على عقارات المالك (scope).
- ☐ Pass ☐ Fail

### US-191 — عقارات المالك
- **المسار:** `/admin/owner-portal/properties` · ☐ Pass ☐ Fail

### US-192 — كشوف حساب المالك
- **المسار:** `/admin/owner-portal/statements` · ☐ Pass ☐ Fail

---

# EPIC 21 — بوابة المستأجر (Tenant Portal)

### US-200 — وحدتي
> كـ TN, أريد رؤية بيانات وحدتي وعقدي، حتى أتابع إيجاري.
- **المسار:** `/tenant/my-unit` · ☐ Pass ☐ Fail

### US-201 — عقودي
- **المسار:** `/tenant/my-contracts` · `/tenant/contracts/:id` · ☐ Pass ☐ Fail

### US-202 — إيصالات الإيجار
> كـ TN, أريد رفع إيصال دفع الإيجار، حتى يؤكّده المحاسب.
- **المسار:** `/tenant/rent-receipts` · ☐ Pass ☐ Fail

### US-203 — طلب عقد/تجديد
> كـ TN, أريد طلب تجديد/إنهاء عقدي، حتى تبدأ الدورة.
- **المسار:** `/tenant/contract-request` · إشعار `TENANT_CONTRACT_RENEWAL_REQUESTED` · ☐ Pass ☐ Fail

### US-204 — طلبات الصيانة (مستأجر)
- **المسار:** `/tenant/requests` · `/tenant/new-request` · ☐ Pass ☐ Fail

### US-205 — الشكاوى
> كـ TN, أريد فتح شكوى ومتابعتها وتقييمها بعد الإغلاق، حتى أُسمع صوتي.
- **المسار:** `/tenant/complaints`
- **API:** `POST /tenant-complaints` · `POST .../rating`
- **معايير القبول:** `COMPLAINT_SUBMITTED`؛ ردّ → `COMPLAINT_REPLY_RECEIVED`؛ تقييم بعد RESOLVED/CLOSED.
- ☐ Pass ☐ Fail

---

# EPIC 22 — بوابة الموظف (Employee Portal)

### US-210 — كشوف رواتبي
> كـ PG/PC/موظف, أريد عرض كشوف رواتبي، حتى أتحقق منها.
- **المسار:** `/employee/my-payslips` · `/employee/my-payslips/:id` · ☐ Pass ☐ Fail

### US-211 — إشعارات الموظف
- **المسار:** `/employee/notifications` · ☐ Pass ☐ Fail

---

# EPIC 23 — الشكاوى الإدارية (Complaints)

### US-220 — قائمة الشكاوى
> كـ SA/GM/AC, أريد عرض شكاوى المستأجرين ومعالجتها وإنشاء طلب صيانة منها، حتى أعالجها.
- **المسار:** `/admin/contracts/complaints`
- **API:** `GET /complaints` · `PATCH .../resolve` · `POST .../{id}/maintenance-request`
- **معايير القبول:**
  - عمود العقار-الوحدة ظاهر؛ رد على الشكوى؛ تغيير الحالة.
  - خانة الإجراءات **كلها أيقونات ملوّنة مع tooltip على سطر واحد** (بدون التفاف): **التفاصيل (👁)**، **حل الشكوى (✅)** لو متاح، **إنشاء طلب صيانة (🔧 أحمر)** لو OPEN/IN_REVIEW وغير مرتبط، وشارة «مرتبط بصيانة» لو موجود.
  - إنشاء طلب الصيانة يربط الشكوى بالطلب ويمنع التكرار.
- ☐ Pass ☐ Fail

---

# EPIC 24 — الإشعارات (Notifications)

### US-230 — مركز الإشعارات
> كـ أي مستخدم, أريد عرض إشعاراتي وتعليمها مقروءة، حتى أتابع المستجدات.
- **المسار:** `/admin/notifications` · `/tenant/notifications` · `/officer/notifications` · `/employee/notifications`
- **API:** `GET /notifications` · `PATCH .../read`
- **معايير القبول:** pager؛ التنقل من الإشعار يفتح الكيان الصحيح (fallback للوحدات إن لزم).
- ☐ Pass ☐ Fail

### US-231 — جداول الإشعارات الزمنية (Schedulers)
> كـ النظام, أريد إرسال تنبيهات دورية، حتى لا تفوت المواعيد.
- **API (QA SA):** `POST /dev/schedulers/{name}`
- **يشمل:** `RENT_DUE`, `RENT_OVERDUE`, `CONTRACT_EXPIRING`, `CONTRACT_EXPIRING_SOON`, `DOCUMENT_EXPIRY_WARNING`, `MAINTENANCE_REQUEST_OVERDUE`, `INVENTORY_LOW_STOCK`, `LEAVE_BALANCE_LOW`, `OWNER_STATEMENT`.
- ☐ Pass ☐ Fail

---

# EPIC 25 — الإعدادات والصلاحيات (Settings & Permissions)

### US-240 — القوائم المرجعية (Lookups)
> كـ SA, أريد إدارة القوائم (أنواع الشكاوى، حالات…)، حتى تتسق البيانات.
- **المسار:** `/admin/lookups` · ☐ Pass ☐ Fail

### US-241 — المستخدمون
> كـ SA, أريد إدارة المستخدمين وأدوارهم، حتى أتحكّم بالوصول.
- **المسار:** `/admin/users` · `GET/POST/PUT /users` · ☐ Pass ☐ Fail

### US-242 — وصول المستخدم للعقارات
> كـ SA فقط, أريد ضبط العقارات المسموحة لكل مستخدم، حتى أحدّد النطاق.
- **المسار:** `/admin/user-access` (superAdminGuard) · ☐ Pass ☐ Fail

### US-243 — الصلاحيات
> كـ SA فقط, أريد ضبط صلاحيات كل دور، حتى أتحكّم بالإجراءات.
- **المسار:** `/admin/permissions` · `GET/PUT /role-permissions` · ☐ Pass ☐ Fail

### US-244 — الشاشات
> كـ SA فقط, أريد ضبط الشاشات المتاحة، حتى أخصّص الواجهة.
- **المسار:** `/admin/screens` · ☐ Pass ☐ Fail

### US-245 — إعدادات الموديولات
> كـ SA, أريد تفعيل/تعطيل الموديولات لكل عقار، حتى أخصّص الميزات.
- **المسار:** `/admin/module-settings` · ☐ Pass ☐ Fail

### US-246 — الكيانات القانونية
> كـ SA, أريد إدارة الكيانات القانونية، حتى تُربط بالعقود.
- **المسار:** `/admin/legal-entities` · ☐ Pass ☐ Fail

### US-247 — سجل التدقيق
> كـ SA, أريد عرض سجل العمليات مع فلاتر، حتى أراجع النشاط.
- **المسار:** `/admin/audit-log` · `GET /audit-logs` · pagination server-side · ☐ Pass ☐ Fail

---

# EPIC 26 — التحقق العرضي للواجهة (Cross-cutting UI)

### US-250 — اتساق الدايالوجات
> كل الدايالوجات: هيدر `app-dialog-panel`، زر X واضح، أزرار حفظ/إلغاء أسفل. ☐

### US-251 — توحيد الفلاتر
> كل الفلاتر تستخدم `estate-lov-select` (LOV) دون صناديق مظللة مزدوجة. ☐

### US-252 — Pagination
> القوائم تستخدم `app-table-pager` بحجم 6 حيث طُبّق. ☐

### US-253 — الترجمة (i18n)
> لا تظهر مفاتيح خام (مثل `MAINTENANCE_INVOICES.*`)؛ العربية/الإنجليزية مكتملة. ☐

### US-254 — النطاق (Scope)
> الأدوار المقيّدة (OWNER/ACCOUNTANT) ترى عقاراتها فقط؛ TENANT محصور في `/tenant/*`. ☐

### US-255 — الحماية (Guards)
> الأدوار الممنوعة تُمنع: TENANT من `/admin/*`؛ غير SA من `/admin/permissions|screens|user-access`. ☐

---

# المصفوفة الكاملة: شاشة × دور (Access Matrix)

| المسار | SA | GM | AC | HR | OW | TN | MC/MO | PG | PC |
|--------|----|----|----|----|----|----|-------|----|----|
| `/admin/dashboard` | ✓ | ✓ | ✓ | ± | ✓ | — | ± | ✓ | ± |
| `/admin/properties` | ✓ | ✓ | ± | — | ✓ | — | — | — | — |
| `/admin/units` | ✓ | ✓ | ± | — | ✓ | — | — | — | — |
| `/admin/tenants` | ✓ | ✓ | ✓ | — | ± | — | — | — | — |
| `/admin/owners` | ✓ | ✓ | ± | — | — | — | — | — | — |
| `/admin/contracts/*` | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| `/admin/maintenance` | ✓ | ✓ | ± | — | ± | — | ± | ✓ | — |
| `/admin/ratings` | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| `/admin/contractors` | ✓ | ✓ | ± | — | — | — | — | — | — |
| `/admin/hr/*` | ✓ | ✓ | ± | ✓ | — | — | — | — | ± |
| `/admin/finance/*` | ✓ | ✓ | ✓ | — | ± | — | — | — | — |
| `/admin/reports/*` | ✓ | ✓ | ✓ | — | ± | — | — | — | — |
| `/admin/inventory` | ✓ | ✓ | ± | — | — | — | — | — | — |
| `/admin/accountant-portal/*` | ✓ | ✓ | ✓ | — | ± | — | — | — | — |
| `/admin/owner-portal/*` | ✓ | ✓ | ± | — | ✓ | — | — | — | — |
| `/admin/users` | ✓ | ✓ | ± | — | — | — | — | — | — |
| `/admin/permissions\|screens\|user-access` | ✓ | — | — | — | — | — | — | — | — |
| `/admin/lookups` | ✓ | ± | ± | — | — | — | — | — | — |
| `/admin/audit-log` | ✓ | ± | — | — | — | — | — | — | — |
| `/tenant/*` | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| `/officer/*` | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| `/employee/*` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ |

> **✓** متاح · **±** متاح حسب الصلاحية/الموديول · **—** ممنوع

---

# سيناريو End-to-End كامل (للاختبار الآلي والـ AI)

```
1.  SA: إنشاء عقار + 2 وحدة + مالك (تفعيل البوابة) + شركة صيانة + مستخدم لكل دور
2.  SA: إضافة مستأجر + عقد (مسوّدة)
3.  OW: الموافقة على العقد → CONTRACT_ACTIVATED
4.  AC: تأكيد دفعة إيجار + رفع إيصال → PAYMENT_RECEIVED
5.  TN: إنشاء طلب صيانة → REQUEST_CREATED
6.  MC/MO: تعيين + جدولة → REQUEST_ASSIGNED/SCHEDULED
7.  TN: قبول الموعد → REQUEST_SCHEDULE_ACCEPTED
8.  MO: تقرير الزيارة + إكمال → REQUEST_COMPLETED
9.  TN: تقييم الزيارة (1–4) → REQUEST_RATED → يظهر في /admin/ratings
10. SA: عقد صيانة ACTIVE → موافقة المالك → توليد فواتير شهرية
11. AC: دفع قسط + رفع إيصال → MAINTENANCE_CONTRACT_PAYMENT_RECEIVED (للمالك والشركة)
12. AC: «عرض الإيصال» من جدول الأقساط
13. TN: شكوى → ردّ الإدارة → إغلاق → تقييم الشكوى
14. HR: موظف + حضور + مسير رواتب → اعتماد → دفع → PAYSLIP_AVAILABLE
15. AC: مصروف + ميزانية → تقرير الميزانية مقابل الفعلي
16. SA: تشغيل schedulers يدوياً والتحقق من الإشعارات الدورية
```

---

# ملحق الأتمتة — خطوات API لكل Story (AI / Automation)

> **الأساس (Base URL):** `http://localhost:8081/api/v1`  
> **المصادقة:** كل الطلبات (عدا `/auth/login`) تحتاج Header: `Authorization: Bearer <token>`  
> **التحقق العام:** الاستجابة بصيغة `ApiResponse` — تحقق من `success=true` و`data` غير فارغة، وكود الحالة المتوقع.

### A0 — إعداد المصادقة (Setup قبل كل سيناريو)

```
POST /auth/login
Body: { "email": "admin@propmgmt.com", "password": "12345" }
→ 200 ; احفظ data.token  ⇒  TOKEN_SA
كرّر لكل دور لاستخراج: TOKEN_GM, TOKEN_AC, TOKEN_HR, TOKEN_OW, TOKEN_TN, TOKEN_MC, TOKEN_MO
```

---

## EPIC 01 — Auth & Profile

| US | Method & Path | Body / Params | تحقق (Assertions) |
|----|----------------|----------------|--------------------|
| US-001 | `POST /auth/login` | `{email,password}` | 200, `data.token` موجود, `data.role` صحيح |
| US-001 | `POST /auth/login` (خاطئ) | كلمة مرور خطأ | 401/400, `success=false` |
| US-002 | `POST /auth/change-password` | `{oldPassword,newPassword}` | 200 ; دخول جديد بالجديدة ينجح |
| US-003 | `GET /users/me` ثم `PUT /users/{id}` | تعديل الاسم/الهاتف | 200 ; القيمة الجديدة تُعاد |

---

## EPIC 02 — Dashboard

| US | Method & Path | تحقق |
|----|----------------|------|
| US-011 | `GET /dashboard/stats` | 200 ; أعداد العقارات/الوحدات/العقود = الواقع |
| US-011 | `GET /dashboard/requests-by-status` | 200 ; مصفوفة حالات |
| US-011 | `GET /dashboard/monthly-trend` | 200 |
| US-011 | `GET /dashboard/recent-activity` | 200 ; مرتبة تنازلياً بالوقت |

---

## EPIC 03/04/05 — Properties / Units / Owners

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-020 | `GET /properties` | `?page=0&size=6` | 200 ; pagination |
| US-021 | `POST /properties` | `{nameAr,nameEn,ownerId,...}` | 201 ; يظهر في GET ; إشعار `PROPERTY_LINKED_TO_OWNER` للمالك |
| US-022 | `PUT /properties/{id}` / `DELETE /properties/{id}` | — | 200 ; حذف عقار بوحدات → 409 `PROPERTY_HAS_UNITS` |
| US-023 | `POST /properties/{propertyId}/attachments` | multipart file | 201 ; `GET .../{attachmentId}/view` 200 |
| US-030 | `GET /units` | `?propertyId=` | 200 |
| US-031 | `POST /units` | `{propertyId,floorId,unitNumber,rentAmount}` | 201 ; تجاوز السعة → 409 `FLOOR_CAPACITY_REACHED` ; إشعار `UNIT_ADDED_TO_OWNER_PROPERTY` |
| US-032 | `DELETE /units/{id}` | — | حذف وحدة مؤجرة → 409 `UNIT_IS_RENTED` |
| US-040 | `GET /owners` | `?page=0&size=6` | 200 |
| US-041 | `POST /owners` | `{name,portalAccess,attachments...}` | 201 ; عند `portalAccess` يُنشأ مستخدم OWNER |

---

## EPIC 06 — Tenants

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-050 | `GET /tenants` | `?page&size&propertyId` | 200 |
| US-051 | `POST /tenants` (onboarding) | `{personal, civilId, propertyId, unitId, startDate, endDate, monthlyRent, paymentFrequency, ...}` | 201 ; يُنشأ tenant+contract ; صور مطلوبة (بدونها 400) |
| US-052 | `PUT /tenants/{id}` | تعديل | 200 |

---

## EPIC 07/08 — Contracts & Owner Approval

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-061 | `GET /contracts` | `?status&type&page&size` | 200 |
| US-062 | `GET /contracts/{id}` + `GET /contracts/{contractId}/payment-schedule` | — | 200 ; الجدول والرسوم |
| US-063 | `POST /contracts/{id}/renewals` | `{months<=12, newRent}` | 201 ; مدة>12 → 400 `CONTRACT_DURATION_MAX_12` |
| US-064 | `PATCH /contracts/{id}/terminate` | `{reason}` | 200 ; سبب فارغ → 400 ; إشعار `CONTRACT_TERMINATION_REQUESTED` |
| US-065 | `GET/POST/PUT /contract-templates` | — | 200/201 |
| US-066 | `POST /contracts/{contractId}/annexes` | `{title,body}` | 201 |
| US-067 | `GET/POST /contracts/{contractId}/inspections` | بنود+صور | 200/201 |
| US-070 | `GET /owner-portal/pending-approvals` | (TOKEN_OW) | 200 ; يشمل DRAFT+PENDING |
| US-071 | `POST /owner-portal/contracts/{contractId}/decision` | `{decision:"APPROVE"}` | 200 ; حالة العقد ACTIVE ; إشعار `CONTRACT_ACTIVATED` |
| US-071 | نفس الـ endpoint | `{decision:"REJECT",reason}` | 200 ; إشعار `TENANT_LEASE_REJECTED_BY_OWNER` ; سبب فارغ→400 |

---

## EPIC 09/10 — Maintenance & Officer

> **ملاحظة مهمة:** قاعدة الكنترولر هي `/maintenance/requests` (وليس `/maintenance-requests`).

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-080 | `GET /maintenance/requests` | `?status&propertyId` | 200 |
| US-081 | `POST /maintenance/requests` | `{unitId,categoryId,description,priority}` | 201 ; إشعار `REQUEST_CREATED` |
| US-082 | `PATCH /maintenance/requests/{id}/assign` | `{officerId}` | 200 ; `REQUEST_ASSIGNED` |
| US-082 | `PATCH /maintenance/requests/{id}/schedule` | `{scheduledDate}` | 200 ; `REQUEST_SCHEDULED` |
| US-082 | `PATCH /maintenance/requests/{id}/accept-schedule` (TOKEN_TN) | — | 200 ; `REQUEST_SCHEDULE_ACCEPTED` |
| US-082 | `PATCH /maintenance/requests/{id}/reject-schedule` (TOKEN_TN) | `{reason}` | 200 ; `REQUEST_SCHEDULE_REJECTED` |
| US-083 | `POST /maintenance/requests/{id}/visit-report` (TOKEN_MO) | `{items,outcome}` | 201 ; الحالة COMPLETED ; `REQUEST_COMPLETED` |
| US-084 | `POST /maintenance/requests/{id}/rating` (TOKEN_TN) | `{stars:1..4,comment}` | 201 ; تكرار→409 ; `REQUEST_RATED` |
| US-084 | `GET /maintenance/requests/{id}/rating` | — | 200 ; التقييم محفوظ |
| US-092 | `GET /maintenance/requests/company-queue` (TOKEN_MC) | — | 200 |
| US-091 | `GET /maintenance/requests/officer/{officerId}` (TOKEN_MO) | — | 200 |
| US-094 | `POST /maintenance-invoices` (TOKEN_MC) | `{propertyId,amount,period}` | 201 ; حالة PENDING ; `GET /maintenance-invoices/my` يظهرها |

---

## EPIC 11/12 — Contractors & Maintenance Contract Invoices

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-100 | `GET /contractor-companies` | — | 200 |
| US-101 | `POST /contractor-companies` | `{name, createUser:true,...}` | 201 ; مستخدم MAINTENANCE_COMPANY مربوط بـ companyId |
| US-111 | `POST /maintenance-contracts/{contractId}/generate-monthly-invoices` | — | 200 ; فاتورة/شهر ; لا تكرار |
| US-112 | `GET /maintenance-invoices` (contract invoices) | — | 200 ; قائمة فواتير العقود |
| US-112 | `GET /accountant-portal/maintenance-invoices` | — | 200 ; فواتير الشركات |
| US-113 | `POST /maintenance-invoices/{id}/payment-plan` | `{mode:"FULL"\|"SCHEDULED", receiptFile, installments[]}` | 200 ; بدون إيصال→400 ; إشعار `MAINTENANCE_CONTRACT_PAYMENT_RECEIVED` للمالك+الشركة |
| US-114 | `PATCH /maintenance-invoices/{invoiceId}/payments/{paymentId}/mark-paid` | `{receiptFile}` | 200 ; القسط PAID ; زر «عرض الإيصال» يفتح الملف |
| US-113 | `PATCH /maintenance-invoices/{id}/mark-paid` | دفع كامل مباشر | 200 |
| US-115 | `POST /dev/schedulers/maintenance-contract-payment-due` (TOKEN_SA) | — | 200 ; `..._DUE_SOON/_DUE_TODAY` للمحاسب |

---

## EPIC 13 — Ratings

| US | Method & Path | تحقق |
|----|----------------|------|
| US-120 | `GET /dashboard/ratings-details?page=0&size=6` | 200 ; KPIs + قائمة |
| US-120 | `GET /dashboard/complaint-ratings-details` | 200 |
| US-120 | (TOKEN_OW) نفس الـ endpoints | النتائج مقصورة على عقارات المالك |

---

## EPIC 14 — Inventory

| US | Method & Path | تحقق |
|----|----------------|------|
| US-130 | `GET /inventory/items` , `GET /inventory/transactions` | 200 |
| US-130 | `POST /inventory/items` + `POST /inventory/transactions` | 201 ; الكمية تتحدث |
| US-131 | `POST /dev/schedulers/inventory-low-stock` | 200 ; `INVENTORY_LOW_STOCK` |

---

## EPIC 15 — HR

| US | Method & Path | Body | تحقق |
|----|----------------|------|------|
| US-140 | `GET/POST /hr/employees` | بيانات الموظف | 200/201 |
| US-141 | `GET/POST /hr/attendance` | — | 200/201 |
| US-142 | `POST /hr/leaves` + `PATCH /hr/leaves/{id}/approve` | — | 201/200 ; `LEAVE_REQUEST_SUBMITTED/APPROVED` |
| US-143 | `POST /hr/deductions` ; `PUT /hr/deductions/{id}` ; `DELETE /hr/deductions/{id}` | — | 201/200 ; تعديل/حذف لغير DRAFT → 400 ; `HR_DEDUCTION_SENT_TO_ACCOUNTANT` بعد send |
| US-144 | `POST /hr/payroll` → `PATCH .../submit` → `.../approve` → `POST .../mark-paid` | — | 200 لكل مرحلة ; إشعارات الحالات ; `PAYSLIP_AVAILABLE` بعد PAID |
| US-145 | `POST /hr/salary-advances` (+approve) | — | 201 ; `SALARY_ADVANCE_REQUESTED/APPROVED` |

---

## EPIC 16/17 — Finance & Reports

| US | Method & Path | تحقق |
|----|----------------|------|
| US-151 | `GET/POST /finance/expenses` + `PATCH .../approve` | 200/201 |
| US-152 | `GET/POST /finance/other-revenues` | 200/201 |
| US-153 | `GET /finance/budgets?propertyId&year` + `GET /reports/budget-vs-actual` | 200 ; الفعلي = مجموع المصروفات (>0 عند وجود مصروفات) |
| US-153 | `POST /dev/schedulers/budget-threshold` | 200 ; `BUDGET_THRESHOLD_EXCEEDED` |
| US-154 | `GET/POST /finance/financial-periods` | 200/201 |
| US-155 | `POST /finance/owner-statements` | 201 ; `OWNER_STATEMENT` للمالك |
| US-161..165 | `GET /reports/occupancy` `/contract-expiry` `/maintenance` `/pnl` `/cashflow` `/owner-statement` | 200 لكل تقرير |

---

## EPIC 18 — Vacancies

| US | Method & Path | تحقق |
|----|----------------|------|
| US-170 | `GET /vacancies` | 200 |
| US-171 | `GET /vacancies/{id}/inquiries` | 200 |

---

## EPIC 19/20/21/22 — Portals

| US | Method & Path | تحقق |
|----|----------------|------|
| US-180 | `POST /payment-schedule/{scheduleId}/mark-paid` (TOKEN_AC) | 200 ; الحالة مدفوع ; `PAYMENT_RECEIVED` |
| US-181 | `GET /accountant-portal/...renewal-requests` + `POST /accountant-portal/renewal-requests/{requestId}/process` | 200 ; `ACCOUNTANT_CONTRACT_RENEWAL_APPROVED/REJECTED` |
| US-180 | `PATCH /accountant-portal/receipts/{id}/review` | 200 ; مراجعة إيصال المستأجر |
| US-190 | `GET /owner-portal/...` (TOKEN_OW) | 200 ; scope على عقارات المالك |
| US-202 | `GET /contracts/{contractId}/payment-schedule` (TOKEN_TN) + رفع إيصال | 200 |
| US-203 | `POST /tenant-portal/...renewal` (TOKEN_TN) | 201 ; `TENANT_CONTRACT_RENEWAL_REQUESTED` |
| US-204 | `GET /maintenance/requests/tenant/{tenantId}` (TOKEN_TN) | 200 |
| US-205 | `POST /complaints` + `POST /complaints/{id}/rating` (TOKEN_TN) | 201 ; `COMPLAINT_SUBMITTED` ; تقييم بعد RESOLVED/CLOSED |

---

## EPIC 23/24/25 — Complaints / Notifications / Settings

| US | Method & Path | تحقق |
|----|----------------|------|
| US-220 | `GET /complaints` | 200 ; عمود العقار-الوحدة |
| US-230 | `GET /notifications` + `PATCH /notifications/{id}/read` | 200 ; العداد ينقص |
| US-231 | `POST /dev/schedulers/{name}` (TOKEN_SA) | 200 ; الإشعار الدوري يصل (`RENT_DUE`,`RENT_OVERDUE`,`CONTRACT_EXPIRING`,...) |
| US-240 | `GET/POST /lookups` | 200/201 |
| US-241 | `GET/POST/PUT /users` | 200/201 |
| US-243 | `GET/PUT /role-permissions` (TOKEN_SA فقط) | 200 ; غير SA → 403 |
| US-244 | `GET/PUT /screen-settings` (TOKEN_SA) | 200 |
| US-245 | `GET/PUT /property-modules` | 200 |
| US-246 | `GET/POST /legal-entities` | 200/201 |
| US-247 | `GET /audit-logs?page&size` | 200 ; pagination server-side |

---

## تحقق الحماية (Negative / Security)

| السيناريو | الطلب | المتوقع |
|-----------|------|---------|
| مستأجر يدخل شاشة إدارة | `GET /properties` (TOKEN_TN) | 403 |
| غير SA يعدّل الصلاحيات | `PUT /role-permissions` (TOKEN_GM) | 403 |
| مالك يرى عقار غيره | `GET /dashboard/stats` (TOKEN_OW) | بيانات عقاراته فقط |
| طلب بدون توكن | أي endpoint محمي | 401 |
| تقييم زيارة غير مكتملة | `POST /maintenance/requests/{id}/rating` | 400/409 |

---

> **أدوات QA إضافية:** `/dev/qa/*` لتهيئة بيانات اختبار، و`/dev/schedulers/*` لتشغيل الجداول الزمنية يدوياً (متاحة للـ SUPER_ADMIN في بيئة التطوير).

---

# سجل تنفيذ الاختبار

| US-ID | الدور | الشاشة | النتيجة | ملاحظة | المختبِر | التاريخ |
|-------|------|--------|---------|--------|----------|---------|
| | | | ☐ Pass ☐ Fail | | | |

---

# ملخّص شامل لكل دور (Role Summary Cards)

> جدول مختصر لكل دور: **المهام · الشاشات · الصلاحيات · الإشعارات · الحالة**.  
> عمود الحالة: **✅ شغال** · **⚠️ شغال مع ملاحظة** · **🚧 قيد التطوير/يحتاج تأكيد**.

---

## 1) SUPER_ADMIN (SA) — المدير الأعلى

| البند | التفاصيل |
|-------|----------|
| **المهام** | تحكّم كامل بالنظام: إنشاء العقارات/الوحدات/الملاك/المستأجرين/العقود، إدارة المستخدمين والصلاحيات والشاشات والموديولات، تشغيل الـ schedulers، كل عمليات المالية وHR والصيانة. |
| **الشاشات** | كل المسارات `/admin/*` + بوابات المحاسب/المالك + يقدر يدخل أي شاشة (يتجاوز كل الـ guards). |
| **الصلاحيات** | بدون قيود — يتجاوز `permissionGuard` و`moduleGuard` و`scope`. الوحيد الذي يدخل `/admin/permissions`, `/admin/screens`, `/admin/user-access`. |
| **الإشعارات** | يستقبل كل إشعارات الإدارة: `REQUEST_*`, `CONTRACT_*`, `PAYMENT_RECEIVED`, `MAINTENANCE_CONTRACT_PAYMENT_RECEIVED`, `OWNER_STATEMENT`, `BUDGET_THRESHOLD_EXCEEDED`, `REQUEST_RATED`, `COMPLAINT_SUBMITTED`, ... |
| **يبان له** | كل البيانات لكل العقارات بلا scope. |
| **الحالة** | ✅ شغال |

---

## 2) GENERAL_MANAGER (GM) — المدير العام

| البند | التفاصيل |
|-------|----------|
| **المهام** | إشراف عام: العقارات، الوحدات، العقود، الصيانة، المالية، HR، التقارير، الموافقات. لا يدير الصلاحيات/الشاشات/وصول العقارات. |
| **الشاشات** | معظم `/admin/*` (dashboard, properties, units, tenants, owners, contracts, maintenance, finance, hr, reports, ratings, contractors, inventory). |
| **الصلاحيات** | حسب `role_permissions` + الموديولات المفعّلة. ممنوع: `/admin/permissions\|screens\|user-access`. |
| **الإشعارات** | إدارية مثل SA عدا ما يخص النظام/الأمان: `REQUEST_*`, `CONTRACT_*`, `PAYROLL_*`, `OWNER_STATEMENT`, `REQUEST_RATED`. |
| **يبان له** | كل العقارات (بلا scope مالك). |
| **الحالة** | ✅ شغال |

---

## 3) ACCOUNTANT (AC) — المحاسب

| البند | التفاصيل |
|-------|----------|
| **المهام** | تأكيد دفعات الإيجار ورفع الإيصالات، دفع فواتير الصيانة (كامل/أقساط)، المصروفات والإيرادات والميزانية والفترات المالية وكشوف الملاك، اعتماد استقطاعات HR، طلبات التجديد. |
| **الشاشات** | `/admin/accountant-portal/*` (rent-confirmation, renewal-requests, maintenance-invoices), `/admin/finance/*`, `/admin/reports/*`, `/admin/tenants`, `/admin/contracts/*` (حسب الصلاحية). |
| **الصلاحيات** | finance + accountant-portal؛ scope على العقارات المسموح بها عبر `user_property_access`. |
| **الإشعارات** | `PAYMENT_RECEIVED`, `RENT_DUE`, `RENT_OVERDUE`, `MAINTENANCE_CONTRACT_PAYMENT_*` (DUE_SOON/DUE_TODAY/RECEIVED), `HR_DEDUCTION_SENT_TO_ACCOUNTANT`, `ACCOUNTANT_CONTRACT_RENEWAL_*`, `ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED`, `OWNER_STATEMENT`. |
| **يبان له** | بيانات مالية للعقارات ضمن نطاقه. |
| **الحالة** | ✅ شغال |

---

## 4) HR_OFFICER (HR) — موظف الموارد البشرية

| البند | التفاصيل |
|-------|----------|
| **المهام** | إدارة الموظفين والأقسام، الحضور، الإجازات، مسير الرواتب (إنشاء/إرسال)، الاستقطاعات، السلف، المكافآت. |
| **الشاشات** | `/admin/hr/*` (employees, attendance, leaves, payroll, deductions). |
| **الصلاحيات** | موديول hr فقط؛ لا وصول للمالية العامة أو العقارات. |
| **الإشعارات** | `PAYROLL_GENERATED/SUBMITTED/APPROVED/REJECTED/MARKED_PAID`, `LEAVE_REQUEST_*`, `LEAVE_BALANCE_LOW`, `SALARY_ADVANCE_*`, `HR_DEDUCTION_APPROVED/REJECTED`. |
| **يبان له** | بيانات الموظفين والرواتب فقط. |
| **الحالة** | ✅ شغال |

---

## 5) OWNER (OW) — المالك

| البند | التفاصيل |
|-------|----------|
| **المهام** | الموافقة/الرفض/تعديل عقود عقاراته، متابعة كشوف الحساب، رؤية الإيرادات والصيانة والتقييمات لعقاراته فقط. |
| **الشاشات** | `/admin/owner-portal/*` (dashboard, properties, statements, contract-approvals), `/admin/ratings` (مقصور), أجزاء من `/admin/contracts` و`/admin/finance` (للقراءة حسب الموديول). |
| **الصلاحيات** | **scope صارم**: يرى فقط العقارات المرتبطة به عبر `property_owners` / `user_property_access`. |
| **الإشعارات** | `CONTRACT_AWAITING_OWNER_REVIEW`, `TENANT_DRAFT_LEASE_PENDING_OWNER`, `MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW`, `MAINTENANCE_CONTRACT_PAYMENT_RECEIVED`, `PROPERTY_LINKED_TO_OWNER`, `UNIT_ADDED_TO_OWNER_PROPERTY`, `TENANT_REGISTERED_ON_OWNER_PROPERTY`, `OWNER_STATEMENT`, `REQUEST_RATED`. |
| **يبان له** | عقاراته ووحداتها ومستأجريها وعقودها وتقييماتها فقط. |
| **الحالة** | ✅ شغال |

---

## 6) TENANT (TN) — المستأجر

| البند | التفاصيل |
|-------|----------|
| **المهام** | رؤية وحدته وعقده، رفع إيصالات الإيجار، طلب تجديد/إنهاء، إنشاء طلبات صيانة وقبول/رفض مواعيدها وتقييمها، فتح شكاوى وتقييمها. |
| **الشاشات** | `/tenant/*` فقط (my-unit, my-contracts, rent-receipts, contract-request, requests, new-request, complaints, notifications, profile). |
| **الصلاحيات** | محصور تماماً في `/tenant/*` عبر `tenantGuard`؛ ممنوع من كل `/admin/*`. |
| **الإشعارات** | `REQUEST_SCHEDULED`, `REQUEST_COMPLETED`, `RENT_DUE`, `RENT_OVERDUE`, `RENT_GRACE_PERIOD_ENDING`, `CONTRACT_ACTIVATED`, `CONTRACT_EXPIRING`, `TENANT_LEASE_REJECTED_BY_OWNER`, `TENANT_LEASE_AMENDED_BY_OWNER`, `COMPLAINT_REPLY_RECEIVED`, `CONTRACT_RENEWAL_APPROVED/REJECTED`. |
| **يبان له** | بياناته الشخصية وعقده ووحدته فقط. |
| **الحالة** | ✅ شغال |

---

## 7) MAINTENANCE_COMPANY (MC) — شركة الصيانة

| البند | التفاصيل |
|-------|----------|
| **المهام** | استقبال طلبات الصيانة لعقاراتها، توزيعها على فنييها، إدارة موظفيها، تقديم الفواتير الشهرية. |
| **الشاشات** | `/officer/*` (company-queue, my-staff, requests, invoices, schedule, notifications, profile). |
| **الصلاحيات** | محصور في `/officer/*` عبر `officerGuard`؛ يتطلب `contractorCompanyId`. |
| **الإشعارات** | `REQUEST_CREATED`, `REQUEST_ASSIGNED`, `MAINTENANCE_PROVIDER_ASSIGNED/UNASSIGNED`, `MAINTENANCE_CONTRACT_PAYMENT_RECEIVED`, `MAINTENANCE_CONTRACT_APPROVED/REJECTED`. |
| **يبان له** | طلبات وفنيو وفواتير شركته فقط. |
| **الحالة** | ✅ شغال |

---

## 8) MAINTENANCE_OFFICER (MO) — فني الصيانة (داخلي/شركة)

| البند | التفاصيل |
|-------|----------|
| **المهام** | تنفيذ الطلبات المعيّنة له، جدولة/بدء الزيارة، رفع تقرير الزيارة والبنود، إغلاق الطلب. |
| **الشاشات** | `/officer/schedule`, `/officer/my-requests`, `/officer/requests/:id`, `/officer/requests/:id/visit-report`, notifications, profile. |
| **الصلاحيات** | موديول schedule (start/submit)؛ يرى طلباته المعيّنة فقط. النوعان: INTERNAL و COMPANY. |
| **الإشعارات** | `REQUEST_ASSIGNED`, `REQUEST_SCHEDULE_ACCEPTED/REJECTED`, `MAINTENANCE_REQUEST_OVERDUE`. |
| **يبان له** | طلباته وجدوله فقط. |
| **الحالة** | ✅ شغال |

---

## 9) PROPERTY_GUARD (PG) — حارس العقار

| البند | التفاصيل |
|-------|----------|
| **المهام** | متابعة/إنشاء طلبات صيانة للعقار المخصص، رؤية كشوف رواتبه. |
| **الشاشات** | `/admin/maintenance` (محدود حسب الصلاحية), `/employee/*` (my-payslips, notifications, profile). |
| **الصلاحيات** | موديول maintenance (view/create) حسب الإعداد؛ بوابة الموظف. |
| **الإشعارات** | `PAYSLIP_AVAILABLE`, `MAINTENANCE_UPDATE`, `GENERAL`. |
| **يبان له** | طلبات صيانة عقاره + كشوف رواتبه. |
| **الحالة** | ⚠️ شغال — الوصول لشاشات الصيانة يعتمد على `permissionGuard`؛ تأكّد من تفعيل صلاحية maintenance للدور. |

---

## 10) PROCEDURES_CLERK (PC) — كاتب الإجراءات

| البند | التفاصيل |
|-------|----------|
| **المهام** | مهام إدارية مساندة حسب الصلاحية (عقود/مستأجرين/صيانة)، رؤية كشوف رواتبه. |
| **الشاشات** | شاشات `/admin/*` المسموح بها عبر الصلاحيات + `/employee/*`. |
| **الصلاحيات** | تُضبط بالكامل من `/admin/permissions` (مرن حسب الحاجة). |
| **الإشعارات** | `PAYSLIP_AVAILABLE`, `GENERAL`, وما يخص مهامه المسندة. |
| **يبان له** | حسب الصلاحيات الممنوحة. |
| **الحالة** | ⚠️ شغال — يعتمد كلياً على ضبط الصلاحيات؛ بدون منح صلاحيات لن يرى شاشات إدارة. |

---

## جدول مقارنة سريع (كل الأدوار في صف واحد)

| الدور | أهم مهمة | البوابة الرئيسية | نطاق البيانات | الحالة |
|-------|---------|------------------|----------------|--------|
| SUPER_ADMIN | تحكّم كامل | `/admin/*` | الكل | ✅ |
| GENERAL_MANAGER | إشراف عام | `/admin/*` | الكل | ✅ |
| ACCOUNTANT | المالية والمدفوعات | `/admin/accountant-portal/*` | نطاق العقارات | ✅ |
| HR_OFFICER | الرواتب والموظفون | `/admin/hr/*` | بيانات HR | ✅ |
| OWNER | موافقة العقود | `/admin/owner-portal/*` | عقاراته فقط | ✅ |
| TENANT | عقده وطلباته | `/tenant/*` | بياناته فقط | ✅ |
| MAINTENANCE_COMPANY | توزيع الطلبات | `/officer/*` | شركته فقط | ✅ |
| MAINTENANCE_OFFICER | تنفيذ الزيارات | `/officer/*` | طلباته فقط | ✅ |
| PROPERTY_GUARD | صيانة + كشوفه | `/employee/*` | محدود | ⚠️ حسب الصلاحية |
| PROCEDURES_CLERK | مهام مساندة | `/admin/*` + `/employee/*` | حسب الصلاحية | ⚠️ حسب الصلاحية |

> **ملاحظة عامة على الحالة:** الوظائف الأساسية لكل دور مبنية وعاملة. عمود «⚠️» يعني أن ظهور الشاشات يتوقّف على ضبط `role_permissions` و`property_module_settings` من شاشات الإعدادات — وليس عطلاً في الكود. أكّد التشغيل الفعلي أثناء المشي على سجل الاختبار أعلاه.

---

# سجل التعديلات (Changelog)

> تعديلات تمّت على النظام وتنعكس في هذه الوثيقة.

### 2026-05-31

| # | الشاشة / المسار | التعديل | الحالة |
|---|------------------|---------|--------|
| 1 | الرواتب `/admin/hr/payroll` | إضافة **pagination 5 صفوف** للقائمة + عمود # + pager؛ ترجمة حالات المسير (SUBMITTED/APPROVED/REJECTED/PAID) مع fallback إلى `HR.STATUS.*` لإصلاح ظهور `REJECTED` خام. | ✅ |
| 2 | الاستقطاعات `/admin/hr/deductions` | إجراءات **عرض/تعديل/حذف** كأيقونات ملوّنة مع tooltip زي شاشة المستأجرين؛ استبدال prompt بـ **دايالوج** للإضافة/التعديل؛ إضافة endpoints `PUT` و`DELETE` بالباك (DRAFT فقط). | ✅ |
| 3 | الشكاوى `/admin/contracts/complaints` | تحويل زر «التفاصيل» إلى **أيقونة ملوّنة بـ tooltip**، وجعل زر **«إنشاء طلب صيانة»** على نفس السطر مع باقي الأزرار دون التفاف. | ✅ |
| 4 | الترجمة (i18n) | إضافة مفاتيح `HR.STATUS.GENERATED/SUBMITTED/PAID` و`HR.EDIT_DEDUCTION` و`HR.DEDUCTION_DETAIL_TITLE` و`HR.DEDUCTION_DATE` و`HR.REVIEW_NOTE` و`HR.DEDUCTION_UPDATED/DELETED` (عربي/إنجليزي). | ✅ |

| 5 | لوحة التقييمات `/admin/ratings` | إصلاح **500** على `GET /dashboard/ratings-details`: نوع `requestStatus` في `RatingDashboardItemResponse` أصبح `RequestStatus` بدل `String` في JPQL constructor. | ✅ |

---

*نهاية الوثيقة — حدّث عمود النتيجة أثناء المشي شاشة شاشة لكل دور.*
