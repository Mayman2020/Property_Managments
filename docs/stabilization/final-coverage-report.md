# Final Production Readiness Report

Generated: 2026-05-24T15:38:56.178Z

## 1. Final coverage summary

| Metric | Count |
| --- | ---: |
| Raw JSONL rows | 2255 |
| Effective unique cases | 1587 |
| Fixed | 9 |
| Passed | 1578 |
| Production readiness | 99.4% |

## 2. Notification coverage matrix

| NotificationType | Generated | Recipient | Deep link | Read | Status |
| --- | --- | --- | --- | --- | --- |
| ACCOUNT_LOCKED | Y | Y | iter15 pattern | partial | Passed |
| ACCOUNTANT_CONTRACT_RENEWAL_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| ACCOUNTANT_CONTRACT_RENEWAL_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED | Y | Y | iter15 pattern | partial | Passed |
| BUDGET_THRESHOLD_EXCEEDED | Y | Y | iter15 pattern | partial | Passed |
| COMPLAINT_CLOSED | Y | Y | iter15 pattern | partial | Passed |
| COMPLAINT_RATED | Y | Y | iter15 pattern | partial | Passed |
| COMPLAINT_REPLY_RECEIVED | Y | Y | iter15 pattern | partial | Passed |
| COMPLAINT_SUBMITTED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_ACTIVATED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_AWAITING_OWNER_REVIEW | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_EXPIRING | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_EXPIRING_SOON | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_RENEWAL_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_RENEWAL_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_RENEWAL_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_TERMINATION_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_TERMINATION_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| CONTRACT_TERMINATION_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| DAMAGE_PAYMENT_CONFIRMED | Y | Y | iter15 pattern | partial | Passed |
| DAMAGE_RECEIPT_SUBMITTED | Y | Y | iter15 pattern | partial | Passed |
| DEPOSIT_RETURNED | Y | Y | iter15 pattern | partial | Passed |
| DOCUMENT_EXPIRY_WARNING | Y | Y | iter15 pattern | partial | Passed |
| FINANCE_ALERT | Y | Y | iter15 pattern | partial | Passed |
| GENERAL | Y | Y | iter15 pattern | partial | Passed |
| HR_DEDUCTION_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| HR_DEDUCTION_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| HR_DEDUCTION_SENT_TO_ACCOUNTANT | Y | Y | iter15 pattern | partial | Passed |
| INSPECTION_COMPLETED | Y | Y | iter15 pattern | partial | Passed |
| INSPECTION_SCHEDULED | Y | Y | iter15 pattern | partial | Passed |
| INVENTORY_LOW_STOCK | Y | Y | iter15 pattern | partial | Passed |
| LEAVE_BALANCE_LOW | Y | Y | iter15 pattern | partial | Passed |
| LEAVE_REQUEST_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| LEAVE_REQUEST_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| LEAVE_REQUEST_SUBMITTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_INVOICE_ISSUED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_PAYMENT_DUE_TODAY | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_PAYMENT_RECEIVED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_PAYMENT_SCHEDULED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_RENEWAL_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_RENEWAL_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_RENEWAL_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_TERMINATION_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_TERMINATION_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_CONTRACT_TERMINATION_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_PROVIDER_ASSIGNED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_PROVIDER_UNASSIGNED | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_REQUEST_OVERDUE | Y | Y | iter15 pattern | partial | Passed |
| MAINTENANCE_UPDATE | Y | Y | iter15 pattern | partial | Passed |
| NEW_LOGIN_ALERT | Y | Y | iter15 pattern | partial | Passed |
| NO_RENEWAL_INTENT_SUBMITTED | Y | Y | iter15 pattern | partial | Passed |
| OWNER_STATEMENT | Y | Y | iter15 pattern | partial | Passed |
| PAYMENT_RECEIVED | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_GENERATED | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_HR_DEDUCTION_APPLIED | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_MARKED_PAID | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| PAYROLL_SUBMITTED | Y | Y | iter15 pattern | partial | Passed |
| PAYSLIP_AVAILABLE | Y | Y | iter15 pattern | partial | Passed |
| PROPERTY_LINKED_TO_OWNER | Y | Y | iter15 pattern | partial | Passed |
| RENT_DUE | Y | Y | iter15 pattern | partial | Passed |
| RENT_GRACE_PERIOD_ENDING | Y | Y | iter15 pattern | partial | Passed |
| RENT_OVERDUE | Y | Y | iter15 pattern | partial | Passed |
| RENTAL_INQUIRY_RECEIVED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_ASSIGNED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_CANCELLED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_COMPLETED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_CREATED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_RATED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_SCHEDULE_ACCEPTED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_SCHEDULE_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_SCHEDULED | Y | Y | iter15 pattern | partial | Passed |
| REQUEST_VISIT_REPORTED | Y | Y | iter15 pattern | partial | Passed |
| SALARY_ADVANCE_APPROVED | Y | Y | iter15 pattern | partial | Passed |
| SALARY_ADVANCE_DEDUCTED | Y | Y | iter15 pattern | partial | Passed |
| SALARY_ADVANCE_REJECTED | Y | Y | iter15 pattern | partial | Passed |
| SALARY_ADVANCE_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| TENANT_CONTRACT_RENEWAL_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| TENANT_CONTRACT_TERMINATION_REQUESTED | Y | Y | iter15 pattern | partial | Passed |
| TENANT_DRAFT_LEASE_PENDING_OWNER | Y | Y | iter15 pattern | partial | Passed |
| TENANT_LEASE_AMENDED_BY_OWNER | Y | Y | iter15 pattern | partial | Passed |
| TENANT_LEASE_OWNER_APPROVAL_DENIED | Y | Y | iter15 pattern | partial | Passed |
| TENANT_LEASE_REJECTED_BY_OWNER | Y | Y | iter15 pattern | partial | Passed |
| TENANT_REGISTERED_ON_OWNER_PROPERTY | Y | Y | iter15 pattern | partial | Passed |
| UNIT_ADDED_TO_OWNER_PROPERTY | Y | Y | iter15 pattern | partial | Passed |
| UNIT_CLEARED | Y | Y | iter15 pattern | partial | Passed |
| UNIT_DAMAGE_REPORTED | Y | Y | iter15 pattern | partial | Passed |
| VACANCY_PUBLISHED | Y | Y | iter15 pattern | partial | Passed |

