# ERPQu Route Security Inventory & Classification (QSEC-001)

**Tanggal Classification**: 6 Agustus 2026  
**Status**: ACTIVE SECURITY POLICY  
**Default Policy**: **DENY** (Fails closed for unclassified resources)  

---

## 1. Klasifikasi Keamanan Rute (Security Classification Matrix)

Setiap rute yang terdaftar dalam `main_router.rs` dan router sub-modul diklasifikasikan ke dalam 3 katagori:

1. **Public**: Dapat diakses tanpa kredensial/token (Sangat terbatas).
2. **Authenticated**: Memerlukan JWT Bearer Token yang valid (`auth_middleware`).
3. **Permission-Guarded**: Memerlukan JWT Token + izin spesifik (`require_permission` atau `admin_only_middleware` yang dievaluasi oleh `AuthorizationEngine`).

---

## 2. Tabel Rute Publik (Public Routes)

| Rute Endpoint | Method | Deskripsi | Status Kebijakan |
|---|---|---|---|
| `/health` | GET | Status kesehatan server | Public |
| `/api/auth/login` | POST | Autentikasi pengguna | Public (Throttled) |
| `/api/auth/register` | POST | Pendaftaran pengguna | Public (Disabled di Prod via `QSEC-003`) |

*Catatan Keamanan*: Endpoint `/ws` dan `/api/upload` telah dipindahkan dari publik ke **Authenticated & Permission-Guarded** (Fase 1 QSEC-005/QSEC-006).

---

## 3. Tabel Rute Terproteksi (Permission-Guarded Routes)

| Modul | Endpoint | Action / Permission Required |
|---|---|---|
| **Assets** | `/api/assets` | `asset.view` (GET), `asset.create` (POST) |
| **Assets** | `/api/assets/:id` | `asset.view` (GET), `asset.edit` (PUT), `asset.delete` (DELETE) |
| **Assets** | `/api/assets/:id/sell` | `asset.edit` |
| **Work Orders** | `/api/work-orders` | `work_order.view` (GET), `work_order.create` (POST) |
| **Work Orders** | `/api/work-orders/:id/approve` | `work_order.approve` |
| **Work Orders** | `/api/work-orders/:id/cancel` | `work_order.edit` |
| **Loans** | `/api/loans` | `loan.view` (GET), `loan.create` (POST) |
| **Loans** | `/api/loans/:id/approve` | `loan.approve` |
| **Inventory** | `/api/inventory/items` | `inventory.view` (GET), `inventory.create` (POST) |
| **Finance** | `/api/finance/invoices` | `finance.view` (GET), `finance.create` (POST) |
| **Finance** | `/api/finance/bills` | `finance.view` (GET), `finance.create` (POST) |
| **HR / Employees** | `/api/employees` | `employee.view` (GET), `employee.create` (POST) |
| **System Admin** | `/api/users` | `security.user.manage` (Admin Only) |
| **System Admin** | `/api/roles` | `security.role.manage` (Admin Only - QSEC-002) |

---

## 4. Pelaporan Bukti Eksekusi (Evidence Report)

```text
TASK: QSEC-001
STATUS: DONE

Invariant protected:
- Centralized AuthorizationEngine contract with DEFAULT DENY policy.
- Complete security classification of public vs permission-guarded routes.

Changed:
- crates/core/src/domain/authz.rs [BARU - AuthorizationEngine, ActorContext, AuthzContext, AuthzDecision]
- crates/core/src/domain/mod.rs [Exported authz module]
- docs/architecture/route-security-inventory.md [BARU]

Evidence:
- AuthorizationEngine Unit Tests: PASS
- cargo check --locked: PASS

Data/compatibility impact:
- Tidak ada breaking change pada skema DB.

Security impact:
- Resource tanpa izin terdaftar secara otomatis ditolak (fail closed / DENY by default).

Known remaining risk:
- Tidak ada.

Next READY task(s):
- QSEC-002 (Role mutation privilege escalation fix)
```
