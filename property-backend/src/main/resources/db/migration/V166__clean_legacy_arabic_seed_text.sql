UPDATE notification_templates SET
    title_ar = 'تذكير بسداد الإيجار',
    body_ar = 'عزيزي {{tenant_name}}، يوجد مبلغ إيجار {{amount}} {{currency}} مستحق بتاريخ {{due_date}}'
WHERE template_code = 'RENT_DUE_3_DAYS';

UPDATE notification_templates SET
    title_ar = 'دفعة إيجار متأخرة',
    body_ar = 'عزيزي {{tenant_name}}، دفعة الإيجار {{amount}} {{currency}} متأخرة منذ {{days_overdue}} يوم'
WHERE template_code = 'RENT_OVERDUE';

UPDATE notification_templates SET
    title_ar = 'قرب انتهاء العقد',
    body_ar = 'عزيزي {{tenant_name}}، عقد الوحدة {{unit_number}} سينتهي خلال 30 يوم بتاريخ {{end_date}}'
WHERE template_code = 'CONTRACT_EXPIRY_30';

UPDATE notification_templates SET
    title_ar = 'العقد ينتهي خلال أسبوع',
    body_ar = 'عزيزي {{tenant_name}}، عقدك ينتهي بتاريخ {{end_date}}. يرجى التواصل مع الإدارة'
WHERE template_code = 'CONTRACT_EXPIRY_7';

UPDATE notification_templates SET
    title_ar = 'تم تفعيل العقد',
    body_ar = 'مرحباً {{tenant_name}}، تم تفعيل عقد الوحدة {{unit_number}} بنجاح'
WHERE template_code = 'CONTRACT_ACTIVATED';

UPDATE notification_templates SET
    title_ar = 'تم جدولة الصيانة',
    body_ar = 'تم جدولة طلب الصيانة بتاريخ {{date}} من {{time_from}} إلى {{time_to}}'
WHERE template_code = 'MAINTENANCE_SCHEDULED';

UPDATE notification_templates SET
    title_ar = 'تم إكمال الصيانة',
    body_ar = 'تم إكمال طلب الصيانة رقم {{request_number}} بنجاح'
WHERE template_code = 'MAINTENANCE_COMPLETED';

UPDATE notification_templates SET
    title_ar = 'تم استلام الدفعة',
    body_ar = 'تم استلام دفعة بقيمة {{amount}} {{currency}} بتاريخ {{date}}. رقم الإيصال: {{receipt_no}}'
WHERE template_code = 'PAYMENT_RECEIVED';

UPDATE expense_categories SET category_name_ar = 'فاتورة كهرباء مشتركة' WHERE category_code = 'UTIL-ELEC';
UPDATE expense_categories SET category_name_ar = 'فاتورة مياه مشتركة' WHERE category_code = 'UTIL-WATER';
UPDATE expense_categories SET category_name_ar = 'فاتورة غاز' WHERE category_code = 'UTIL-GAS';
UPDATE expense_categories SET category_name_ar = 'فاتورة إنترنت' WHERE category_code = 'UTIL-INTERNET';
UPDATE expense_categories SET category_name_ar = 'مستلزمات تنظيف' WHERE category_code = 'CLEAN-SUPPLY';
UPDATE expense_categories SET category_name_ar = 'خدمة تنظيف خارجية' WHERE category_code = 'CLEAN-SERVICE';
UPDATE expense_categories SET category_name_ar = 'معدات تنظيف' WHERE category_code = 'CLEAN-EQUIP';
UPDATE expense_categories SET category_name_ar = 'قطع غيار وأدوات' WHERE category_code = 'MAINT-SPARE';
UPDATE expense_categories SET category_name_ar = 'عمالة صيانة خارجية' WHERE category_code = 'MAINT-LABOR';
UPDATE expense_categories SET category_name_ar = 'صيانة المصعد' WHERE category_code = 'MAINT-ELEV';
UPDATE expense_categories SET category_name_ar = 'صيانة نظام مكافحة الحريق' WHERE category_code = 'MAINT-FIRE';
UPDATE expense_categories SET category_name_ar = 'صيانة التكييف المركزي' WHERE category_code = 'MAINT-AC';
UPDATE expense_categories SET category_name_ar = 'مستلزمات مكتبية' WHERE category_code = 'ADMIN-OFFICE';
UPDATE expense_categories SET category_name_ar = 'طباعة وقرطاسية' WHERE category_code = 'ADMIN-PRINT';
UPDATE expense_categories SET category_name_ar = 'رسوم قانونية وتوثيق' WHERE category_code = 'ADMIN-LEGAL';
UPDATE expense_categories SET category_name_ar = 'تأمين المبنى' WHERE category_code = 'ADMIN-INSUR';
UPDATE expense_categories SET category_name_ar = 'رخص وتجديدات حكومية' WHERE category_code = 'ADMIN-LICENSE';
UPDATE expense_categories SET category_name_ar = 'رواتب الموظفين' WHERE category_code = 'PAY-SALARY';
UPDATE expense_categories SET category_name_ar = 'مكافآت الموظفين' WHERE category_code = 'PAY-BONUS';
UPDATE expense_categories SET category_name_ar = 'ساعات إضافية' WHERE category_code = 'PAY-OVERTIME';
UPDATE expense_categories SET category_name_ar = 'تجديدات وتحسينات' WHERE category_code = 'CAP-RENOV';
UPDATE expense_categories SET category_name_ar = 'شراء معدات' WHERE category_code = 'CAP-EQUIP';

UPDATE revenue_categories SET category_name_ar = 'الإيجارات' WHERE category_code = 'REV-RENT';
UPDATE revenue_categories SET category_name_ar = 'التأمينات المستردة' WHERE category_code = 'REV-DEPOSIT';
UPDATE revenue_categories SET category_name_ar = 'غرامات تأخير السداد' WHERE category_code = 'REV-FINE';
UPDATE revenue_categories SET category_name_ar = 'رسوم خدمات' WHERE category_code = 'REV-SERVICE';
UPDATE revenue_categories SET category_name_ar = 'رسوم مواقف' WHERE category_code = 'REV-PARKING';
UPDATE revenue_categories SET category_name_ar = 'إيراد تجاري' WHERE category_code = 'REV-COMMERCIAL';
UPDATE revenue_categories SET category_name_ar = 'إيرادات أخرى' WHERE category_code = 'REV-OTHER';
