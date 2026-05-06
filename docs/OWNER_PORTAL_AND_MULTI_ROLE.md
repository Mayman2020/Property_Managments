# Owner portal visibility, notifications, and multi-role (roadmap)

## What the product expects

- When an **owner** is linked to a **property** (including co-owners via `property_owners`) and has a **portal user** (`owners.user_id`, `portal_access = true`), they should see **operational signal** for that property: maintenance, and over time **leases, rent, vacancies**, similar to how a **property-scoped manager** would — but **only for their properties**, not the whole company.
- On **first portal link** (new user or first `user_id` on the owner record), the owner should see an **in-app notification** explaining access and listing **property names** already linked to that owner record.
- **Same human as owner + general manager** is a real case: today the schema has **one `role` per `users` row**. True multi-role needs either **two accounts** (two emails) or a future **`user_roles`** (or similar) table plus merged permissions and JWT claims.

## Implemented in code (current increment)

| Area | Behaviour |
|------|-----------|
| **Maintenance notifications** | Recipients for property owners are resolved with **`PropertyOwnerPortalRecipientService`**: all `property_owners` with `owners.user_id` set, **`portal_access`**, **`is_active`**, plus the **legacy** `properties.owner_id` row when it still points at an eligible owner. Replaces the old logic that only followed **`properties.owner_id`** (so co-owners were often missed). |
| **Visit rating** | Owners on that property are included with super-admin / property GM when a tenant submits a rating. |
| **Owner welcome** | **`OwnerService`** sends a **`GENERAL`** notification when a portal user is first linked (`create`, `update` from no user → user, or `linkUser` when link/portal changes). Lists active property names from `property_owners` ∪ primary `owner_id`. Title and body are stored **Arabic + English** (`BilingualNotificationText`). |
| **Employee property assignment** | When **`UserService.create`** (or **`update`** when the employee first gets a property or the property changes) links a user to a **property** and the role is property-scoped staff, a **`GENERAL`** in-app notification names the property and role. Same bilingual persistence. |
| **Tenant portal welcome** | **`TenantPortalWelcomeService`**: on first **`user_id`** link (`TenantService` create/update), tenant gets unit + property and, if an **ACTIVE** lease exists, contract number + first payment line. **`LeaseContractService.activate`** calls **`notifyLeaseActivated`**. Same bilingual persistence. |

## Not implemented yet (explicit backlog)

1. **Lease / rent / finance notifications** to owners (`CONTRACT_ACTIVATED`, `PAYMENT_RECEIVED`, rent due, etc.) — wire `NotificationService.createForRecipients` from `LeaseContractService` / `RentPaymentService` using the same **`PropertyOwnerPortalRecipientService`**.
2. **Owner UI / permissions** expanded to “like GM but scoped” (read contracts, approvals) — today **`RolePermissionService`** defines a narrower `OWNER` map; extend + enforce **property scope** on every API.
3. **Multi-role per login** — design `user_roles` (user_id, role, optional property_id), migrate JWT + `PermissionService`, and frontend guards.

## Engineering rule

Whenever a new event should reach **“whoever owns this property”**, resolve recipients with **`PropertyOwnerPortalRecipientService.portalRecipientUserIds(propertyId)`** instead of re-implementing owner lookup.

See also: `docs/SECURITY_AND_DATA_INTEGRITY.md`.
