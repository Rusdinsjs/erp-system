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
    CreateCashBankTransactionRequest,
    SalesInvoice,
    SalesInvoiceItem,
    CreateInvoiceItemRequest,
    CreateSalesInvoiceRequest,
    UpdateSalesInvoiceRequest,
    PurchaseBill,
    CreatePurchaseBillRequest,
    Expense,
    CashBankTransaction
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
    CreateCashBankTransactionRequest,
    SalesInvoice,
    SalesInvoiceItem,
    CreateInvoiceItemRequest,
    CreateSalesInvoiceRequest,
    UpdateSalesInvoiceRequest,
    PurchaseBill,
    CreatePurchaseBillRequest,
    Expense,
    CashBankTransaction
};

export const financeApi = {
    listAccounts: async (): Promise<ChartOfAccount[]> => {
        const response = await api.get('/finance/accounts');
        return response.data.data;
    },

    listTree: async (): Promise<ChartOfAccount[]> => {
        const response = await api.get('/finance/accounts/tree');
        return response.data.data;
    },

    createAccount: async (data: CreateAccountRequest): Promise<ChartOfAccount> => {
        const response = await api.post('/finance/accounts', data);
        return response.data.data;
    },

    updateAccount: async (id: string, data: UpdateAccountRequest): Promise<ChartOfAccount> => {
        const response = await api.put(`/finance/accounts/${id}`, data);
        return response.data.data;
    },

    getGeneralLedger: async (accountId: string, startDate?: string, endDate?: string): Promise<GeneralLedgerEntry[]> => {
        const response = await api.get(`/finance/reports/ledger/${accountId}`, {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data.data;
    },

    getTrialBalance: async (): Promise<TrialBalanceEntry[]> => {
        const response = await api.get('/finance/reports/trial-balance');
        return response.data.data;
    },

    getBalanceSheet: async (): Promise<FinancialReportEntry[]> => {
        const response = await api.get('/finance/reports/balance-sheet');
        return response.data.data;
    },

    getIncomeStatement: async (): Promise<FinancialReportEntry[]> => {
        const response = await api.get('/finance/reports/income-statement');
        return response.data.data;
    },

    // Operational Finance
    listSalesInvoices: async (): Promise<SalesInvoice[]> => {
        const response = await api.get('/finance/sales/invoices');
        return response.data.data;
    },
    listPurchaseBills: async (): Promise<PurchaseBill[]> => {
        const response = await api.get('/finance/purchase/bills');
        return response.data.data;
    },
    listExpenses: async (): Promise<Expense[]> => {
        const response = await api.get('/finance/expenses');
        return response.data.data;
    },
    listCashBankTransactions: async (): Promise<CashBankTransaction[]> => {
        const response = await api.get('/finance/cash-bank');
        return response.data.data;
    },

    createSalesInvoice: async (data: CreateSalesInvoiceRequest): Promise<SalesInvoice> => {
        const response = await api.post('/finance/sales/invoices', data);
        return response.data.data;
    },
    getSalesInvoice: async (id: string): Promise<SalesInvoice> => {
        const response = await api.get(`/finance/sales/invoices/${id}`);
        return response.data.data;
    },
    updateSalesInvoice: async (id: string, data: UpdateSalesInvoiceRequest): Promise<SalesInvoice> => {
        const response = await api.put(`/finance/sales/invoices/${id}`, data);
        return response.data.data;
    },
    deleteSalesInvoice: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/finance/sales/invoices/${id}`);
        return response.data;
    },
    createPurchaseBill: async (data: CreatePurchaseBillRequest): Promise<PurchaseBill> => {
        const response = await api.post('/finance/purchase/bills', data);
        return response.data.data;
    },
    createExpense: async (data: any): Promise<Expense> => {
        const response = await api.post('/finance/expenses', data);
        return response.data.data;
    },
    // Sales Quotes
    listSalesQuotes: async (): Promise<any> => {
        const response = await api.get('/finance/sales/quotes');
        return response.data;
    },
    createSalesQuote: async (data: any): Promise<any> => {
        const response = await api.post('/finance/sales/quotes', data);
        return response.data;
    },

    // Sales Orders
    listSalesOrders: async (): Promise<any> => {
        const response = await api.get('/finance/sales/orders');
        return response.data;
    },
    createSalesOrder: async (data: any): Promise<any> => {
        const response = await api.post('/finance/sales/orders', data);
        return response.data;
    },

    // Sales Shipments
    listSalesShipments: async (): Promise<any> => {
        const response = await api.get('/finance/sales/shipments');
        return response.data;
    },
    createSalesShipment: async (data: any): Promise<any> => {
        const response = await api.post('/finance/sales/shipments', data);
        return response.data;
    },

    // Purchase Quotes
    listPurchaseQuotes: async (): Promise<any> => {
        const response = await api.get('/finance/purchase/quotes');
        return response.data;
    },
    createPurchaseQuote: async (data: any): Promise<any> => {
        const response = await api.post('/finance/purchase/quotes', data);
        return response.data;
    },

    // Purchase Orders
    listPurchaseOrders: async (): Promise<any> => {
        const response = await api.get('/finance/purchase/orders');
        return response.data;
    },
    createPurchaseOrder: async (data: any): Promise<any> => {
        const response = await api.post('/finance/purchase/orders', data);
        return response.data;
    },

    // Purchase Shipments
    listPurchaseShipments: async (): Promise<any> => {
        const response = await api.get('/finance/purchase/shipments');
        return response.data;
    },
    createPurchaseShipment: async (data: any): Promise<any> => {
        const response = await api.post('/finance/purchase/shipments', data);
        return response.data;
    },

    createCashBankTransaction: async (data: CreateCashBankTransactionRequest): Promise<any> => {
        const response = await api.post('/finance/cash-bank', data);
        return response.data;
    },
};
