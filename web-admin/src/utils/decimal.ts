/** Precision-safe decimal helpers for Finance UI. Financial truth stays as strings. */
export type DecimalString = string;

const DECIMAL_RE = /^([+-]?)(\d+)(?:\.(\d+))?$/;

type Parts = { coefficient: bigint; scale: number };

function parseDecimal(value: DecimalString): Parts {
    const raw = value.trim();
    const match = DECIMAL_RE.exec(raw);
    if (!match) throw new Error(`Invalid decimal value: ${value}`);

    const sign = match[1] === '-' ? -1n : 1n;
    const integer = match[2];
    const fraction = match[3] ?? '';
    return {
        coefficient: sign * BigInt(integer + fraction),
        scale: fraction.length,
    };
}

function pow10(scale: number): bigint {
    if (!Number.isInteger(scale) || scale < 0) throw new Error(`Invalid decimal scale: ${scale}`);
    return 10n ** BigInt(scale);
}

function rescale(parts: Parts, targetScale: number): bigint {
    if (parts.scale === targetScale) return parts.coefficient;
    if (parts.scale < targetScale) {
        return parts.coefficient * pow10(targetScale - parts.scale);
    }

    const divisor = pow10(parts.scale - targetScale);
    const absolute = parts.coefficient < 0n ? -parts.coefficient : parts.coefficient;
    const quotient = absolute / divisor;
    const remainder = absolute % divisor;
    const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;
    return parts.coefficient < 0n ? -rounded : rounded;
}

function formatScaled(coefficient: bigint, scale: number): DecimalString {
    const negative = coefficient < 0n;
    const absolute = negative ? -coefficient : coefficient;
    if (scale === 0) return `${negative ? '-' : ''}${absolute}`;

    const digits = absolute.toString().padStart(scale + 1, '0');
    const split = digits.length - scale;
    return `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
}

export function toDecimalString(value: DecimalString, scale = 2): DecimalString {
    return formatScaled(rescale(parseDecimal(value), scale), scale);
}

export function addDecimalStrings(a: DecimalString, b: DecimalString, scale = 4): DecimalString {
    return formatScaled(rescale(parseDecimal(a), scale) + rescale(parseDecimal(b), scale), scale);
}

export function subtractDecimalStrings(a: DecimalString, b: DecimalString, scale = 4): DecimalString {
    return formatScaled(rescale(parseDecimal(a), scale) - rescale(parseDecimal(b), scale), scale);
}

export function sumDecimalStrings(values: readonly DecimalString[], scale = 4): DecimalString {
    const total = values.reduce((sum, value) => sum + rescale(parseDecimal(value), scale), 0n);
    return formatScaled(total, scale);
}

export function compareDecimalStrings(a: DecimalString, b: DecimalString): number {
    const left = parseDecimal(a);
    const right = parseDecimal(b);
    const scale = Math.max(left.scale, right.scale);
    const l = rescale(left, scale);
    const r = rescale(right, scale);
    return l < r ? -1 : l > r ? 1 : 0;
}

export function multiplyDecimalStrings(
    quantity: DecimalString,
    unitPrice: DecimalString,
    outputScale = 4,
): DecimalString {
    const q = parseDecimal(quantity);
    const p = parseDecimal(unitPrice);
    return formatScaled(
        rescale({ coefficient: q.coefficient * p.coefficient, scale: q.scale + p.scale }, outputScale),
        outputScale,
    );
}

export function calculateInvoiceTotalString(
    items: readonly { quantity: DecimalString; unit_price: DecimalString }[],
): DecimalString {
    return sumDecimalStrings(items.map((item) => multiplyDecimalStrings(item.quantity, item.unit_price)), 4);
}

/** Display-only formatter. It never converts the authoritative value to JS number. */
export function formatCurrencyIDR(value: DecimalString): string {
    const normalized = toDecimalString(value, 2);
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [integer, fraction] = unsigned.split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${negative ? '-' : ''}Rp${grouped},${fraction}`;
}

export interface InvoiceStateRepresentation {
    lifecycle: 'draft' | 'submitted' | 'cancelled';
    payment: 'unpaid' | 'partially_paid' | 'paid';
    journal: 'none' | 'draft' | 'posted';
}

export function deriveInvoiceStates(invoice: {
    status?: string;
    total_amount?: DecimalString;
    amount_paid?: DecimalString;
    journal_status?: 'draft' | 'posted' | null;
}): InvoiceStateRepresentation {
    const rawStatus = (invoice.status ?? 'draft').toLowerCase();
    const lifecycle = rawStatus === 'submitted'
        ? 'submitted'
        : rawStatus === 'cancelled'
            ? 'cancelled'
            : 'draft';

    const total = invoice.total_amount ?? '0.0000';
    const paid = invoice.amount_paid ?? '0.0000';
    const payment = compareDecimalStrings(total, '0') > 0 && compareDecimalStrings(paid, total) >= 0
        ? 'paid'
        : compareDecimalStrings(paid, '0') > 0
            ? 'partially_paid'
            : 'unpaid';

    return {
        lifecycle,
        payment,
        journal: invoice.journal_status ?? 'none',
    };
}
