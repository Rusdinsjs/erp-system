---
description: Work Order workflow and lifecycle integration
---

# Work Order Workflow

## Status Flow

```
PENDING → APPROVED → ASSIGNED → IN_PROGRESS → COMPLETED
                                     ↓
                                  ON_HOLD
     ↓
CANCELLED (from any status)
```

## Status Transitions

| From | To | Action | Role Required |
|------|-----|--------|---------------|
| PENDING | APPROVED | Approve WO | Supervisor/Manager |
| APPROVED | ASSIGNED | Assign technician | Supervisor |
| ASSIGNED | IN_PROGRESS | Start work | Technician |
| IN_PROGRESS | COMPLETED | Complete work | Technician |
| IN_PROGRESS | ON_HOLD | Pause work | Technician |
| Any | CANCELLED | Cancel WO | Manager |

## Lifecycle Integration

When WO starts (`IN_PROGRESS`):
- `maintenance`, `preventive`, `pm` → Asset becomes `under_maintenance`
- `repair`, `corrective`, `cm` → Asset becomes `under_repair`

When WO completes (`COMPLETED`):
- Asset returns to `deployed`

## API Endpoints

```bash
# List work orders
GET /api/work-orders

# Create work order
POST /api/work-orders

# Get single work order
GET /api/work-orders/:id

# Approve work order
POST /api/work-orders/:id/approve

# Assign technician
POST /api/work-orders/:id/assign

# Start work
POST /api/work-orders/:id/start

# Complete work
POST /api/work-orders/:id/complete
```

## Example Flow

```bash
# 1. Create WO
POST /api/work-orders
{ "asset_id": "...", "wo_type": "maintenance", "priority": "high" }

# 2. Approve (Supervisor)
POST /api/work-orders/:id/approve

# 3. Assign technician
POST /api/work-orders/:id/assign
{ "technician_id": "..." }

# 4. Start work (asset transitions to under_maintenance)
POST /api/work-orders/:id/start

# 5. Complete (asset transitions back to deployed)
POST /api/work-orders/:id/complete
{ "work_performed": "Replaced filter", "actual_cost": 150000 }
```
Approval Center - Integrasi lifecycle approvals dengan halaman Approval Center yang sudah ada
Email/Notifikasi - Notifikasi ke approver ketika ada request baru
Approval History - Tracking siapa yang approve/reject dan kapan
Revoke/Cancel - Fitur untuk membatalkan approval request yang pending