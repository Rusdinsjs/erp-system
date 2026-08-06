/**
 * QARC-011, 3R.1-003 & 3R.1.1-003 Exact Decimal Utilities for Frontend Contract Alignment
 *
 * Provides exact, precision-safe decimal arithmetic using string scaling and BigInt/integer math
 * without binary floating-point roundtrip loss (parseFloat/Math.round).
 */

export type DecimalString = string;

/**
 * Normalizes input value into an exact decimal string representation with given scale (default 2).
 * Example: "1500000.5" -> "1500000.50", "1.005" -> "1.01", "0" -> "0.00"
 */
export function toDecimalString(val: string | number | null | undefined, scale = 2): DecimalString {
    if (val === null || val === undefined || val === '') return '0.00';
    const str = typeof val === 'number' ? val.toString() : val.trim();
    if (!str || str === 'NaN') return '0.00';

    const negative = str.startsWith('-');
    const cleanStr = negative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Pad or round fractional part deterministically using BigInt
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
export function multiplyDecimalStrings(qty: DecimalString | number, price: DecimalString | number, scale = 2): DecimalString {
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

/**
 * Computes exact sum of invoice items (quantity * unit_price) as a string.
 */
export function calculateInvoiceTotalString(items: { quantity: DecimalString | number; unit_price: DecimalString | number }[]): DecimalString {
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

/**
 * Formats a DecimalString for display with thousands separators without precision loss.
 * Example: "1500000.50" -> "1,500,000.50"
 */
export function formatDecimalDisplay(val: DecimalString | number | null | undefined, currency = 'IDR'): string {
    const decStr = toDecimalString(val);
    const parts = decStr.split('.');
    const integerWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = `${integerWithCommas}.${parts[1]}`;
    return currency ? `${currency} ${formatted}` : formatted;
}

/**
 * Derives explicit Invoice States (Lifecycle, Payment, Posting) authoritatively without proxying journal_entry_id.
 */
export interface InvoiceStateRepresentation {
    lifecycleState: 'draft' | 'submitted' | 'cancelled';
    paymentState: 'unpaid' | 'partially_paid' | 'paid';
    postingState: 'unposted' | 'posted';
}

export function deriveInvoiceStates(invoice: {
    status?: string;
    posting_status?: string;
    total_amount?: DecimalString | number;
    amount_paid?: DecimalString | number;
    journal_entry_id?: string | null;
}): InvoiceStateRepresentation {
    const rawStatus = (invoice.status || 'draft').toLowerCase();
    const lifecycleState: 'draft' | 'submitted' | 'cancelled' =
        rawStatus === 'submitted' ? 'submitted' : rawStatus === 'cancelled' ? 'cancelled' : 'draft';

    const totalStr = toDecimalString(invoice.total_amount);
    const paidStr = toDecimalString(invoice.amount_paid);

    const totalScaled = BigInt(totalStr.replace('.', ''));
    const paidScaled = BigInt(paidStr.replace('.', ''));

    let paymentState: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
    if (paidScaled >= totalScaled && totalScaled > 0n) {
        paymentState = 'paid';
    } else if (paidScaled > 0n) {
        paymentState = 'partially_paid';
    }

    // Authoritative posting state from explicit posting_status attribute (3R.1.1-006)
    const postingState: 'unposted' | 'posted' =
        invoice.posting_status === 'posted' ? 'posted' : 'unposted';

    return {
        lifecycleState,
        paymentState,
        postingState,
    };
}
