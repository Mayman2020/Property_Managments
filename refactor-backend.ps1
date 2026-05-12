# Backend Package Refactor Script
# Moves Java files into controller/service/repository/entity/dto sub-packages
# then performs global import replacements.

$base = "d:\Apps Work\My Apps\Property_Managments\property-backend\src\main\java\com\propertymanagement\modules"

function MoveJavaFile {
    param([string]$src, [string]$newPkg, [string]$dst)
    if (-not (Test-Path $src)) { Write-Warning "SKIP (not found): $src"; return }
    $content = Get-Content $src -Raw -Encoding UTF8
    # Replace old package declaration (first occurrence)
    $oldPkg = ($content -match "^package ([^;]+);") | Out-Null
    $oldPkg = $Matches[1]
    $content = $content -replace "^package [^;]+;", "package $newPkg;"
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($dst, $content, [System.Text.Encoding]::UTF8)
    Remove-Item $src -Force
    Write-Host "MOVED: $(Split-Path $src -Leaf) -> $(Split-Path $dst -Parent | Split-Path -Leaf)/$(Split-Path $dst -Leaf)"
}

function GlobalReplace {
    param([string]$oldImport, [string]$newImport)
    $files = Get-ChildItem -Recurse -Filter "*.java" "$base\.."
    $count = 0
    foreach ($f in $files) {
        $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        if ($content -match [regex]::Escape($oldImport)) {
            $newContent = $content.Replace($oldImport, $newImport)
            [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.Encoding]::UTF8)
            $count++
        }
    }
    if ($count -gt 0) { Write-Host "IMPORT: $oldImport -> $newImport ($count files)" }
}

$pkg = "com.propertymanagement.modules"

# ============================================================
# CONTRACT / LEASE
# ============================================================
$lbase = "$base\contract\lease"
MoveJavaFile "$lbase\LeaseContract.java"       "$pkg.contract.lease.entity"     "$lbase\entity\LeaseContract.java"
MoveJavaFile "$lbase\ContractStatus.java"      "$pkg.contract.lease.entity"     "$lbase\entity\ContractStatus.java"
MoveJavaFile "$lbase\PaymentFrequency.java"    "$pkg.contract.lease.entity"     "$lbase\entity\PaymentFrequency.java"
MoveJavaFile "$lbase\LeaseContractController.java" "$pkg.contract.lease.controller" "$lbase\controller\LeaseContractController.java"
MoveJavaFile "$lbase\OwnerApprovalController.java" "$pkg.contract.lease.controller" "$lbase\controller\OwnerApprovalController.java"
MoveJavaFile "$lbase\LeaseContractRepository.java" "$pkg.contract.lease.repository" "$lbase\repository\LeaseContractRepository.java"
MoveJavaFile "$lbase\LeaseContractService.java"    "$pkg.contract.lease.service"    "$lbase\service\LeaseContractService.java"
MoveJavaFile "$lbase\OwnerApprovalService.java"    "$pkg.contract.lease.service"    "$lbase\service\OwnerApprovalService.java"

# ============================================================
# CONTRACT / PAYMENT
# ============================================================
$pbase = "$base\contract\payment"
MoveJavaFile "$pbase\RentPayment.java"                 "$pkg.contract.payment.entity"     "$pbase\entity\RentPayment.java"
MoveJavaFile "$pbase\RentPaymentSchedule.java"         "$pkg.contract.payment.entity"     "$pbase\entity\RentPaymentSchedule.java"
MoveJavaFile "$pbase\PaymentScheduleStatus.java"       "$pkg.contract.payment.entity"     "$pbase\entity\PaymentScheduleStatus.java"
MoveJavaFile "$pbase\RentPaymentController.java"       "$pkg.contract.payment.controller" "$pbase\controller\RentPaymentController.java"
MoveJavaFile "$pbase\RentPaymentRepository.java"       "$pkg.contract.payment.repository" "$pbase\repository\RentPaymentRepository.java"
MoveJavaFile "$pbase\RentPaymentScheduleRepository.java" "$pkg.contract.payment.repository" "$pbase\repository\RentPaymentScheduleRepository.java"
MoveJavaFile "$pbase\RentPaymentService.java"          "$pkg.contract.payment.service"    "$pbase\service\RentPaymentService.java"

# ============================================================
# CONTRACT / RENEWAL
# ============================================================
$rbase = "$base\contract\renewal"
MoveJavaFile "$rbase\ContractRenewal.java"           "$pkg.contract.renewal.entity"     "$rbase\entity\ContractRenewal.java"
MoveJavaFile "$rbase\ContractRenewalRepository.java" "$pkg.contract.renewal.repository" "$rbase\repository\ContractRenewalRepository.java"
MoveJavaFile "$rbase\ContractRenewalService.java"    "$pkg.contract.renewal.service"    "$rbase\service\ContractRenewalService.java"

# ============================================================
# CONTRACT / TEMPLATE
# ============================================================
$tbase = "$base\contract\template"
MoveJavaFile "$tbase\ContractTemplate.java"           "$pkg.contract.template.entity"     "$tbase\entity\ContractTemplate.java"
MoveJavaFile "$tbase\ContractTemplateController.java" "$pkg.contract.template.controller" "$tbase\controller\ContractTemplateController.java"
MoveJavaFile "$tbase\ContractTemplateRepository.java" "$pkg.contract.template.repository" "$tbase\repository\ContractTemplateRepository.java"
MoveJavaFile "$tbase\ContractTemplateService.java"    "$pkg.contract.template.service"    "$tbase\service\ContractTemplateService.java"

# ============================================================
# CONTRACT / FEE
# ============================================================
$fbase = "$base\contract\fee"
MoveJavaFile "$fbase\ContractFee.java"           "$pkg.contract.fee.entity"     "$fbase\entity\ContractFee.java"
MoveJavaFile "$fbase\ContractFeeRepository.java" "$pkg.contract.fee.repository" "$fbase\repository\ContractFeeRepository.java"
MoveJavaFile "$fbase\ContractFeeService.java"    "$pkg.contract.fee.service"    "$fbase\service\ContractFeeService.java"

