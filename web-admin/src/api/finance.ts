import { api } from './http';
import type {
    ChartOfAccount,
    AccountType,
    NormalBalance,
    CreateAccountRequest,
    UpdateAccountRequest,
    GeneralLedgerEntry,
    TrialBalanceEntry,
    FinancialReportEntry,
    CreateCashBankTransactionRequest
} from '../types';

export type {
    ChartOfAccount,
    AccountType,
    NormalBalance,
    CreateAccountRequest,
    UpdateAccountRequest,
    GeneralLedgerEntry,
    TrialBalanceEntry,
    FinancialReportEntry,
    CreateCashBankTransactionRequest
};

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
