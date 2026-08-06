import type { DecimalString } from '../utils/decimal';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export type DocumentLifecycleState = 'draft' | 'submitted' | 'cancelled';
export type BusinessPaymentState = 'unpaid' | 'partially_paid' | 'paid';
export type PostingState = 'unposted' | 'posted';

export interface ChartOfAccount {
    id: string;
    code: string;
    name: string;
    account_type: AccountType;
    normal_balance: NormalBalance;
    parent_id?: string;
    is_active: boolean;
    description?: string;
    currency: string;
    children?: ChartOfAccount[];
}

export interface CreateAccountRequest {
    code: string;
    name: string;
    account_type: AccountType;
    normal_balance: NormalBalance;
    parent_id?: string;
    description?: string;
    currency?: string;
}

export interface UpdateAccountRequest {
    name?: string;
    parent_id?: string;
    is_active?: boolean;
    description?: string;
}

export interface GeneralLedgerEntry {
    date: string;
    transaction_number: string;
    header_description: string;
    line_description?: string;
    debit: DecimalString;
    credit: DecimalString;
    balance: DecimalString;
}

export interface TrialBalanceEntry {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: AccountType;
    debit: DecimalString;
    credit: DecimalString;
}

export interface FinancialReportEntry {
    account_code: string;
    account_name: string;
    balance: DecimalString;
}

export interface CreateCashBankTransactionRequest {
    transaction_type: 'transfer' | 'receive' | 'send';
    date: string;
    amount: DecimalString;
    from_account_id?: string;
    to_account_id?: string;
    account_id?: string;
    contact_name?: string;
    description?: string;
}

// --- Sales Invoice DTOs (QARC-011 & 3R.1.1-003) ---

export interface SalesInvoiceItem {
    id: string;
    invoice_id: string;
    description: string;
    quantity: DecimalString;
    unit_price: DecimalString;
    total_price: DecimalString;
    account_id?: string;
}

export interface CreateInvoiceItemRequest {
    description: string;
    quantity: DecimalString;
    unit_price: DecimalString;
    account_id?: string;
}

export interface SalesInvoice {
    id: string;
    invoice_number: string;
    client_id: string;
    date: string;
    due_date?: string;
    subject?: string;
    subtotal: DecimalString;
    tax: DecimalString;
    total_amount: DecimalString;
    amount_paid: DecimalString;
    status: string;
    journal_status?: 'draft' | 'posted' | null;
    journal_entry_id?: string | null;
    created_at: string;
    attachment_url?: string;
    items?: SalesInvoiceItem[];
}

export interface CreateSalesInvoiceRequest {
    invoice_number: string;
    client_id: string;
    date: string;
    due_date?: string;
    subject?: string;
    items: CreateInvoiceItemRequest[];
    attachment_url?: string;
}

export interface UpdateSalesInvoiceRequest {
    invoice_number: string;
    client_id: string;
    date: string;
    due_date?: string;
    subject?: string;
    items: CreateInvoiceItemRequest[];
    attachment_url?: string;
}

// --- Purchase Bill DTOs (QARC-011 & 3R.1.1-003) ---

export interface PurchaseBillItem {
    id: string;
    bill_id: string;
    description: string;
    quantity: DecimalString;
    unit_price: DecimalString;
    total_price: DecimalString;
    account_id?: string;
}

export interface CreatePurchaseBillRequest {
    bill_number: string;
    vendor_id: string;
    date: string;
    due_date?: string;
    budget_type?: string;
    account_payable_id?: string;
    items: CreateInvoiceItemRequest[];
    attachment_url?: string;
}

export interface PurchaseBill {
    id: string;
    bill_number: string;
    vendor_id: string;
    date: string;
    due_date?: string;
    total_amount: DecimalString;
    amount_paid: DecimalString;
    status: string;
    budget_type: string;
    journal_entry_id?: string | null;
    created_at: string;
    attachment_url?: string;
}

export interface Expense {
    id: string;
    expense_number: string;
    date: string;
    pay_from_account_id: string;
    recipient?: string;
    total_amount: DecimalString;
    status: string;
    expense_type?: string;
    journal_entry_id?: string | null;
    created_at: string;
    attachment_url?: string;
}

export interface CashBankTransaction {
    id: string;
    transaction_number: string;
    transaction_type: string;
    date: string;
    amount: DecimalString;
    from_account_id?: string;
    to_account_id?: string;
    account_id?: string;
    contact_name?: string;
    description?: string;
    journal_entry_id?: string | null;
    created_at: string;
}