# ============================================================
# FINANCE ROOT
# ============================================================
$finbase = "$base\finance"
MoveJavaFile "$finbase\FinanceController.java" "$pkg.finance.controller" "$finbase\controller\FinanceController.java"
MoveJavaFile "$finbase\FinanceService.java"    "$pkg.finance.service"    "$finbase\service\FinanceService.java"

# FINANCE / BUDGET
$bbase = "$base\finance\budget"
MoveJavaFile "$bbase\BudgetEntity.java"          "$pkg.finance.budget.entity"     "$bbase\entity\BudgetEntity.java"
MoveJavaFile "$bbase\BudgetQueryRepository.java" "$pkg.finance.budget.repository" "$bbase\repository\BudgetQueryRepository.java"

# FINANCE / EXPENSE
$ebase = "$base\finance\expense"
MoveJavaFile "$ebase\Expense.java"                       "$pkg.finance.expense.entity"     "$ebase\entity\Expense.java"
MoveJavaFile "$ebase\ExpenseCategory.java"               "$pkg.finance.expense.entity"     "$ebase\entity\ExpenseCategory.java"
MoveJavaFile "$ebase\ExpenseCategoryLookupRepository.java" "$pkg.finance.expense.repository" "$ebase\repository\ExpenseCategoryLookupRepository.java"
MoveJavaFile "$ebase\ExpenseRepository.java"             "$pkg.finance.expense.repository" "$ebase\repository\ExpenseRepository.java"
MoveJavaFile "$ebase\ExpenseWriterRepository.java"       "$pkg.finance.expense.repository" "$ebase\repository\ExpenseWriterRepository.java"

# FINANCE / REVENUE
$revbase = "$base\finance\revenue"
MoveJavaFile "$revbase\OtherRevenue.java"              "$pkg.finance.revenue.entity"     "$revbase\entity\OtherRevenue.java"
MoveJavaFile "$revbase\OtherRevenueRepository.java"    "$pkg.finance.revenue.repository" "$revbase\repository\OtherRevenueRepository.java"
MoveJavaFile "$revbase\OtherRevenueWriterRepository.java" "$pkg.finance.revenue.repository" "$revbase\repository\OtherRevenueWriterRepository.java"

# ============================================================
# HR / ATTENDANCE
# ============================================================
$attbase = "$base\hr\attendance"
MoveJavaFile "$attbase\AttendanceEntity.java"          "$pkg.hr.attendance.entity"     "$attbase\entity\AttendanceEntity.java"
MoveJavaFile "$attbase\AttendanceController.java"      "$pkg.hr.attendance.controller" "$attbase\controller\AttendanceController.java"
MoveJavaFile "$attbase\AttendanceQueryRepository.java" "$pkg.hr.attendance.repository" "$attbase\repository\AttendanceQueryRepository.java"
MoveJavaFile "$attbase\AttendanceService.java"         "$pkg.hr.attendance.service"    "$attbase\service\AttendanceService.java"

# ============================================================
# HR / EMPLOYEE
# ============================================================
$empbase = "$base\hr\employee"
MoveJavaFile "$empbase\Employee.java"           "$pkg.hr.employee.entity"     "$empbase\entity\Employee.java"
MoveJavaFile "$empbase\EmployeeController.java" "$pkg.hr.employee.controller" "$empbase\controller\EmployeeController.java"
MoveJavaFile "$empbase\EmployeeRepository.java" "$pkg.hr.employee.repository" "$empbase\repository\EmployeeRepository.java"
MoveJavaFile "$empbase\EmployeeService.java"    "$pkg.hr.employee.service"    "$empbase\service\EmployeeService.java"

# ============================================================
# HR / LEAVE
# ============================================================
$lvbase = "$base\hr\leave"
MoveJavaFile "$lvbase\LeaveRequestEntity.java"   "$pkg.hr.leave.entity"     "$lvbase\entity\LeaveRequestEntity.java"
MoveJavaFile "$lvbase\LeaveController.java"      "$pkg.hr.leave.controller" "$lvbase\controller\LeaveController.java"
MoveJavaFile "$lvbase\LeaveQueryRepository.java" "$pkg.hr.leave.repository" "$lvbase\repository\LeaveQueryRepository.java"
MoveJavaFile "$lvbase\LeaveRequestRepository.java" "$pkg.hr.leave.repository" "$lvbase\repository\LeaveRequestRepository.java"
MoveJavaFile "$lvbase\LeaveService.java"         "$pkg.hr.leave.service"    "$lvbase\service\LeaveService.java"

# ============================================================
# HR / PAYROLL
# ============================================================
$prbase = "$base\hr\payroll"
MoveJavaFile "$prbase\PayrollRun.java"              "$pkg.hr.payroll.entity"     "$prbase\entity\PayrollRun.java"
MoveJavaFile "$prbase\Payslip.java"                 "$pkg.hr.payroll.entity"     "$prbase\entity\Payslip.java"
MoveJavaFile "$prbase\EmployeeBonus.java"           "$pkg.hr.payroll.entity"     "$prbase\entity\EmployeeBonus.java"
MoveJavaFile "$prbase\SalaryAdvance.java"           "$pkg.hr.payroll.entity"     "$prbase\entity\SalaryAdvance.java"
MoveJavaFile "$prbase\PayrollController.java"       "$pkg.hr.payroll.controller" "$prbase\controller\PayrollController.java"
MoveJavaFile "$prbase\PayrollRepository.java"       "$pkg.hr.payroll.repository" "$prbase\repository\PayrollRepository.java"
MoveJavaFile "$prbase\PayslipRepository.java"       "$pkg.hr.payroll.repository" "$prbase\repository\PayslipRepository.java"
MoveJavaFile "$prbase\EmployeeBonusRepository.java" "$pkg.hr.payroll.repository" "$prbase\repository\EmployeeBonusRepository.java"
MoveJavaFile "$prbase\SalaryAdvanceRepository.java" "$pkg.hr.payroll.repository" "$prbase\repository\SalaryAdvanceRepository.java"
MoveJavaFile "$prbase\PayrollService.java"          "$pkg.hr.payroll.service"    "$prbase\service\PayrollService.java"

