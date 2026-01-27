#!/bin/bash
# verify_capex.sh - Comprehensive CAPEX Verification Script

BASE_URL="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting CAPEX Verification..."

# 1. Login
echo "1. Logging in..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
MY_USER_ID=$(echo $TOKEN_RESPONSE | jq -r '.user.id')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}Login failed.${NC}"
  echo $TOKEN_RESPONSE
  exit 1
fi
echo -e "${GREEN}Login successful. User ID: $MY_USER_ID${NC}"

# 2. Get Asset Account ID
echo "2. Fetching Accounts..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/finance/accounts" \
  -H "Authorization: Bearer $TOKEN")

# Find an account with type 'asset'. We'll just pick the first one that looks like a fixed asset (1-2xxx usually)
ASSET_ACCOUNT_ID=$(echo $ACCOUNTS_RESPONSE | jq -r '.data[] | select(.code | startswith("1-23")) | .id' | head -n 1) # Mesin & Peralatan
# For the Inventory side, we need an Inventory account too. 
# Usually starts with 1-14
INVENTORY_ACCOUNT_ID=$(echo $ACCOUNTS_RESPONSE | jq -r '.data[] | select(.code | startswith("1-14")) | .id' | head -n 1)

if [ -z "$ASSET_ACCOUNT_ID" ]; then
    echo -e "${RED}No Asset Account found.${NC}"
    exit 1
fi
echo "Asset Account ID: $ASSET_ACCOUNT_ID"

# 3. Create Category with Mapping
echo "3. Creating Category..."
CAT_CODE="CAT-CAPEX-$(date +%s)"
CATEGORY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$CAT_CODE\",
    \"name\": \"Test CAPEX Category\",
    \"main_category\": \"ASET OPERASIONAL\",
    \"sub_category_letter\": \"T\",
    \"display_order\": 1,
    \"asset_account_id\": \"$ASSET_ACCOUNT_ID\"
  }")

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "Category ID: $CATEGORY_ID"

# 4. Create Asset (to attach Work Order to)
echo "4. Creating Asset..."
ASSET_CODE="AST-CAPEX-$(date +%s)"
ASSET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"asset_code\": \"$ASSET_CODE\",
    \"name\": \"Test Asset CAPEX\",
    \"category_id\": \"$CATEGORY_ID\",
    \"status\": \"in_inventory\",
    \"asset_class\": \"machinery\",
    \"purchase_price\": 1000000,
    \"purchase_date\": \"$(date +%Y-%m-%d)\"
  }")

ASSET_ID=$(echo $ASSET_RESPONSE | jq -r '.data.id')
echo "Asset ID: $ASSET_ID"

# 5. Create Work Order
echo "5. Creating Work Order..."
WO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/work-orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
     \"asset_id\": \"$ASSET_ID\",
     \"wo_type\": \"corrective\",
     \"priority\": \"medium\",
     \"problem_description\": \"Test CAPEX Logic\",
     \"scheduled_date\": \"$(date +%Y-%m-%d)\",
     \"due_date\": \"$(date +%Y-%m-%d)\"
  }")

WO_ID=$(echo $WO_RESPONSE | jq -r '.data.id')
WO_NUMBER=$(echo $WO_RESPONSE | jq -r '.data.wo_number')
echo "Work Order ID: $WO_ID (Number: $WO_NUMBER, Status: $(echo $WO_RESPONSE | jq -r '.data.status'))"

# 6. Lifecycle: Approve, Assign, and Start
echo "6. Processing Lifecycle (Approve -> Assign -> Start)..."
curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/approve" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/assign/$MY_USER_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/start" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "Work Order is now IN_PROGRESS"

# 7. Add Part (CAPEX)
echo "7. Adding CAPEX Part from Inventory..."
ITEMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/inventory/items" \
  -H "Authorization: Bearer $TOKEN")
ITEM_ID=$(echo $ITEMS_RESPONSE | jq -r '.data[0].id')
ITEM_NAME=$(echo $ITEMS_RESPONSE | jq -r '.data[0].name')

if [ "$ITEM_ID" == "null" ]; then
    echo -e "${RED}No Inventory Item found. Ensure you have seeded inventory.${NC}"
    exit 1
fi

