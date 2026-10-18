# System Requirements Document (SRD)

**Project Name:** Enterprise Resource Planning & Business Management System (ERP Core)  
**Document Version:** 2.0  
**Target Platform:** Web / Desktop Application  
**UI Theme Guidance:** Google Material Design 3 / Google Admin Dashboard Theme with **Dual Navigation Architecture** (Top Bar + Left Drawer Navigation).

---

## 1. System Overview & Objectives
The system is a multi-module ERP application built for managing multi-project workflows, complete GST-compliant accounting, purchase & sales lifecycles, inventory tracking, CRM lead management, and staff access controls. It seamlessly integrates with the Indian GST Portal for GSTR-1, GSTR-3B, and automated GSTR-2B reconciliation.

---

## 2. Navigation Architecture & Navigation Layout
* **Top Navigation Bar:**
  * Global Search Bar (instant search for invoices, PO numbers, GSTINs, and SKUs).
  * Quick-Action Dropdown (`+ New Invoice`, `+ New PO`, `+ New Lead`).
  * Real-Time Notifications & GST Portal Connection Status Indicator.
  * User Account & Profile Switcher.
* **Left Navigation Sidebar (Expandable Drawer):**
  * **Main Modules:** Procurement, Sales & Billing, Multi-Projects, Inventory Control.
  * **CRM & Tax:** Lead Board (Kanban), GST Portal Sync, Staff & Access Control.

---

## 3. User Roles & Access Control
The system uses Role-Based Access Control (RBAC) to enforce security and feature-level permissions across all staff members.

* **Super Admin / System Administrator:** Full system access.
* **Default Credentials (Initial Setup):**
  * **Username:** `admin`
  * **Password:** `admin` *(System forces a mandatory password change on first successful login)*.
* **Staff Roles:** Custom role creation with granular permissions (Create, Read, Update, Delete, Export, Approve) per module.
* **Audit Trail:** Logs every user activity (timestamp, IP, action, resource affected).

---

## 4. Technical Module Specifications

```
                                  +---------------------------------------+
                                  |            ERP System Core            |
                                  +-------------------+-------------------+
                                                      |
         +--------------------+-----------------------+-----------------------+--------------------+
         |                    |                       |                       |                    |
+--------v-------+   +--------v-------+      +--------v-------+      +--------v-------+   +--------v-------+
|  Procurement   |   | Sales & Docs   |      | CRM & Leads    |      | Projects & Cost|   | Inventory Control|
|  & Vendors     |   |                |      | (Trello-style) |      | Mapping        |   |                |
+--------+-------+   +--------+-------+      +--------+-------+      +--------+-------+   +--------+-------+
         |                    |                       |                       |                    |
         +--------------------+-----------------------+-----------------------+--------------------+
                                                      |
                                          +-----------v-----------+
                                          | GST Portal API &      |
                                          | Accounting Engine     |
                                          +-----------------------+
```

### Module 1: Procurement & Vendor Management
* **Vendor Directory:** Profiles containing GSTIN, PAN, Bank Details, Payment Terms, and HSN/SAC codes.
* **Vendor Quote Comparison:** Multi-vendor matrix evaluating price, tax split, lead time, and payment terms, with single-click conversion to Purchase Order (PO).
* **Purchase Orders & Tracking:** Generate, auto-number, and track vendor shipment stages (Ordered, Shipped, In-Transit, Delivered).
* **Warranty Management:** Record product serial numbers, track warranty start/expiry dates, and receive automated alerts.

### Module 2: Sales & Outward Billing Engine
* **Customer Directory:** Manage customer GSTINs, Place of Supply, and addresses.
* **Document Generation Pipeline:** Proforma Invoices, GST Tax Invoices (CGST, SGST, IGST, UTGST), Delivery Receipts/Challans, Credit Notes, Debit Notes, and E-Way bill JSON generation.
* **Outward Shipment & Receivables:** Track carriers/AWB numbers, manage payment receipts, and display 30/60/90-day overdue aging reports.

### Module 3: CRM & Lead Tracking (Trello Kanban UI)
* **Kanban Interface:** Drag-and-drop card workflow across stages (*New*, *Contacted*, *Requirement Gathering*, *Proposal Sent*, *Won*, *Lost*).
* **Lead Conversion:** Convert "Won" cards directly into client orders or projects.

### Module 4: Multi-Project Management & Cost Mapping
* **Cost Mapping Engine:** Link outward invoices, vendor POs, expenses, and receipt vouchers directly to specific projects.
* **Real-time Profitability Analytics:**
  $$\text{Net Project Profit} = \text{Mapped Sales Invoices} - (\text{Mapped Vendor Bills} + \text{Direct Expenses})$$

### Module 5: Inventory Management
* **Item Master & SKUs:** Centralized catalog with barcodes/QRs, UOM, and default HSN codes.
* **Stock Synchronization:** Dynamic stock deductions on dispatching Delivery Challans or Tax Invoices, and additions upon logging Vendor Goods Received Notes (GRN).

### Module 6: GST Portal Integration & Reconciliation
* **GSTR-2B Automated Reconciliation:** Compare vendor bills in the ERP with GST Portal GSTR-2B data to flag tax differences and unfiled invoices.
* **Direct Filing:** Export auto-computed JSON/Excel files for GSTR-1 and GSTR-3B, or file directly via GSP/ASP integration with DSC/EVC options.

---

## 5. Security & System Standards
* **Data Security:** AES-256 encryption at rest; TLS 1.3 encryption in transit.
* **E-Invoicing & Compliance:** Fully compliant with CGST/SGST/IGST regulations, E-Way Bill Rule 138, and IRN specifications.