# ============================================================
# MAINTENANCE / ASSIGNMENT
# ============================================================
$asnbase = "$base\maintenance\assignment"
MoveJavaFile "$asnbase\MaintenanceAssignmentController.java"   "$pkg.maintenance.assignment.controller" "$asnbase\controller\MaintenanceAssignmentController.java"
MoveJavaFile "$asnbase\MaintenanceAssignmentService.java"      "$pkg.maintenance.assignment.service"    "$asnbase\service\MaintenanceAssignmentService.java"
MoveJavaFile "$asnbase\MaintenanceContract.java"               "$pkg.maintenance.assignment.entity"     "$asnbase\entity\MaintenanceContract.java"
MoveJavaFile "$asnbase\MaintenanceContractRepository.java"     "$pkg.maintenance.assignment.repository" "$asnbase\repository\MaintenanceContractRepository.java"
MoveJavaFile "$asnbase\MaintenanceProvider.java"               "$pkg.maintenance.assignment.entity"     "$asnbase\entity\MaintenanceProvider.java"
MoveJavaFile "$asnbase\MaintenanceProviderRepository.java"     "$pkg.maintenance.assignment.repository" "$asnbase\repository\MaintenanceProviderRepository.java"
MoveJavaFile "$asnbase\PropertyMaintenanceAssignment.java"     "$pkg.maintenance.assignment.entity"     "$asnbase\entity\PropertyMaintenanceAssignment.java"
MoveJavaFile "$asnbase\PropertyMaintenanceAssignmentRepository.java" "$pkg.maintenance.assignment.repository" "$asnbase\repository\PropertyMaintenanceAssignmentRepository.java"

# ============================================================
# MAINTENANCE / CATEGORY
# ============================================================
$catbase = "$base\maintenance\category"
MoveJavaFile "$catbase\MaintenanceCategory.java"           "$pkg.maintenance.category.entity"     "$catbase\entity\MaintenanceCategory.java"
MoveJavaFile "$catbase\MaintenanceCategoryController.java" "$pkg.maintenance.category.controller" "$catbase\controller\MaintenanceCategoryController.java"
MoveJavaFile "$catbase\MaintenanceCategoryRepository.java" "$pkg.maintenance.category.repository" "$catbase\repository\MaintenanceCategoryRepository.java"
MoveJavaFile "$catbase\MaintenanceCategoryService.java"    "$pkg.maintenance.category.service"    "$catbase\service\MaintenanceCategoryService.java"

# ============================================================
# MAINTENANCE / CONTRACT
# ============================================================
$mcbase = "$base\maintenance\contract"
MoveJavaFile "$mcbase\MaintenanceContractController.java" "$pkg.maintenance.contract.controller" "$mcbase\controller\MaintenanceContractController.java"
MoveJavaFile "$mcbase\MaintenanceContractService.java"    "$pkg.maintenance.contract.service"    "$mcbase\service\MaintenanceContractService.java"

# ============================================================
# MAINTENANCE / CONTRACT INVOICE
# ============================================================
$mcibase = "$base\maintenance\contractinvoice"
MoveJavaFile "$mcibase\MaintenanceContractInvoice.java"           "$pkg.maintenance.contractinvoice.entity"     "$mcibase\entity\MaintenanceContractInvoice.java"
MoveJavaFile "$mcibase\MaintenanceContractInvoiceController.java" "$pkg.maintenance.contractinvoice.controller" "$mcibase\controller\MaintenanceContractInvoiceController.java"
MoveJavaFile "$mcibase\MaintenanceContractInvoiceRepository.java" "$pkg.maintenance.contractinvoice.repository" "$mcibase\repository\MaintenanceContractInvoiceRepository.java"
MoveJavaFile "$mcibase\MaintenanceContractInvoiceService.java"    "$pkg.maintenance.contractinvoice.service"    "$mcibase\service\MaintenanceContractInvoiceService.java"

# ============================================================
# MAINTENANCE / INVOICE
# ============================================================
$minvbase = "$base\maintenance\invoice"
MoveJavaFile "$minvbase\MaintenanceInvoice.java"           "$pkg.maintenance.invoice.entity"     "$minvbase\entity\MaintenanceInvoice.java"
MoveJavaFile "$minvbase\MaintenanceInvoiceController.java" "$pkg.maintenance.invoice.controller" "$minvbase\controller\MaintenanceInvoiceController.java"
MoveJavaFile "$minvbase\MaintenanceInvoiceRepository.java" "$pkg.maintenance.invoice.repository" "$minvbase\repository\MaintenanceInvoiceRepository.java"
MoveJavaFile "$minvbase\MaintenanceInvoiceService.java"    "$pkg.maintenance.invoice.service"    "$minvbase\service\MaintenanceInvoiceService.java"

# ============================================================
# MAINTENANCE / RATING
# ============================================================
$ratbase = "$base\maintenance\rating"
MoveJavaFile "$ratbase\VisitRating.java"                  "$pkg.maintenance.rating.entity"     "$ratbase\entity\VisitRating.java"
MoveJavaFile "$ratbase\VisitRatingRepository.java"        "$pkg.maintenance.rating.repository" "$ratbase\repository\VisitRatingRepository.java"
MoveJavaFile "$ratbase\VisitRatingService.java"           "$pkg.maintenance.rating.service"    "$ratbase\service\VisitRatingService.java"
MoveJavaFile "$ratbase\VisitRatingRequest.java"           "$pkg.maintenance.rating.dto"        "$ratbase\dto\VisitRatingRequest.java"
MoveJavaFile "$ratbase\VisitRatingResponse.java"          "$pkg.maintenance.rating.dto"        "$ratbase\dto\VisitRatingResponse.java"
MoveJavaFile "$ratbase\RatingDashboardItemResponse.java"  "$pkg.maintenance.rating.dto"        "$ratbase\dto\RatingDashboardItemResponse.java"
MoveJavaFile "$ratbase\RatingsSummaryResponse.java"       "$pkg.maintenance.rating.dto"        "$ratbase\dto\RatingsSummaryResponse.java"

