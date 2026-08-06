import { describe, it, expect } from 'vitest';
import { toDecimalString, multiplyDecimal, calculateInvoiceTotal, deriveInvoiceStates } from '../utils/decimal';
import type { CreateSalesInvoiceRequest, SalesInvoice } from '../types/finance';

describe('QARC-011 Frontend Contract & Unit Tests', () => {
    describe('Decimal Serialization & Exactness', () => {
        it('preserves exact decimal string formatting without floating point loss', () => {
            expect(toDecimalString(1500000.5)).toBe('1500000.50');
            expect(toDecimalString('125.75')).toBe('125.75');
            expect(toDecimalString(0)).toBe('0.00');
            expect(toDecimalString(null)).toBe('0.00');
        });

        it('multiplies quantity and unit price deterministically', () => {
            expect(multiplyDecimal(3, 33.33)).toBe(99.99);
            expect(multiplyDecimal('10', '150.50')).toBe(1505);
            expect(multiplyDecimal(0.1, 0.2)).toBe(0.02);
        });

        it('calculates exact sum of multiple line items', () => {
            const items = [
                { quantity: 2, unit_price: 50000 },
                { quantity: 3, unit_price: 25000 },
                { quantity: 1, unit_price: 12500.5 }
            ];
            expect(calculateInvoiceTotal(items)).toBe(187500.5);
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
                    { description: 'Consulting Fee', quantity: 10, unit_price: 150000 },
                    { description: 'Server Maintenance', quantity: 1, unit_price: 500000 }
                ]
            };

            expect(payload.items).toHaveLength(2);
            expect(payload.items[0].description).toBe('Consulting Fee');
            expect(payload.items[1].quantity).toBe(1);
            expect(calculateInvoiceTotal(payload.items)).toBe(2000000);
        });
    });

    describe('Separated State Representation (QARC-011)', () => {
        it('derives correct separated states for a draft unpaid invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'draft',
                total_amount: 1000000,
                amount_paid: 0,
                journal_entry_id: null
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('draft');
            expect(states.payment).toBe('unpaid');
            expect(states.posting).toBe('unposted');
        });

        it('derives correct separated states for a posted partially-paid invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'submitted',
                total_amount: 1000000,
                amount_paid: 500000,
                journal_entry_id: 'je-789'
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('submitted');
            expect(states.payment).toBe('partially_paid');
            expect(states.posting).toBe('posted');
        });

        it('derives correct separated states for a posted fully-paid invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'submitted',
                total_amount: 1000000,
                amount_paid: 1000000,
                journal_entry_id: 'je-789'
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('submitted');
            expect(states.payment).toBe('paid');
            expect(states.posting).toBe('posted');
        });

        it('derives correct separated states for a cancelled invoice', () => {
            const inv: Partial<SalesInvoice> = {
                status: 'cancelled',
                total_amount: 1000000,
                amount_paid: 0,
                journal_entry_id: null
            };
            const states = deriveInvoiceStates(inv);
            expect(states.lifecycle).toBe('cancelled');
            expect(states.payment).toBe('unpaid');
            expect(states.posting).toBe('unposted');
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
                subject: 'Project Phase 3R',
                subtotal: 1000000,
                tax: 0,
                total_amount: 1000000,
                amount_paid: 0,
                status: 'submitted',
                journal_entry_id: 'je-123',
                created_at: '2026-08-06T10:00:00Z',
                items: [
                    {
                        id: 'item-1',
                        invoice_id: 'inv-001',
                        description: 'Deliverable 1',
                        quantity: 1,
                        unit_price: 1000000,
                        total_price: 1000000
                    }
                ]
            };

            expect(invoiceResponse.id).toBeDefined();
            expect(invoiceResponse.items).toBeDefined();
            expect(invoiceResponse.items![0].invoice_id).toBe('inv-001');
        });
    });
});
