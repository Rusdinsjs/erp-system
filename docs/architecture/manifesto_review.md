# ERPQu Manifesto Review & Equilibrium
**Status:** Diterima & Aktif
**Tanggal:** 2026-08-07

Dokumen ini adalah pedoman konseptual utama yang melandasi evolusi ERPQu menuju **Frappe-inspired ERP Platform**. 

## Visi Utama
**"ERPQu = Typed DDD ERP Core + Lean Metadata Kernel + Controlled App Extensibility."**

Prinsip panduan mutlak:
> **"Generic where convenient, typed where correctness matters."**

## Pembagian Tanggung Jawab (Architecture Equilibrium)

| Lapisan    | Ruang Lingkup yang Diizinkan                                             | Batasan Mutlak (Tidak Boleh)         |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------ |
| **Kernel** | Document lifecycle, auth, permission, audit, naming, jobs, files, events | Pajak, GL, stock valuation, payroll  |
| **Metadata** | field, form, layout, custom field, list, filter, generic CRUD          | Aturan uang/stok/accounting          |
| **DDD Domain**| Accounting, Stock, Asset, Selling, Buying, Payroll                     | UI/layout generik                    |
| **Apps**   | Domain tambahan, localization, integration                               | Menembus boundary domain sembarangan |

## Dua Kelas Dokumen ERPQu

1. **Generic / Administrative Document** (Contoh: Department, Designation, Asset Category)
   - Boleh sepenuhnya diatur oleh *Metadata Layer* (No-code / Low-code).
2. **Transactional / Critical Document** (Contoh: Sales Invoice, Journal Entry, Stock Entry)
   - Wajib melewati: `Typed Application Service -> DDD Aggregate -> Invariant Validation -> UnitOfWork -> Ledger`.
   - **Garis Merah:** Metadata rule dilarang keras melakukan kalkulasi akuntansi atau *insert* ke GL.

## Prinsip Desain Tambahan

1. **Modular Monolith:** Tidak dipecah menjadi *microservices* demi menjaga kemampuan *Synchronous Atomic Transaction* antar modul.
2. **Event & Outbox:** Digunakan HANYA untuk efek samping (email, webhook, analitik). Tidak untuk *business invariants* kritis.
3. **Admission Rule Kernel:** Sesuatu hanya masuk ke Kernel jika dipakai oleh banyak domain dan tidak mengandung *business knowledge* domain tertentu.
4. **App System Rasional:** Menggunakan *Typed App / Rust Code* untuk logika tingkat lanjut. Tidak menggunakan *runtime scripting engine* yang membuka celah kerentanan finansial.
