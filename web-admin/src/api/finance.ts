import { api } from './client';

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

export const financeApi = {
    listAccounts: async () => {
        const response = await api.get('/finance/accounts');
        return response.data.data as ChartOfAccount[];
    },

    listTree: async () => {
        const response = await api.get('/finance/accounts/tree');
        return response.data.data as ChartOfAccount[];
    },

    createAccount: async (data: CreateAccountRequest) => {
        const response = await api.post('/finance/accounts', data);
        return response.data.data as ChartOfAccount;
    },

    updateAccount: async (id: string, data: UpdateAccountRequest) => {
        const response = await api.put(`/finance/accounts/${id}`, data);
        return response.data.data as ChartOfAccount;
    },

    getGeneralLedger: async (accountId: string, startDate?: string, endDate?: string) => {
        const response = await api.get(`/finance/reports/ledger/${accountId}`, {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data.data as GeneralLedgerEntry[];
    },

    getTrialBalance: async () => {
        const response = await api.get('/finance/reports/trial-balance');
        return response.data.data as TrialBalanceEntry[];
    },

    getBalanceSheet: async () => {
        const response = await api.get('/finance/reports/balance-sheet');
        return response.data.data as FinancialReportEntry[];
    },

    getIncomeStatement: async () => {
        const response = await api.get('/finance/reports/income-statement');
        return response.data.data as FinancialReportEntry[];
    },

    // Operational Finance
    listSalesInvoices: async () => {
        const response = await api.get('/finance/sales/invoices');
        return response.data.data;
    },
    listPurchaseBills: async () => {
        const response = await api.get('/finance/purchase/bills');
        return response.data.data;
    },
    listExpenses: async () => {
        const response = await api.get('/finance/expenses');
        return response.data.data;
    },
    listCashBankTransactions: async () => {
        const response = await api.get('/finance/cash-bank');
        return response.data.data;
    },

    createSalesInvoice: async (data: any) => {
        const response = await api.post('/finance/sales/invoices', data);
        return response.data.data;
    },
    createPurchaseBill: async (data: any) => {
        const response = await api.post('/finance/purchase/bills', data);
        return response.data.data;
    },
    createExpense: async (data: any) => {
        const response = await api.post('/finance/expenses', data);
        return response.data.data;
    },
    // Sales Quotes
    listSalesQuotes: async () => {
        const response = await api.get('/finance/sales/quotes');
        return response.data;
    },
    createSalesQuote: async (data: any) => {
        const response = await api.post('/finance/sales/quotes', data);
        return response.data;
    },

    // Sales Orders
    listSalesOrders: async () => {
        const response = await api.get('/finance/sales/orders');
        return response.data;
    },
    createSalesOrder: async (data: any) => {
        const response = await api.post('/finance/sales/orders', data);
        return response.data;
    },

    // Sales Shipments
    listSalesShipments: async () => {
        const response = await api.get('/finance/sales/shipments');
        return response.data;
    },
    createSalesShipment: async (data: any) => {
        const response = await api.post('/finance/sales/shipments', data);
        return response.data;
    },

    // Purchase Quotes
    listPurchaseQuotes: async () => {
        const response = await api.get('/finance/purchase/quotes');
        return response.data;
    },
    createPurchaseQuote: async (data: any) => {
        const response = await api.post('/finance/purchase/quotes', data);
        return response.data;
    },

    // Purchase Orders
    listPurchaseOrders: async () => {
        const response = await api.get('/finance/purchase/orders');
        return response.data;
    },
    createPurchaseOrder: async (data: any) => {
        const response = await api.post('/finance/purchase/orders', data);
        return response.data;
    },

    // Purchase Shipments
    listPurchaseShipments: async () => {
        const response = await api.get('/finance/purchase/shipments');
        return response.data;
    },
    createPurchaseShipment: async (data: any) => {
        const response = await api.post('/finance/purchase/shipments', data);
        return response.data;
    },

    createCashBankTransaction: async (data: CreateCashBankTransactionRequest) => {
        const response = await api.post('/finance/cash-bank', data);
        return response.data;
    },
};
