/**
 * Iteration 7 bug-fix record spec.
 *
 * Permanent QA evidence for fixes shipped in iteration 7.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 7;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'bug-fixes',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Medium',
    status: 'Fixed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

interface ApiEnvelope { success: boolean; errorCode?: string; message?: string; }

test.describe.serial('Iteration 7 — Bug fixes (record)', () => {
  test('BUG-012 GlobalExceptionHandler missing handlers for date/parameter/body parse errors — every malformed input surfaced as HTTP 500 INTERNAL_ERROR instead of HTTP 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];

    // 1) Bad expenseDate goes through LocalDate.parse → DateTimeParseException.
    const badDate = await api.raw('POST', '/finance/expenses', {
      propertyId,
      description: 'BUG-012 retest — bad date',
      amount: 1,
      expenseDate: 'not-a-date',
      categoryId: 1
    });
    const badDateCode = (badDate.body as ApiEnvelope).errorCode;

    // 2) Bad LocalDate query param goes through Spring conversion →
    //    MethodArgumentTypeMismatchException.
    const badParam = await api.raw('GET', '/finance/export/csv?from=garbage&to=2026-01-01&type=ALL');
    const badParamCode = (badParam.body as ApiEnvelope).errorCode;

    // 3) Missing required query param → MissingServletRequestParameterException.
    const missing = await api.raw('GET', '/finance/export/csv?to=2026-12-31&type=ALL');
    const missingCode = (missing.body as ApiEnvelope).errorCode;

    const allClean =
      badDate.status === 400 && badDateCode === 'INVALID_DATE_FORMAT' &&
      badParam.status === 400 && badParamCode === 'INVALID_PARAMETER' &&
      missing.status === 400 && missingCode === 'MISSING_PARAMETER';

    recordRow(row({
      module: 'platform',
      route: 'GlobalExceptionHandler — DateTimeParseException / MethodArgumentTypeMismatchException / MissingServletRequestParameterException / HttpMessageNotReadableException',
      scenario:
        'GlobalExceptionHandler only had handlers for AppException, MethodArgumentNotValid, AccessDenied/Authentication, DataIntegrity, NoHandlerFound/NoResourceFound and HttpRequestMethodNotSupported. Every other Spring-thrown 4xx-by-design exception (date parse failure, query param type mismatch, missing required query param, malformed JSON body) fell through to handleGeneral and surfaced as HTTP 500 with errorCode INTERNAL_ERROR. This violated the API contract and made distinguishing real server errors from validation problems impossible in monitoring.',
      steps:
        'Add @ExceptionHandler entries for DateTimeParseException (→ INVALID_DATE_FORMAT), MethodArgumentTypeMismatchException (→ INVALID_PARAMETER), MissingServletRequestParameterException (→ MISSING_PARAMETER) and HttpMessageNotReadableException (→ INVALID_REQUEST_BODY). Add localized messages.properties + messages_ar.properties entries.',
      testData: `badDate=${badDate.status}/${badDateCode} badParam=${badParam.status}/${badParamCode} missing=${missing.status}/${missingCode}`,
      expected: 'All three calls return HTTP 400 with the matching errorCode.',
      actual: `badDate=${badDate.status}/${badDateCode}, badParam=${badParam.status}/${badParamCode}, missing=${missing.status}/${missingCode}`,
      filesChanged:
        'property-backend/src/main/java/com/propertymanagement/shared/exception/GlobalExceptionHandler.java, property-backend/src/main/resources/messages.properties, property-backend/src/main/resources/messages_ar.properties',
      retestResult: allClean ? 'all three parse/validation paths now return clean 400 with structured errorCode' : 'one or more still leaking as 500',
      severity: 'Medium',
      status: allClean ? 'Fixed' : 'Failed'
    }));
    expect(allClean).toBe(true);
  });
});
