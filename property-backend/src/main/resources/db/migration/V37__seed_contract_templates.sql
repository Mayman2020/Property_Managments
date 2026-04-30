INSERT INTO contract_templates (template_name, template_type, content, variables, is_active) VALUES
(
    'عقد إيجار سكني - نموذج قياسي',
    'RESIDENTIAL',
    '<h2>عقد إيجار سكني</h2>
<p>تم إبرام هذا العقد بين كل من:</p>
<p><strong>المؤجر:</strong> {{owner_name}}</p>
<p><strong>المستأجر:</strong> {{tenant_name}} - رقم الهوية: {{national_id}}</p>
<p><strong>العقار:</strong> {{property_name}} - الوحدة رقم: {{unit_number}}</p>
<p><strong>مدة الإيجار:</strong> من {{start_date}} إلى {{end_date}}</p>
<p><strong>القيمة الإيجارية:</strong> {{monthly_rent}} {{currency}} شهرياً</p>
<p><strong>مبلغ التأمين:</strong> {{security_deposit}} {{currency}}</p>
<h3>الشروط والأحكام</h3>
<p>1. يلتزم المستأجر بسداد الإيجار في اليوم المحدد من كل شهر.</p>
<p>2. لا يحق للمستأجر التنازل عن العقد أو إعادة التأجير دون موافقة المؤجر.</p>
<p>3. يلتزم المستأجر بالمحافظة على العقار وإعادته بالحالة التي استلمه بها.</p>
<p>4. يحق للمؤجر فسخ العقد في حالة الإخلال بأي من بنوده.</p>',
    '{"owner_name":"","tenant_name":"","national_id":"","property_name":"","unit_number":"","start_date":"","end_date":"","monthly_rent":"","security_deposit":"","currency":"SAR"}'::jsonb,
    TRUE
),
(
    'عقد إيجار تجاري - نموذج قياسي',
    'COMMERCIAL',
    '<h2>عقد إيجار تجاري</h2>
<p>تم إبرام هذا العقد بين كل من:</p>
<p><strong>المؤجر:</strong> {{owner_name}}</p>
<p><strong>المستأجر:</strong> {{tenant_name}} - السجل التجاري: {{commercial_reg}}</p>
<p><strong>المحل / المكتب:</strong> {{unit_number}} - {{property_name}}</p>
<p><strong>الغرض من الاستخدام:</strong> {{business_purpose}}</p>
<p><strong>مدة الإيجار:</strong> من {{start_date}} إلى {{end_date}}</p>
<p><strong>الإيجار الشهري:</strong> {{monthly_rent}} {{currency}}</p>
<h3>الشروط والأحكام</h3>
<p>1. يلتزم المستأجر باستخدام المحل للغرض المحدد فقط.</p>
<p>2. يلتزم المستأجر بسداد جميع رسوم الخدمات والمرافق.</p>
<p>3. لا يحق للمستأجر إجراء أي تعديلات دون موافقة كتابية من المؤجر.</p>
<p>4. يحق للمؤجر فسخ العقد في حالة الإخلال بأي من بنوده.</p>',
    '{"owner_name":"","tenant_name":"","commercial_reg":"","unit_number":"","property_name":"","business_purpose":"","start_date":"","end_date":"","monthly_rent":"","currency":"SAR"}'::jsonb,
    TRUE
)
ON CONFLICT DO NOTHING;
