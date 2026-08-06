import { describe, it, expect } from 'vitest';
import { toDecimalString, multiplyDecimalStrings, calculateInvoiceTotalString, deriveInvoiceStates } from '../utils/decimal';
import type { CreateSalesInvoiceRequest, SalesInvoice } from '../types/finance';

describe('QARC-011, 3R.1-003 & 3R.1.1-003 Frontend Contract & Unit Tests', () => {
    describe('Exact Decimal Serialization & String Arithmetic (3R.1.1-003)', () => {
        it('preserves exact decimal string formatting without floating point loss', () => {
            expect(toDecimalString('1500000.5')).toBe('1500000.50');
            expect(toDecimalString('125.75')).toBe('125.75');
            expect(toDecimalString('0')).toBe('0.00');
        });

        it('handles exact 0.1 + 0.2 and 1.005 rounding without binary float precision errors', () => {
            // 1.005 in binary float rounding
            expect(toDecimalString('1.005')).toBe('1.01');

            // Exact multiplication
            expect(multiplyDecimalStrings('0.1', '0.2')).toBe('0.0200');
            expect(multiplyDecimalStrings('3', '33.33')).toBe('99.9900');
        });

        it('handles large values > Number.MAX_SAFE_INTEGER with decimal fraction without loss', () => {
            const largeVal = '9007199254740993.01';
            expect(toDecimalString(largeVal)).toBe('9007199254740993.01');
        });

        it('calculates exact sum of multiple line items as string', () => {
            const items = [
                { quantity: '2.00', unit_price: '50000.00' },
                { quantity: '3.00', unit_price: '25000.00' },
                { quantity: '1.00', unit_price: '12500.50' }
            ];
            expect(calculateInvoiceTotalString(items)).toBe('187500.5000');
        });
    });

    describe('Multiple Invoice Lines DTO Payload', () => {
        it('constructs valid CreateSalesInvoiceRequest with multiple line items', () => {
            const payload: CreateSalesInvoiceRequest = {
                invoice_number: 'INV/2026/001',
                client_id: 'client-123',
                date: '2026-08-06',
                due_date: '2026-08-13',
                subject: 'Consulting & Maintenance Services',
                items: [
                    { description: 'Consulting Fee', quantity: '10.00', unit_price: '150000.00' },
                    { description: 'Server Maintenance', quantity: '1.00', unit_price: '500000.00' }
                ]
            };

            expect(payload.items).toHaveLength(2);
            expect(payload.items[0].description).toBe('Consulting Fee');
            expect(payload.items[1].quantity).toBe('1.00');
            expect(calculateInvoiceTotalString(payload.items)).toBe('2000000.0000');

            const wire = JSON.stringify(payload);
            const roundTrip = JSON.parse(wire) as CreateSalesInvoiceRequest;
            expect(roundTrip.items[0].unit_price).toBe('150000.00');
        });
    });

    describe('Separated State Representation (QARC-011, 3R.1-006 & 3R.1.1-006)', () => {
        it('derives correct separated states for a draft unpaid invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'draft',
                total_amount: '1000000.00',
                amount_paid: '0.00',
                journal_entry_id: null
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('draft');
            expect(states.payment).toBe('unpaid');
            expect(states.journal).toBe('none');
        });

        it('does NOT infer posted state from journal_entry_id proxy (3R.1.1-006)', () => {
            // journal_entry_id alone is not authoritative posting state.
            const inv: Partial<SalesInvoice> = {
                status: 'submitted',
                total_amount: '1000000.00',
                amount_paid: '500000.00',
                journal_entry_id: 'je-789',
                journal_status: 'draft'
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('submitted');
            expect(states.payment).toBe('partially_paid');
            expect(states.journal).toBe('draft');
        });

        it('derives posted state ONLY from authoritative journal_status', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'submitted',
                total_amount: '1000000.00',
                amount_paid: '1000000.00',
                journal_entry_id: 'je-789',
                journal_status: 'posted'
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('submitted');
            expect(states.payment).toBe('paid');
            expect(states.journal).toBe('posted');
        });

        it('derives correct separated states for a cancelled invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'cancelled',
                total_amount: '1000000.00',
                amount_paid: '0.00',
                journal_entry_id: null
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('cancelled');
            expect(states.payment).toBe('unpaid');
            expect(states.journal).toBe('none');
        });
    });

    describe('API DTO Compatibility', () => {
        it('ensures SalesInvoice interface fields match backend API contract', () => {
            const invoiceResponse: SalesInvoice = {
                id: 'inv-001',
                invoice_number: 'INV/2026/999',
                client_id: 'client-abc',
                date: '2026-08-06',
                due_date: '2026-08-20',
                subject: 'Project Phase 3R.1',
                subtotal: '1000000.00',
                tax: '0.00',
                total_amount: '1000000.00',
                amount_paid: '0.00',
                status: 'submitted',
                journal_entry_id: 'je-123',
                journal_status: 'draft',
                created_at: '2026-08-06T10:00:00Z',
                items: [
                    {
                        id: 'item-1',
                        invoice_id: 'inv-001',
                        description: 'Deliverable 1',
                        quantity: '1.00',
                        unit_price: '1000000.00',
                        total_price: '1000000.00'
                    }
                ]
            };

            expect(invoiceResponse.id).toBeDefined();
            expect(invoiceResponse.items).toBeDefined();
            expect(invoiceResponse.items![0].invoice_id).toBe('inv-001');
        });
    });
});