# ============================================================
# MAINTENANCE / REQUEST
# ============================================================
$mreqbase = "$base\maintenance\request"
MoveJavaFile "$mreqbase\MaintenanceRequest.java"           "$pkg.maintenance.request.entity"     "$mreqbase\entity\MaintenanceRequest.java"
MoveJavaFile "$mreqbase\RequestAttachment.java"            "$pkg.maintenance.request.entity"     "$mreqbase\entity\RequestAttachment.java"
MoveJavaFile "$mreqbase\RequestPriority.java"              "$pkg.maintenance.request.entity"     "$mreqbase\entity\RequestPriority.java"
MoveJavaFile "$mreqbase\RequestStatus.java"                "$pkg.maintenance.request.entity"     "$mreqbase\entity\RequestStatus.java"
MoveJavaFile "$mreqbase\MaintenanceRequestController.java" "$pkg.maintenance.request.controller" "$mreqbase\controller\MaintenanceRequestController.java"
MoveJavaFile "$mreqbase\RequestAttachmentRepository.java"  "$pkg.maintenance.request.repository" "$mreqbase\repository\RequestAttachmentRepository.java"
MoveJavaFile "$mreqbase\MaintenanceRequestRepository.java" "$pkg.maintenance.request.repository" "$mreqbase\repository\MaintenanceRequestRepository.java"
MoveJavaFile "$mreqbase\MaintenanceRequestService.java"    "$pkg.maintenance.request.service"    "$mreqbase\service\MaintenanceRequestService.java"

# ============================================================
# MAINTENANCE / VISIT
# ============================================================
$visitbase = "$base\maintenance\visit"
MoveJavaFile "$visitbase\VisitReport.java"              "$pkg.maintenance.visit.entity"     "$visitbase\entity\VisitReport.java"
MoveJavaFile "$visitbase\VisitReportItem.java"          "$pkg.maintenance.visit.entity"     "$visitbase\entity\VisitReportItem.java"
MoveJavaFile "$visitbase\VisitReportRepository.java"    "$pkg.maintenance.visit.repository" "$visitbase\repository\VisitReportRepository.java"
MoveJavaFile "$visitbase\VisitReportItemRepository.java" "$pkg.maintenance.visit.repository" "$visitbase\repository\VisitReportItemRepository.java"

# ============================================================
# OWNER
# ============================================================
$ownerbase = "$base\owner"
MoveJavaFile "$ownerbase\Owner.java"                       "$pkg.owner.entity"     "$ownerbase\entity\Owner.java"
MoveJavaFile "$ownerbase\OwnerController.java"             "$pkg.owner.controller" "$ownerbase\controller\OwnerController.java"
MoveJavaFile "$ownerbase\OwnerPropertyAccessService.java"  "$pkg.owner.service"    "$ownerbase\service\OwnerPropertyAccessService.java"
MoveJavaFile "$ownerbase\OwnerRepository.java"             "$pkg.owner.repository" "$ownerbase\repository\OwnerRepository.java"
MoveJavaFile "$ownerbase\OwnerService.java"                "$pkg.owner.service"    "$ownerbase\service\OwnerService.java"

# ============================================================
# OWNER PORTAL
# ============================================================
$opbase = "$base\ownerportal"
MoveJavaFile "$opbase\OwnerPortalController.java"           "$pkg.ownerportal.controller" "$opbase\controller\OwnerPortalController.java"
MoveJavaFile "$opbase\OwnerPortalDraftContractService.java" "$pkg.ownerportal.service"    "$opbase\service\OwnerPortalDraftContractService.java"
MoveJavaFile "$opbase\OwnerPortalService.java"              "$pkg.ownerportal.service"    "$opbase\service\OwnerPortalService.java"
MoveJavaFile "$opbase\OwnerStatement.java"                  "$pkg.ownerportal.entity"     "$opbase\entity\OwnerStatement.java"
MoveJavaFile "$opbase\OwnerStatementRepository.java"        "$pkg.ownerportal.repository" "$opbase\repository\OwnerStatementRepository.java"

# ============================================================
# PROPERTY
# ============================================================
$propbase = "$base\property"
MoveJavaFile "$propbase\Property.java"                        "$pkg.property.entity"     "$propbase\entity\Property.java"
MoveJavaFile "$propbase\Floor.java"                           "$pkg.property.entity"     "$propbase\entity\Floor.java"
MoveJavaFile "$propbase\PropertyType.java"                    "$pkg.property.entity"     "$propbase\entity\PropertyType.java"
MoveJavaFile "$propbase\PropertyController.java"              "$pkg.property.controller" "$propbase\controller\PropertyController.java"
MoveJavaFile "$propbase\FloorController.java"                 "$pkg.property.controller" "$propbase\controller\FloorController.java"
MoveJavaFile "$propbase\PropertyOwnerPortalRecipientService.java" "$pkg.property.service" "$propbase\service\PropertyOwnerPortalRecipientService.java"
MoveJavaFile "$propbase\PropertyRepository.java"              "$pkg.property.repository" "$propbase\repository\PropertyRepository.java"
MoveJavaFile "$propbase\FloorRepository.java"                 "$pkg.property.repository" "$propbase\repository\FloorRepository.java"
MoveJavaFile "$propbase\PropertyService.java"                 "$pkg.property.service"    "$propbase\service\PropertyService.java"
MoveJavaFile "$propbase\FloorService.java"                    "$pkg.property.service"    "$propbase\service\FloorService.java"

# PROPERTY / ATTACHMENT
$attchbase = "$base\property\attachment"
MoveJavaFile "$attchbase\PropertyAttachment.java"           "$pkg.property.attachment.entity"     "$attchbase\entity\PropertyAttachment.java"
MoveJavaFile "$attchbase\PropertyAttachmentController.java" "$pkg.property.attachment.controller" "$attchbase\controller\PropertyAttachmentController.java"
MoveJavaFile "$attchbase\PropertyAttachmentRepository.java" "$pkg.property.attachment.repository" "$attchbase\repository\PropertyAttachmentRepository.java"
MoveJavaFile "$attchbase\PropertyAttachmentResponse.java"   "$pkg.property.attachment.dto"        "$attchbase\dto\PropertyAttachmentResponse.java"
MoveJavaFile "$attchbase\PropertyAttachmentService.java"    "$pkg.property.attachment.service"    "$attchbase\service\PropertyAttachmentService.java"

