## Legacy / Orphan Code Report

| File/Module | Used by | Safe to remove? | Risk | Recommendation |
|---|---|---|---|---|
| `notification/NotificationTemplate*` stack | No runtime usage found in current notification flow | Likely yes | Medium | Mark deprecated now; remove in dedicated cleanup PR after telemetry window. |
| `contract/fee/ContractFee*` stack | Backend orphan signals; frontend contract-fees API mismatch | Not yet | High | Decide keep vs remove first; avoid deletion in stabilization pass. |
| Vendor module (`/vendors`) | No frontend usage found | Not yet | Medium | Keep, mark candidate for deprecation pending API consumer confirmation. |
| Tenant legacy contract components | Superseded by `my-contracts` flow | Possibly | Medium | Keep until UI owners confirm no hidden deep links; then remove with tests. |
| `assets/i18n/ar-part1.json` | Not loaded by current i18n loader | Likely yes | Low | Safe candidate for removal in cleanup-only PR. |
| Old petty-cash keys in i18n | Stale translation debt | Yes (keys only) | Low | Remove in i18n debt cleanup pass after key usage scan. |

Policy used in this sprint:
- No hard deletes for uncertain modules.
- Report-first + scoped fixes only.