PART_RESPONSE=$(curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/parts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"part_name\": \"$ITEM_NAME\",
    \"quantity\": 1,
    \"unit_cost\": 500000,
    \"inventory_item_id\": \"$ITEM_ID\",
    \"expense_type\": \"CAPEX\" 
  }")

PART_ID=$(echo $PART_RESPONSE | jq -r '.id')
echo "Part Added (ID: $PART_ID, Type: $(echo $PART_RESPONSE | jq -r '.expense_type'))"

# 8. Complete and Verify
echo "8. Completing and Verifying Work Order..."
curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"work_performed": "Replaced part as CAPEX"}' > /dev/null

curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"labor_cost": 100000}' > /dev/null

echo "Work Order is now VERIFIED"

# 9. Finalize Work Order
echo "9. Finalizing Work Order..."
# This generates the AssetExpense and the Journal Entry for Inventory Usage
FINALIZE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/work-orders/$WO_ID/finalize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"labor_expense_type\": \"OPEX\",
    \"parts\": []
  }")

CAPEX_EXPENSE_ID=$(echo $FINALIZE_RESPONSE | jq -r '.data.capex_expense_id')
echo "Finalized. CAPEX Expense ID: $CAPEX_EXPENSE_ID"

# 10. Approve the Expense (to trigger Asset Value update if needed)
# Although Journal Entry for inventory is created during finalize_completion
echo "10. Approving CAPEX Expense..."
if [ "$CAPEX_EXPENSE_ID" != "null" ]; then
    # Two-level approval
    curl -s -X POST "$BASE_URL/api/expenses/$CAPEX_EXPENSE_ID/approve" \
      -H "Authorization: Bearer $TOKEN" -d '{"notes": "L1 Approve"}' -H "Content-Type: application/json" > /dev/null
    curl -s -X POST "$BASE_URL/api/expenses/$CAPEX_EXPENSE_ID/approve" \
      -H "Authorization: Bearer $TOKEN" -d '{"notes": "L2 Approve"}' -H "Content-Type: application/json" > /dev/null
    echo "Expense Approved."
fi

# 11. Verifying Journal Entry for Inventory Usage...
echo "11. Verifying Journal Entry for Inventory Usage..."
sleep 2
# Get latest journals
JOURNALS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/finance/journals?limit=10" \
  -H "Authorization: Bearer $TOKEN")

# Find the journal entry related to this Work Order (Direct Array)
MY_JOURNAL_HEADER=$(echo $JOURNALS_RESPONSE | jq -r ".[] | select(.reference == \"$WO_NUMBER\")")

if [ -z "$MY_JOURNAL_HEADER" ] || [ "$MY_JOURNAL_HEADER" == "" ]; then
    echo -e "${RED}FAILURE: Journal Entry not found for reference $WO_NUMBER.${NC}"
    # Debug: show all journals with references if any
    echo "Existing journals with references:"
    echo $JOURNALS_RESPONSE | jq -r '.[] | select(.reference != null) | {transaction_number, reference}'
    exit 1
fi

JOURNAL_ID=$(echo $MY_JOURNAL_HEADER | jq -r '.id')
echo "Found Journal: $(echo $MY_JOURNAL_HEADER | jq -r '.description') ($JOURNAL_ID)"

# Fetch Details to see lines
JOURNAL_DETAILS=$(curl -s -X GET "$BASE_URL/api/finance/journals/$JOURNAL_ID" \
  -H "Authorization: Bearer $TOKEN")

# Check if debit account matches asset account
DEBIT_ACCOUNT=$(echo $JOURNAL_DETAILS | jq -r '.lines[] | select(.debit > 0) | .account_id')

if [ "$DEBIT_ACCOUNT" == "$ASSET_ACCOUNT_ID" ]; then
    echo -e "${GREEN}SUCCESS: Journal Entry correctly debited the Asset Account ($DEBIT_ACCOUNT).${NC}"
else
    echo -e "${RED}FAILURE: Debit Account ($DEBIT_ACCOUNT) does not match expected Asset Account ($ASSET_ACCOUNT_ID).${NC}"
    echo "Expected: $ASSET_ACCOUNT_ID"
    echo "Full Journal Details:"
    echo $JOURNAL_DETAILS | jq .
fi

echo -e "\n${GREEN}CAPEX Verification Completed.${NC}"
