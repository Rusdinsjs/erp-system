---
description: How to migrate Mantine components to pure Tailwind CSS
---

# Tailwind CSS Migration Workflow

This workflow guides you through migrating Mantine components to pure Tailwind CSS components.

## UI Components Available

The following pure Tailwind components are available in `/src/components/ui/`:

| Component | Usage | Replaces Mantine |
|-----------|-------|------------------|
| `Button` | `<Button variant="primary">Click</Button>` | `@mantine/core Button` |
| `Input` | `<Input label="Name" />` | `@mantine/core TextInput` |
| `Select` | `<Select options={[]} />` | `@mantine/core Select` |
| `Textarea` | `<Textarea label="Notes" />` | `@mantine/core Textarea` |
| `Modal` | `<Modal isOpen={open} onClose={fn} />` | `@mantine/core Modal` |
| `Table, TableHead, TableBody, TableRow, TableTh, TableTd` | `<Table>...</Table>` | `@mantine/core Table` |
| `Badge, StatusBadge` | `<Badge variant="success">Active</Badge>` | `@mantine/core Badge` |
| `Card, CardHeader, CardTitle, CardContent, CardFooter` | `<Card>...</Card>` | `@mantine/core Paper/Card` |
| `Spinner, LoadingOverlay, PageLoading` | `<LoadingOverlay visible={true} />` | `@mantine/core LoadingOverlay` |
| `Tabs, TabsList, TabsTrigger, TabsContent` | `<Tabs defaultValue="tab1">...</Tabs>` | `@mantine/core Tabs` |
| `useToast` | `const { success } = useToast()` | `@mantine/notifications` |
| `ActionIcon` | `<ActionIcon variant="danger">...</ActionIcon>` | `@mantine/core ActionIcon` |
| `Pagination` | `<Pagination currentPage={1} totalPages={10} />` | `@mantine/core Pagination` |
| `Checkbox` | `<Checkbox label="Accept" />` | `@mantine/core Checkbox` |
| `NumberInput` | `<NumberInput label="Amount" prefix="Rp " />` | `@mantine/core NumberInput` |
| `DateInput` | `<DateInput label="Date" />` | `@mantine/dates DateInput` |

## Migration Steps

### Step 1: Update Imports
```tsx
// Before (Mantine)
import { Button, TextInput, Table, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';

// After (Tailwind)
import { Button, Input, Table, TableHead, TableBody, TableRow, TableTh, TableTd, Badge, useToast } from '../components/ui';
```

### Step 2: Replace Components

#### Button
```tsx
// Before
<Button leftSection={<IconPlus />} onClick={fn}>Add</Button>

// After
<Button leftIcon={<Plus size={16} />} onClick={fn}>Add</Button>
```

#### TextInput
```tsx
// Before
<TextInput label="Name" placeholder="Enter name" {...form.getInputProps('name')} />

// After
<Input label="Name" placeholder="Enter name" value={form.values.name} onChange={(e) => form.setFieldValue('name', e.target.value)} error={form.errors.name} />
```

#### Table
```tsx
// Before
<Table>
  <Table.Thead>
    <Table.Tr><Table.Th>Name</Table.Th></Table.Tr>
  </Table.Thead>
  <Table.Tbody>
    <Table.Tr><Table.Td>John</Table.Td></Table.Tr>
  </Table.Tbody>
</Table>

// After
<Table>
  <TableHead>
    <TableRow><TableTh>Name</TableTh></TableRow>
  </TableHead>
  <TableBody>
    <TableRow><TableTd>John</TableTd></TableRow>
  </TableBody>
</Table>
```

#### Notifications
```tsx
// Before
import { notifications } from '@mantine/notifications';
notifications.show({ title: 'Success', message: 'Done', color: 'green' });

// After
import { useToast } from '../components/ui';
const { success } = useToast();
success('Done', 'Success');
```

### Step 3: Replace Icons
```tsx
// Before (@tabler/icons-react)
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

// After (lucide-react) - lighter bundle
import { Plus, Edit, Trash } from 'lucide-react';
```

### Step 4: Replace Layout Components
```tsx
// Before (Mantine)
<Group justify="space-between">
  <Stack gap="sm">...</Stack>
</Group>

// After (Tailwind)
<div className="flex items-center justify-between">
  <div className="flex flex-col gap-2">...</div>
</div>
```

## Pages Already Migrated
- [x] Dashboard.tsx
- [x] LoginPage.tsx
- [x] AdminDashboard.tsx (Includes StatCard, RecentActivity, DashboardCharts)
- [x] Assets.tsx
- [x] WorkOrders.tsx
- [x] Users.tsx
- [x] Employees.tsx
- [x] Clients.tsx
- [x] Locations.tsx
- [x] Profile.tsx
- [x] Loans.tsx
- [x] ApprovalCenter.tsx
- [x] ConversionRequests.tsx
- [x] AuditMode.tsx
- [x] WorkOrderDetails.tsx
- [x] Reports.tsx
- [x] AssetLifecycle.tsx
- [x] Categories.tsx
- [x] Rentals.tsx
- [x] RentalDetail.tsx
- [x] RentalForm.tsx
- [x] MainLayout.tsx (App Shell)
- [x] Login.tsx
- [x] NotificationBell.tsx
- [x] AssetForm.tsx
- [x] WorkOrderForm.tsx
- [x] AssetROI.tsx
- [x] ImportAssetsModal.tsx
- [x] PriceList.tsx (Rentals)
- [x] BillingReviewDetail.tsx (Rentals)
- [x] src/components/Rentals/TimesheetReviewer.tsx
- [x] src/contexts/WebSocketContext.tsx (Remove @mantine/notifications)
- [x] src/api/client.ts (Remove @mantine/notifications)
- [x] src/main.tsx (Remove MantineProvider and clean imports)
- [x] Uninstall @mantine packages

## Migration Complete 🎉
All components have been migrated to Pure Tailwind CSS.
Mantine has been fully uninstalled.

## Notes
- Mantine hooks like `useDebouncedValue` can still be used (or replaced with `use-debounce`)
- Replace Mantine Grid with Tailwind grid classes
- Replace Mantine spacing (gap, mb, mt) with Tailwind equivalents
