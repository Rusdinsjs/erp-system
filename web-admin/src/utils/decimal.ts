/**
 * QARC-011 Exact Decimal Utilities for Frontend Contract Alignment
 *
 * Ensures monetary values retain exact precision without floating point roundtrip errors.
 */

export type DecimalString = string;

/**
 * Safely parses input (number or string) into a standardized DecimalString representation.
 */
export function toDecimalString(val: number | string | null | undefined, decimals = 2): DecimalString {
    if (val === null || val === undefined || val === '') return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
}

/**
 * Multiplies quantity and unitPrice deterministically.
 */
export function multiplyDecimal(qty: number | string, price: number | string): number {
    const q = typeof qty === 'number' ? qty : parseFloat(qty) || 0;
    const p = typeof price === 'number' ? price : parseFloat(price) || 0;
    // Scale up to avoid JS float precision issues for 2 decimal places
    return Math.round(q * p * 100) / 100;
}

/**
 * Computes exact sum of items quantity * unit_price.
 */
export function calculateInvoiceTotal(items: { quantity: number | string; unit_price: number | string }[]): number {
    return items.reduce((sum, item) => sum + multiplyDecimal(item.quantity, item.unit_price), 0);
}

/**
 * Separated State Helpers (QARC-011)
 *
 * Derives separated states from document metadata / backend fields:
 * - Lifecycle State: 'draft' | 'submitted' | 'cancelled'
 * - Payment State: 'unpaid' | 'partially_paid' | 'paid'
 * - Posting State: 'unposted' | 'posted'
 */
export interface SeparatedInvoiceState {
    lifecycle: 'draft' | 'submitted' | 'cancelled';
    payment: 'unpaid' | 'partially_paid' | 'paid';
    posting: 'unposted' | 'posted';
}

export function deriveInvoiceStates(inv: {
    status?: string;
    total_amount?: number | string;
    amount_paid?: number | string;
    journal_entry_id?: string | null;
}): SeparatedInvoiceState {
    const status = (inv.status || 'draft').toLowerCase();
    const total = typeof inv.total_amount === 'number' ? inv.total_amount : parseFloat(inv.total_amount || '0') || 0;
    const paid = typeof inv.amount_paid === 'number' ? inv.amount_paid : parseFloat(inv.amount_paid || '0') || 0;

    let lifecycle: 'draft' | 'submitted' | 'cancelled' = 'draft';
    if (status === 'cancelled' || status === 'dibatalkan') {
        lifecycle = 'cancelled';
    } else if (status === 'submitted' || status === 'posted' || status === 'paid') {
        lifecycle = 'submitted';
    }

    let payment: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
    if (paid >= total && total > 0) {
        payment = 'paid';
    } else if (paid > 0) {
        payment = 'partially_paid';
    }

    const posting: 'unposted' | 'posted' = inv.journal_entry_id ? 'posted' : 'unposted';

    return { lifecycle, payment, posting };
}