# ============================================================
# TENANT
# ============================================================
$tenantbase = "$base\tenant"
MoveJavaFile "$tenantbase\Tenant.java"                    "$pkg.tenant.entity"     "$tenantbase\entity\Tenant.java"
MoveJavaFile "$tenantbase\TenantController.java"          "$pkg.tenant.controller" "$tenantbase\controller\TenantController.java"
MoveJavaFile "$tenantbase\TenantOnboardingService.java"   "$pkg.tenant.service"    "$tenantbase\service\TenantOnboardingService.java"
MoveJavaFile "$tenantbase\TenantPortalWelcomeService.java" "$pkg.tenant.service"   "$tenantbase\service\TenantPortalWelcomeService.java"
MoveJavaFile "$tenantbase\TenantRepository.java"          "$pkg.tenant.repository" "$tenantbase\repository\TenantRepository.java"
MoveJavaFile "$tenantbase\TenantService.java"             "$pkg.tenant.service"    "$tenantbase\service\TenantService.java"

# ============================================================
# TENANT PORTAL
# ============================================================
$tpbase = "$base\tenantportal"
MoveJavaFile "$tpbase\TenantPortalController.java"        "$pkg.tenantportal.controller" "$tpbase\controller\TenantPortalController.java"
MoveJavaFile "$tpbase\TenantPortalService.java"           "$pkg.tenantportal.service"    "$tpbase\service\TenantPortalService.java"
MoveJavaFile "$tpbase\RentReceipt.java"                   "$pkg.tenantportal.entity"     "$tpbase\entity\RentReceipt.java"
MoveJavaFile "$tpbase\ContractActionRequest.java"         "$pkg.tenantportal.entity"     "$tpbase\entity\ContractActionRequest.java"
MoveJavaFile "$tpbase\RentReceiptRepository.java"         "$pkg.tenantportal.repository" "$tpbase\repository\RentReceiptRepository.java"
MoveJavaFile "$tpbase\ContractActionRequestRepository.java" "$pkg.tenantportal.repository" "$tpbase\repository\ContractActionRequestRepository.java"
MoveJavaFile "$tpbase\ReceiptWithTenantDto.java"          "$pkg.tenantportal.dto"        "$tpbase\dto\ReceiptWithTenantDto.java"
MoveJavaFile "$tpbase\RenewalRequestWithDetailsDto.java"  "$pkg.tenantportal.dto"        "$tpbase\dto\RenewalRequestWithDetailsDto.java"

# ============================================================
# UNIT
# ============================================================
$unitbase = "$base\unit"
MoveJavaFile "$unitbase\Unit.java"           "$pkg.unit.entity"     "$unitbase\entity\Unit.java"
MoveJavaFile "$unitbase\UnitType.java"       "$pkg.unit.entity"     "$unitbase\entity\UnitType.java"
MoveJavaFile "$unitbase\UnitController.java" "$pkg.unit.controller" "$unitbase\controller\UnitController.java"
MoveJavaFile "$unitbase\UnitRepository.java" "$pkg.unit.repository" "$unitbase\repository\UnitRepository.java"
MoveJavaFile "$unitbase\UnitService.java"    "$pkg.unit.service"    "$unitbase\service\UnitService.java"

# ============================================================
# USER
# ============================================================
$userbase = "$base\user"
MoveJavaFile "$userbase\User.java"                      "$pkg.user.entity"     "$userbase\entity\User.java"
MoveJavaFile "$userbase\UserExtraRoles.java"            "$pkg.user.entity"     "$userbase\entity\UserExtraRoles.java"
MoveJavaFile "$userbase\UserPropertyAccess.java"        "$pkg.user.entity"     "$userbase\entity\UserPropertyAccess.java"
MoveJavaFile "$userbase\UserPropertyAccessId.java"      "$pkg.user.entity"     "$userbase\entity\UserPropertyAccessId.java"
MoveJavaFile "$userbase\UserRole.java"                  "$pkg.user.entity"     "$userbase\entity\UserRole.java"
MoveJavaFile "$userbase\MaintenanceOfficerType.java"    "$pkg.user.entity"     "$userbase\entity\MaintenanceOfficerType.java"
MoveJavaFile "$userbase\UserController.java"            "$pkg.user.controller" "$userbase\controller\UserController.java"
MoveJavaFile "$userbase\UserPropertyAccessRepository.java" "$pkg.user.repository" "$userbase\repository\UserPropertyAccessRepository.java"
MoveJavaFile "$userbase\UserRepository.java"            "$pkg.user.repository" "$userbase\repository\UserRepository.java"
MoveJavaFile "$userbase\PortalProfileBridge.java"       "$pkg.user.service"    "$userbase\service\PortalProfileBridge.java"
MoveJavaFile "$userbase\UserService.java"               "$pkg.user.service"    "$userbase\service\UserService.java"

Write-Host ""
Write-Host "=== ALL FILES MOVED. Starting global import replacements... ==="
Write-Host ""

# ============================================================
# GLOBAL IMPORT REPLACEMENTS
# ============================================================
# Contract / Lease
GlobalReplace "import $pkg.contract.lease.LeaseContract;"            "import $pkg.contract.lease.entity.LeaseContract;"
GlobalReplace "import $pkg.contract.lease.ContractStatus;"           "import $pkg.contract.lease.entity.ContractStatus;"
GlobalReplace "import $pkg.contract.lease.PaymentFrequency;"         "import $pkg.contract.lease.entity.PaymentFrequency;"
GlobalReplace "import $pkg.contract.lease.LeaseContractRepository;"  "import $pkg.contract.lease.repository.LeaseContractRepository;"
GlobalReplace "import $pkg.contract.lease.LeaseContractService;"     "import $pkg.contract.lease.service.LeaseContractService;"
GlobalReplace "import $pkg.contract.lease.OwnerApprovalService;"     "import $pkg.contract.lease.service.OwnerApprovalService;"

