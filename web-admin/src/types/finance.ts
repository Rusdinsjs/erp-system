export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

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
    debit: number;
    credit: number;
    balance: number;
}

export interface TrialBalanceEntry {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: AccountType;
    debit: number;
    credit: number;
}

export interface FinancialReportEntry {
    account_code: string;
    account_name: string;
    balance: number;
}

export interface CreateCashBankTransactionRequest {
    transaction_type: 'transfer' | 'receive' | 'send';
    date: string;
    amount: number;
    from_account_id?: string;
    to_account_id?: string;
    account_id?: string;
    contact_name?: string;
    description?: string;
}