Notification effective: Passed 94 / Blocked 0 / catalog 93

## 3. Route coverage matrix

| Portal | Routes in inventory |
| --- | ---: |
| admin | 55 |
| auth | 2 |
| change-password | 1 |
| employee | 4 |
| officer | 9 |
| tenant | 13 |

Full UI sweep: iteration 18 (`18-ui-exhaustive.qa.spec.ts`).

## 4. Workflow coverage matrix

| Domain | Verified via |
| --- | --- |
| Property / units / owners / tenants | iter 02 + iter 17 workflows |
| Contracts / lease | iter 03–04 + iter 21 triggers |
| Maintenance | iter 05 + iter 21 |
| Complaints | iter 06 + iter 21 |
| Finance / HR / vacancies | iter 07–09 + schedulers |
| Notifications | iter 12, 15–17, 21 |

## 5. Security coverage matrix

| Check | Iteration |
| --- | --- |
| 11-role login + landing | 18-rbac-exhaustive |
| API deny probes | 18-rbac + 21 spot-check |
| Route guards | iter 01 + 16 |

## 6. Remaining blockers

None — **EffectiveStatus Blocked = 0** (iteration 23 closure pass, 2026-05-24).

## 7. Remaining risks

1. Deep-link UI verification is sampled (iter 15), not exhaustive per notification type.
2. Employee portal users created in QA use default passwords; production onboarding flows differ.
3. Scheduler dev endpoints accelerate time-based jobs — production cron timing not re-validated here.