# Contract / Payment
GlobalReplace "import $pkg.contract.payment.RentPayment;"                  "import $pkg.contract.payment.entity.RentPayment;"
GlobalReplace "import $pkg.contract.payment.RentPaymentSchedule;"          "import $pkg.contract.payment.entity.RentPaymentSchedule;"
GlobalReplace "import $pkg.contract.payment.PaymentScheduleStatus;"        "import $pkg.contract.payment.entity.PaymentScheduleStatus;"
GlobalReplace "import $pkg.contract.payment.RentPaymentRepository;"        "import $pkg.contract.payment.repository.RentPaymentRepository;"
GlobalReplace "import $pkg.contract.payment.RentPaymentScheduleRepository;" "import $pkg.contract.payment.repository.RentPaymentScheduleRepository;"
GlobalReplace "import $pkg.contract.payment.RentPaymentService;"           "import $pkg.contract.payment.service.RentPaymentService;"

# Contract / Renewal
GlobalReplace "import $pkg.contract.renewal.ContractRenewal;"           "import $pkg.contract.renewal.entity.ContractRenewal;"
GlobalReplace "import $pkg.contract.renewal.ContractRenewalRepository;" "import $pkg.contract.renewal.repository.ContractRenewalRepository;"
GlobalReplace "import $pkg.contract.renewal.ContractRenewalService;"    "import $pkg.contract.renewal.service.ContractRenewalService;"

# Contract / Template
GlobalReplace "import $pkg.contract.template.ContractTemplate;"           "import $pkg.contract.template.entity.ContractTemplate;"
GlobalReplace "import $pkg.contract.template.ContractTemplateRepository;" "import $pkg.contract.template.repository.ContractTemplateRepository;"
GlobalReplace "import $pkg.contract.template.ContractTemplateService;"    "import $pkg.contract.template.service.ContractTemplateService;"

# Contract / Fee
GlobalReplace "import $pkg.contract.fee.ContractFee;"           "import $pkg.contract.fee.entity.ContractFee;"
GlobalReplace "import $pkg.contract.fee.ContractFeeRepository;" "import $pkg.contract.fee.repository.ContractFeeRepository;"
GlobalReplace "import $pkg.contract.fee.ContractFeeService;"    "import $pkg.contract.fee.service.ContractFeeService;"

# Finance
GlobalReplace "import $pkg.finance.budget.BudgetEntity;"          "import $pkg.finance.budget.entity.BudgetEntity;"
GlobalReplace "import $pkg.finance.budget.BudgetQueryRepository;" "import $pkg.finance.budget.repository.BudgetQueryRepository;"
GlobalReplace "import $pkg.finance.expense.Expense;"              "import $pkg.finance.expense.entity.Expense;"
GlobalReplace "import $pkg.finance.expense.ExpenseCategory;"      "import $pkg.finance.expense.entity.ExpenseCategory;"
GlobalReplace "import $pkg.finance.expense.ExpenseCategoryLookupRepository;" "import $pkg.finance.expense.repository.ExpenseCategoryLookupRepository;"
GlobalReplace "import $pkg.finance.expense.ExpenseRepository;"    "import $pkg.finance.expense.repository.ExpenseRepository;"
GlobalReplace "import $pkg.finance.expense.ExpenseWriterRepository;" "import $pkg.finance.expense.repository.ExpenseWriterRepository;"
GlobalReplace "import $pkg.finance.revenue.OtherRevenue;"         "import $pkg.finance.revenue.entity.OtherRevenue;"
GlobalReplace "import $pkg.finance.revenue.OtherRevenueRepository;" "import $pkg.finance.revenue.repository.OtherRevenueRepository;"
GlobalReplace "import $pkg.finance.revenue.OtherRevenueWriterRepository;" "import $pkg.finance.revenue.repository.OtherRevenueWriterRepository;"

# HR / Attendance
GlobalReplace "import $pkg.hr.attendance.AttendanceEntity;"          "import $pkg.hr.attendance.entity.AttendanceEntity;"
GlobalReplace "import $pkg.hr.attendance.AttendanceQueryRepository;" "import $pkg.hr.attendance.repository.AttendanceQueryRepository;"
GlobalReplace "import $pkg.hr.attendance.AttendanceService;"         "import $pkg.hr.attendance.service.AttendanceService;"

# HR / Employee
GlobalReplace "import $pkg.hr.employee.Employee;"           "import $pkg.hr.employee.entity.Employee;"
GlobalReplace "import $pkg.hr.employee.EmployeeRepository;" "import $pkg.hr.employee.repository.EmployeeRepository;"
GlobalReplace "import $pkg.hr.employee.EmployeeService;"    "import $pkg.hr.employee.service.EmployeeService;"

# HR / Leave
GlobalReplace "import $pkg.hr.leave.LeaveRequestEntity;"   "import $pkg.hr.leave.entity.LeaveRequestEntity;"
GlobalReplace "import $pkg.hr.leave.LeaveQueryRepository;" "import $pkg.hr.leave.repository.LeaveQueryRepository;"
GlobalReplace "import $pkg.hr.leave.LeaveRequestRepository;" "import $pkg.hr.leave.repository.LeaveRequestRepository;"
GlobalReplace "import $pkg.hr.leave.LeaveService;"         "import $pkg.hr.leave.service.LeaveService;"

# HR / Payroll
GlobalReplace "import $pkg.hr.payroll.PayrollRun;"              "import $pkg.hr.payroll.entity.PayrollRun;"
GlobalReplace "import $pkg.hr.payroll.Payslip;"                 "import $pkg.hr.payroll.entity.Payslip;"
GlobalReplace "import $pkg.hr.payroll.EmployeeBonus;"           "import $pkg.hr.payroll.entity.EmployeeBonus;"
GlobalReplace "import $pkg.hr.payroll.SalaryAdvance;"           "import $pkg.hr.payroll.entity.SalaryAdvance;"
GlobalReplace "import $pkg.hr.payroll.PayrollRepository;"       "import $pkg.hr.payroll.repository.PayrollRepository;"
GlobalReplace "import $pkg.hr.payroll.PayslipRepository;"       "import $pkg.hr.payroll.repository.PayslipRepository;"
GlobalReplace "import $pkg.hr.payroll.EmployeeBonusRepository;" "import $pkg.hr.payroll.repository.EmployeeBonusRepository;"
GlobalReplace "import $pkg.hr.payroll.SalaryAdvanceRepository;" "import $pkg.hr.payroll.repository.SalaryAdvanceRepository;"
GlobalReplace "import $pkg.hr.payroll.PayrollService;"          "import $pkg.hr.payroll.service.PayrollService;"

