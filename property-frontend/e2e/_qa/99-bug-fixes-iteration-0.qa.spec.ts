/**
 * Iteration 0 — bug-fix log entries.
 *
 * One row per fix applied during iteration 0 so the Excel QA report has a
 * `Fixed` row referencing files changed. Retest happens by re-running the
 * bootstrap spec; if the bootstrap is green, the fix is retested green.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';

const ITER = 0;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: '-',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
    status: 'Fixed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

test.describe('Iteration 0 — bug-fix log', () => {
  test('BUG-001 employee_code collision on rapid create', async ({ api }) => {
    // Sanity: superadmin still authenticates after backend was patched + reloaded.
    const token = await api.loginRole('SUPER_ADMIN');
    expect(token.length).toBeGreaterThan(20);

    recordRow(row({
      module: 'users',
      route: 'POST /users (role in EMPLOYEE_ROLES)',
      scenario: 'Creating two employee-role users in the same second produced HTTP 500 due to unique-constraint violation on employees.employee_code (UserService.autoCreateEmployee built the code from yyyyMMddHHmmss).',
      steps: 'Bootstrap created MAINTENANCE_OFFICER_INTERNAL, PROPERTY_GUARD, PROCEDURES_CLERK in quick succession via POST /users — DB rejected duplicate employee_code; backend wrapped the exception as 500.',
      testData: 'Three POST /users in <500ms, all with role mapping to EMPLOYEE_ROLES',
      expected: '201 Created with unique employee_code per user',
      actual: '500 INTERNAL_ERROR (duplicate key value violates unique constraint "employees_employee_code_key")',
      severity: 'High',
      status: 'Fixed',
      bugSummary: 'autoCreateEmployee timestamp-based code collides on rapid creates → HTTP 500',
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/modules/user/service/UserService.java',
      retestResult: 'Backend recompiled + DevTools restarted; bootstrap created MAINTENANCE_OFFICER_INTERNAL/PROPERTY_GUARD/PROCEDURES_CLERK successfully (HTTP 201 each).',
      notes: 'Switched to codeGenerationService.generate("EMP") — same mechanism used for PROPERTY/UNIT/MR/CNT/INV codes.'
    }));
  });
});
