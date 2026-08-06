/**
 * QARC-011 & 3R.1-003 Exact Decimal Utilities for Frontend Contract Alignment
 *
 * Provides exact, precision-safe decimal arithmetic using string scaling and BigInt/integer math
 * without binary floating-point roundtrip loss (parseFloat/Math.round).
 */

export type DecimalString = string;

/**
 * Normalizes input value into an exact decimal string representation with 2 decimal places.
 * Example: "1500000.5" -> "1500000.50", 1.005 -> "1.01", "0" -> "0.00"
 */
export function toDecimalString(val: number | string | null | undefined, scale = 2): DecimalString {
    if (val === null || val === undefined || val === '') return '0.00';
    const str = typeof val === 'number' ? val.toString() : val.trim();
    if (!str || str === 'NaN') return '0.00';

    const negative = str.startsWith('-');
    const cleanStr = negative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Pad or round fractional part deterministically
    if (fractionalPart.length < scale) {
        fractionalPart = fractionalPart.padEnd(scale, '0');
    } else if (fractionalPart.length > scale) {
        const roundDigit = parseInt(fractionalPart[scale], 10);
        let currentScaleValue = BigInt(fractionalPart.slice(0, scale) || '0');
        if (roundDigit >= 5) {
            currentScaleValue += 1n;
        }
        fractionalPart = currentScaleValue.toString().padStart(scale, '0');
        if (fractionalPart.length > scale) {
            // Carry over to integer part
            integerPart = (BigInt(integerPart) + 1n).toString();
            fractionalPart = fractionalPart.slice(1);
        }
    }

    const result = `${integerPart}.${fractionalPart}`;
    return negative ? `-${result}` : result;
}

/**
 * Multiplies quantity and unitPrice deterministically using scaled BigInt arithmetic.
 */
export function multiplyDecimalStrings(qty: number | string, price: number | string, scale = 2): DecimalString {
    const qStr = toDecimalString(qty, scale);
    const pStr = toDecimalString(price, scale);

    const qInt = BigInt(qStr.replace('.', ''));
    const pInt = BigInt(pStr.replace('.', ''));

    // (q * 10^scale) * (p * 10^scale) = (q * p) * 10^(2*scale)
    const product = qInt * pInt;

    // Scale back down to single scale factor
    const divisor = BigInt(10 ** scale);
    const halfDivisor = divisor / 2n;
    const roundedProduct = (product + halfDivisor) / divisor;

    const strProduct = roundedProduct.toString().padStart(scale + 1, '0');
    const splitIdx = strProduct.length - scale;
    const intPart = strProduct.slice(0, splitIdx) || '0';
    const fracPart = strProduct.slice(splitIdx);

    return `${intPart}.${fracPart}`;
}

export function multiplyDecimal(qty: number | string, price: number | string): number {
    return parseFloat(multiplyDecimalStrings(qty, price));
}

/**
 * Computes exact sum of items (quantity * unit_price) as a string.
 */
export function calculateInvoiceTotalString(items: { quantity: number | string; unit_price: number | string }[]): DecimalString {
    let totalScaled = 0n;
    const scale = 2;

    for (const item of items) {
        const lineTotalStr = multiplyDecimalStrings(item.quantity, item.unit_price, scale);
        const lineScaled = BigInt(lineTotalStr.replace('.', ''));
        totalScaled += lineScaled;
    }

    const strTotal = totalScaled.toString().padStart(scale + 1, '0');
    const splitIdx = strTotal.length - scale;
    const intPart = strTotal.slice(0, splitIdx) || '0';
    const fracPart = strTotal.slice(splitIdx);

    return `${intPart}.${fracPart}`;
}

export function calculateInvoiceTotal(items: { quantity: number | string; unit_price: number | string }[]): number {
    return parseFloat(calculateInvoiceTotalString(items));
}

/**
 * Separated State Helpers (QARC-011 & 3R.1-006)
 *
 * Derives separated states from document metadata & explicit posting status:
 * - Lifecycle State: 'draft' | 'submitted' | 'cancelled'
 * - Payment State: 'unpaid' | 'partially_paid' | 'paid'
 * - Posting State: 'unposted' | 'posted' (explicit, NOT inferred from journal_entry_id proxy!)
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
    posting_status?: string;
    journal_entry_id?: string | null;
}): SeparatedInvoiceState {
    const status = (inv.status || 'draft').toLowerCase();
    const totalStr = toDecimalString(inv.total_amount);
    const paidStr = toDecimalString(inv.amount_paid);

    const totalScaled = BigInt(totalStr.replace('.', ''));
    const paidScaled = BigInt(paidStr.replace('.', ''));

    let lifecycle: 'draft' | 'submitted' | 'cancelled' = 'draft';
    if (status === 'cancelled' || status === 'dibatalkan') {
        lifecycle = 'cancelled';
    } else if (status === 'submitted' || status === 'posted' || status === 'paid') {
        lifecycle = 'submitted';
    }

    let payment: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
    if (paidScaled >= totalScaled && totalScaled > 0n) {
        payment = 'paid';
    } else if (paidScaled > 0n) {
        payment = 'partially_paid';
    }

    // 3R.1-006: Posting status is explicit, NOT derived from presence of journal_entry_id!
    const posting: 'unposted' | 'posted' = inv.posting_status === 'posted' ? 'posted' : 'unposted';

    return { lifecycle, payment, posting };
}
