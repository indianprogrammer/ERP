# Product Requirements Document (PRD)

**Product Name:** Enterprise Resource Planning & GST Suite  
**Document Owner:** Product Management Team  
**Target Users:** Business Owners, Procurement Teams, Sales Teams, Project Managers, Accountants, and System Admins  

---

## 1. Executive Summary & Vision
The goal of this ERP system is to provide a single, unified business management platform styled after X3M's Material/Admin UI. It streamlines both buyer (procurement) and seller (sales) operations, automates Indian GST tax management, supports multi-project tracking, enables drag-and-drop CRM lead tracking, and maintains inventory with staff role-based access control.

---

## 2. Key User Personas & Problems Solved
1. **Business Owner / Super Admin:** Needs full visibility over financials, project margins, staff permissions, and tax compliance without juggling multiple tools.
2. **Procurement Manager:** Needs to evaluate vendor quotes side-by-side, issue POs, track vendor shipments, and manage product warranties.
3. **Sales Manager / Billing Clerk:** Needs to process client POs, issue GST-compliant Tax Invoices, Delivery Receipts, Proforma Invoices, Credit/Debit Notes, and manage E-Way bills.
4. **Project Manager:** Needs to link every invoice, receipt, and purchase order to specific projects to analyze true project profitability.
5. **Accountant:** Needs automated GSTR-2B reconciliation against the GST Portal, GSTR-1/3B filing capability, and balance tracking.

---

## 3. Product Features & Detailed User Stories

### 3.1 Authentication & Staff Role Management
* **Feature:** Secure login system with default `admin` / `admin` credentials (forcing password reset on first login) and staff creation controls.
* **User Story:** *As an admin, I want to create restricted accounts for staff members (e.g., Sales Staff, Inventory Clerks) so they only access features relevant to their roles.*

### 3.2 Procurement & Multi-Vendor Management
* **Feature:** Multi-vendor quote upload and comparison matrix, Purchase Order (PO) creation, vendor shipment tracking, invoice recording, and warranty alerts.
* **User Story:** *As a procurement manager, I want to compare quotes from 3 vendors side-by-side so I can approve the best option and automatically issue a PO.*

### 3.3 Sales, Outward Invoicing & Logistics
* **Feature:** Collect client POs, issue Proforma Invoices, GST Tax Invoices, Delivery Receipts, Credit/Debit Notes, track outward shipments, and generate E-Way bill data.
* **User Story:** *As a sales clerk, I want to convert a customer PO into a GST Tax Invoice and auto-generate an E-Way bill with carrier tracking.*

### 3.4 CRM Lead Tracking (Trello Kanban UI)
* **Feature:** Visual Kanban board for tracking leads through custom pipeline stages (*New*, *Contacted*, *Proposal Sent*, *Won*, *Lost*).
* **User Story:** *As a sales lead, I want to drag and drop client cards through sales stages and convert a "Won" deal directly into a client order.*

### 3.5 Multi-Project Tracking & Financial Mapping
* **Feature:** Map every outward invoice, vendor PO, expense, and receipt voucher to specific projects to display real-time net profitability:
  $$\text{Project Profit} = \text{Client Invoices} - (\text{Vendor POs} + \text{Expenses})$$
* **User Story:** *As a project manager, I want to link all purchases and sales to 'Project Alpha' to see if we are operating within budget.*

### 3.6 Real-time Inventory Management
* **Feature:** SKU/Barcode tracking, multi-warehouse stock movement, serial number tracking for warranties, and automated reorder triggers.
* **User Story:** *As an inventory manager, I want stock levels to automatically adjust whenever a Delivery Receipt or Tax Invoice is generated.*

### 3.7 GST Portal Integration & Direct Tax Filing
* **Feature:** Direct GSP/ASP API connectivity to auto-pull GSTR-2B for vendor bill reconciliation, highlight mismatches, and prepare/submit GSTR-1 and GSTR-3B filings.
* **User Story:** *As an accountant, I want to reconcile our recorded vendor bills against GSTR-2B data pulled from the GST Portal to ensure full ITC eligibility.*

---

## 4. UI/UX & Design Guidelines
* **Navigation Scheme:** Dual menu architecture — a top navigation bar for global search, quick creation (`+`), notifications, and user status; paired with an expandable left sidebar for switching between main modules.
* **Theme:** X3M Admin Dashboard Theme (Material Design 3 aesthetic, light off-white `#F8F9FA` background, primary `#1A73E8` blue accents, clean borderless tables, and subtle badges).

---

## 5. Key Metrics & Success Criteria
* **Time Saved on Billing:** Decrease average time to produce a GST Tax Invoice & E-Way bill to under 2 minutes.
* **Reconciliation Accuracy:** 100% detection rate for ITC discrepancies between ERP records and GSTR-2B portal data.
* **Project Profit Visibility:** Instant calculation of net project margin on the multi-project dashboard.