-- Handover / cancellation record (محضر إلغاء التعاقد — تأمين، تلفيات، دفع المستأجر)
ALTER TABLE lease_contracts ADD COLUMN termination_deposit_return BOOLEAN;
ALTER TABLE lease_contracts ADD COLUMN termination_has_damages BOOLEAN;
ALTER TABLE lease_contracts ADD COLUMN termination_damages_amount DECIMAL(12, 2);
ALTER TABLE lease_contracts ADD COLUMN termination_damages_tenant_paid BOOLEAN;