# Maintenance / Assignment
GlobalReplace "import $pkg.maintenance.assignment.MaintenanceAssignmentService;"      "import $pkg.maintenance.assignment.service.MaintenanceAssignmentService;"
GlobalReplace "import $pkg.maintenance.assignment.MaintenanceContract;"               "import $pkg.maintenance.assignment.entity.MaintenanceContract;"
GlobalReplace "import $pkg.maintenance.assignment.MaintenanceContractRepository;"     "import $pkg.maintenance.assignment.repository.MaintenanceContractRepository;"
GlobalReplace "import $pkg.maintenance.assignment.MaintenanceProvider;"               "import $pkg.maintenance.assignment.entity.MaintenanceProvider;"
GlobalReplace "import $pkg.maintenance.assignment.MaintenanceProviderRepository;"     "import $pkg.maintenance.assignment.repository.MaintenanceProviderRepository;"
GlobalReplace "import $pkg.maintenance.assignment.PropertyMaintenanceAssignment;"     "import $pkg.maintenance.assignment.entity.PropertyMaintenanceAssignment;"
GlobalReplace "import $pkg.maintenance.assignment.PropertyMaintenanceAssignmentRepository;" "import $pkg.maintenance.assignment.repository.PropertyMaintenanceAssignmentRepository;"

# Maintenance / Category
GlobalReplace "import $pkg.maintenance.category.MaintenanceCategory;"           "import $pkg.maintenance.category.entity.MaintenanceCategory;"
GlobalReplace "import $pkg.maintenance.category.MaintenanceCategoryRepository;" "import $pkg.maintenance.category.repository.MaintenanceCategoryRepository;"
GlobalReplace "import $pkg.maintenance.category.MaintenanceCategoryService;"    "import $pkg.maintenance.category.service.MaintenanceCategoryService;"

# Maintenance / Contract
GlobalReplace "import $pkg.maintenance.contract.MaintenanceContractService;" "import $pkg.maintenance.contract.service.MaintenanceContractService;"

# Maintenance / ContractInvoice
GlobalReplace "import $pkg.maintenance.contractinvoice.MaintenanceContractInvoice;"           "import $pkg.maintenance.contractinvoice.entity.MaintenanceContractInvoice;"
GlobalReplace "import $pkg.maintenance.contractinvoice.MaintenanceContractInvoiceRepository;" "import $pkg.maintenance.contractinvoice.repository.MaintenanceContractInvoiceRepository;"
GlobalReplace "import $pkg.maintenance.contractinvoice.MaintenanceContractInvoiceService;"    "import $pkg.maintenance.contractinvoice.service.MaintenanceContractInvoiceService;"

# Maintenance / Invoice
GlobalReplace "import $pkg.maintenance.invoice.MaintenanceInvoice;"           "import $pkg.maintenance.invoice.entity.MaintenanceInvoice;"
GlobalReplace "import $pkg.maintenance.invoice.MaintenanceInvoiceRepository;" "import $pkg.maintenance.invoice.repository.MaintenanceInvoiceRepository;"
GlobalReplace "import $pkg.maintenance.invoice.MaintenanceInvoiceService;"    "import $pkg.maintenance.invoice.service.MaintenanceInvoiceService;"

# Maintenance / Rating
GlobalReplace "import $pkg.maintenance.rating.VisitRating;"                 "import $pkg.maintenance.rating.entity.VisitRating;"
GlobalReplace "import $pkg.maintenance.rating.VisitRatingRepository;"       "import $pkg.maintenance.rating.repository.VisitRatingRepository;"
GlobalReplace "import $pkg.maintenance.rating.VisitRatingService;"          "import $pkg.maintenance.rating.service.VisitRatingService;"
GlobalReplace "import $pkg.maintenance.rating.VisitRatingRequest;"          "import $pkg.maintenance.rating.dto.VisitRatingRequest;"
GlobalReplace "import $pkg.maintenance.rating.VisitRatingResponse;"         "import $pkg.maintenance.rating.dto.VisitRatingResponse;"
GlobalReplace "import $pkg.maintenance.rating.RatingDashboardItemResponse;" "import $pkg.maintenance.rating.dto.RatingDashboardItemResponse;"
GlobalReplace "import $pkg.maintenance.rating.RatingsSummaryResponse;"      "import $pkg.maintenance.rating.dto.RatingsSummaryResponse;"

# Maintenance / Request
GlobalReplace "import $pkg.maintenance.request.MaintenanceRequest;"           "import $pkg.maintenance.request.entity.MaintenanceRequest;"
GlobalReplace "import $pkg.maintenance.request.RequestAttachment;"            "import $pkg.maintenance.request.entity.RequestAttachment;"
GlobalReplace "import $pkg.maintenance.request.RequestPriority;"              "import $pkg.maintenance.request.entity.RequestPriority;"
GlobalReplace "import $pkg.maintenance.request.RequestStatus;"                "import $pkg.maintenance.request.entity.RequestStatus;"
GlobalReplace "import $pkg.maintenance.request.RequestAttachmentRepository;"  "import $pkg.maintenance.request.repository.RequestAttachmentRepository;"
GlobalReplace "import $pkg.maintenance.request.MaintenanceRequestRepository;" "import $pkg.maintenance.request.repository.MaintenanceRequestRepository;"
GlobalReplace "import $pkg.maintenance.request.MaintenanceRequestService;"    "import $pkg.maintenance.request.service.MaintenanceRequestService;"

# Maintenance / Visit
GlobalReplace "import $pkg.maintenance.visit.VisitReport;"              "import $pkg.maintenance.visit.entity.VisitReport;"
GlobalReplace "import $pkg.maintenance.visit.VisitReportItem;"          "import $pkg.maintenance.visit.entity.VisitReportItem;"
GlobalReplace "import $pkg.maintenance.visit.VisitReportRepository;"    "import $pkg.maintenance.visit.repository.VisitReportRepository;"
GlobalReplace "import $pkg.maintenance.visit.VisitReportItemRepository;" "import $pkg.maintenance.visit.repository.VisitReportItemRepository;"

