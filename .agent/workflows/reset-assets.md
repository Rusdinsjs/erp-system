---
description: How to reset the asset database to a clean state
---

# Reset Asset Database

## Purpose

This workflow clears all asset data (and related records like maintenance, loans, logs) from the database to allow for a clean import or fresh start.

## Steps

// turbo

1. Executing the Reset Script via Podman:

```powershell
Get-Content scripts/reset_assets.sql | podman exec -i mgmt-db psql -U postgres -d management_system
```

## Verification

1. Check that the assets table is empty:

```powershell
podman exec -i mgmt-db psql -U postgres -d management_system -c "SELECT count(*) FROM assets;"
```

Expected output: `0`