# Owner
GlobalReplace "import $pkg.owner.Owner;"                      "import $pkg.owner.entity.Owner;"
GlobalReplace "import $pkg.owner.OwnerRepository;"            "import $pkg.owner.repository.OwnerRepository;"
GlobalReplace "import $pkg.owner.OwnerService;"               "import $pkg.owner.service.OwnerService;"
GlobalReplace "import $pkg.owner.OwnerPropertyAccessService;" "import $pkg.owner.service.OwnerPropertyAccessService;"

# OwnerPortal
GlobalReplace "import $pkg.ownerportal.OwnerPortalService;"              "import $pkg.ownerportal.service.OwnerPortalService;"
GlobalReplace "import $pkg.ownerportal.OwnerPortalDraftContractService;" "import $pkg.ownerportal.service.OwnerPortalDraftContractService;"
GlobalReplace "import $pkg.ownerportal.OwnerStatement;"                  "import $pkg.ownerportal.entity.OwnerStatement;"
GlobalReplace "import $pkg.ownerportal.OwnerStatementRepository;"        "import $pkg.ownerportal.repository.OwnerStatementRepository;"

# Property
GlobalReplace "import $pkg.property.Property;"                        "import $pkg.property.entity.Property;"
GlobalReplace "import $pkg.property.Floor;"                           "import $pkg.property.entity.Floor;"
GlobalReplace "import $pkg.property.PropertyType;"                    "import $pkg.property.entity.PropertyType;"
GlobalReplace "import $pkg.property.PropertyRepository;"              "import $pkg.property.repository.PropertyRepository;"
GlobalReplace "import $pkg.property.FloorRepository;"                 "import $pkg.property.repository.FloorRepository;"
GlobalReplace "import $pkg.property.PropertyService;"                 "import $pkg.property.service.PropertyService;"
GlobalReplace "import $pkg.property.FloorService;"                    "import $pkg.property.service.FloorService;"
GlobalReplace "import $pkg.property.PropertyOwnerPortalRecipientService;" "import $pkg.property.service.PropertyOwnerPortalRecipientService;"
GlobalReplace "import $pkg.property.attachment.PropertyAttachment;"           "import $pkg.property.attachment.entity.PropertyAttachment;"
GlobalReplace "import $pkg.property.attachment.PropertyAttachmentRepository;" "import $pkg.property.attachment.repository.PropertyAttachmentRepository;"
GlobalReplace "import $pkg.property.attachment.PropertyAttachmentService;"    "import $pkg.property.attachment.service.PropertyAttachmentService;"
GlobalReplace "import $pkg.property.attachment.PropertyAttachmentResponse;"   "import $pkg.property.attachment.dto.PropertyAttachmentResponse;"

# Tenant
GlobalReplace "import $pkg.tenant.Tenant;"                    "import $pkg.tenant.entity.Tenant;"
GlobalReplace "import $pkg.tenant.TenantRepository;"          "import $pkg.tenant.repository.TenantRepository;"
GlobalReplace "import $pkg.tenant.TenantService;"             "import $pkg.tenant.service.TenantService;"
GlobalReplace "import $pkg.tenant.TenantOnboardingService;"   "import $pkg.tenant.service.TenantOnboardingService;"
GlobalReplace "import $pkg.tenant.TenantPortalWelcomeService;" "import $pkg.tenant.service.TenantPortalWelcomeService;"

# TenantPortal
GlobalReplace "import $pkg.tenantportal.TenantPortalService;"              "import $pkg.tenantportal.service.TenantPortalService;"
GlobalReplace "import $pkg.tenantportal.RentReceipt;"                      "import $pkg.tenantportal.entity.RentReceipt;"
GlobalReplace "import $pkg.tenantportal.ContractActionRequest;"            "import $pkg.tenantportal.entity.ContractActionRequest;"
GlobalReplace "import $pkg.tenantportal.RentReceiptRepository;"            "import $pkg.tenantportal.repository.RentReceiptRepository;"
GlobalReplace "import $pkg.tenantportal.ContractActionRequestRepository;"  "import $pkg.tenantportal.repository.ContractActionRequestRepository;"
GlobalReplace "import $pkg.tenantportal.ReceiptWithTenantDto;"             "import $pkg.tenantportal.dto.ReceiptWithTenantDto;"
GlobalReplace "import $pkg.tenantportal.RenewalRequestWithDetailsDto;"     "import $pkg.tenantportal.dto.RenewalRequestWithDetailsDto;"

# Unit
GlobalReplace "import $pkg.unit.Unit;"           "import $pkg.unit.entity.Unit;"
GlobalReplace "import $pkg.unit.UnitType;"       "import $pkg.unit.entity.UnitType;"
GlobalReplace "import $pkg.unit.UnitRepository;" "import $pkg.unit.repository.UnitRepository;"
GlobalReplace "import $pkg.unit.UnitService;"    "import $pkg.unit.service.UnitService;"

# User
GlobalReplace "import $pkg.user.User;"                      "import $pkg.user.entity.User;"
GlobalReplace "import $pkg.user.UserExtraRoles;"            "import $pkg.user.entity.UserExtraRoles;"
GlobalReplace "import $pkg.user.UserPropertyAccess;"        "import $pkg.user.entity.UserPropertyAccess;"
GlobalReplace "import $pkg.user.UserPropertyAccessId;"      "import $pkg.user.entity.UserPropertyAccessId;"
GlobalReplace "import $pkg.user.UserRole;"                  "import $pkg.user.entity.UserRole;"
GlobalReplace "import $pkg.user.MaintenanceOfficerType;"    "import $pkg.user.entity.MaintenanceOfficerType;"
GlobalReplace "import $pkg.user.UserPropertyAccessRepository;" "import $pkg.user.repository.UserPropertyAccessRepository;"
GlobalReplace "import $pkg.user.UserRepository;"            "import $pkg.user.repository.UserRepository;"
GlobalReplace "import $pkg.user.PortalProfileBridge;"       "import $pkg.user.service.PortalProfileBridge;"
GlobalReplace "import $pkg.user.UserService;"               "import $pkg.user.service.UserService;"

Write-Host ""
Write-Host "=== REFACTOR COMPLETE ==="
