# UI/UX Requirements Document — Quotation Module (Odoo-Inspired)

**Module:** Sales & Outward Billing → Quotations
**Design Reference:** Odoo 17 Sales (List view + Form view), adapted to the X3M Material Design 3 theme
**Document Owner:** Product & Design Team
**Status:** Approved for implementation (v1.0)

---

## 1. Objective & Scope
Replace the flat quotation table + modal-detail pattern with a dedicated **Quotation workspace** modelled on Odoo's list → form drill-down. Scope covers exactly two screens:

1. **Quotation List View** — searchable, filterable, groupable index of all quotations.
2. **Quotation Form View** — full-page create/edit form with status lifecycle, smart buttons, and notebook tabs.

Out of scope: Kanban view, activity/chatter scheduling, multi-currency, and quotation templates (future backlog).

---

## 2. Personas & Jobs To Be Done
1. **Sales Manager:** Scans the pipeline weekly — needs to see quotations grouped by customer and by status, with value totals, without opening each record.
2. **Sales Executive:** Prepares a quote during a client call — needs fast line-item entry, live GST totals, and one-click "Mark Sent / Accept" without leaving the form.
3. **Business Owner:** Reviews accepted quotes — needs smart buttons showing the client PO and the linked project directly on the quotation.

---

## 3. Navigation & Entry Points
* **Sidebar:** `Sales & Outward Billing` → new **`🧾 Quotations`** tab (first-class tab alongside Documents / Requirements / Customers / Receivables / Ledger).
* **Quick Create (`+` menu):** `+ New Quotation` opens the new form view directly (`#/sales?quote=new`).
* **Deep links:** `#/sales?quote=<id>` opens any quotation in the form; `#/sales?quote=new&cust=<id>&source=<reqId>` pre-fills from a Requirement.
* **Breadcrumb:** `Sales / Quotations / <QTN-YYYY-NNN>` — every breadcrumb segment navigates one level back.

---

## 4. List View Requirements

### 4.1 Control Panel (top bar of the view)
* Title **"Quotations"** with a live record count badge (e.g. `Quotations (12)`).
* Primary action button **New** (btn-primary) on the right.
* Secondary actions: **Export CSV** (client-side CSV of the current filtered set) — nice-to-have, P2.

### 4.2 Search & Filters
* Free-text search box matching **quotation number** and **customer name** (instant, client-side).
* Toggleable **filter chips** (Odoo-style multi-select):
  * `My Quotations` (created by the logged-in user — default ON)
  * `Draft` · `Sent` · `Accepted` · `Rejected`
  * `Valid Until expired` (due_date < today and status not Accepted)
* Active filters render as removable pills; a `Clear filters` affordance restores defaults.

### 4.3 Group By
* Group-by selector with options: **Customer**, **Status**, **Month** (doc_date YYYY-MM).
* Collapsible group headers showing: group label, **record count**, and **sum of grand_total** formatted in ₹.
* Default: no grouping.

### 4.4 List Rows
* Columns: **Quotation #** (bold) · **Customer** · **Date** · **Valid Until** · **Client PO** · **Status** (badge) · **Total** (right-aligned, tabular numerals).
* Whole row is clickable → opens the form view. Rows highlight on hover.
* Empty state: friendly message + **New Quotation** button.

---

## 5. Form View Requirements

### 5.1 Control Panel
* Left: breadcrumb (`Sales / Quotations / QTN-2026-001` or `… / New`).
* Right: **Save** (primary, disabled until dirty) and **Discard** (outline, disabled until dirty) — Odoo's save semantics: edits are local until Save; Discard reverts/navigates back.
* Second row (status-dependent actions):
  * `Draft` → **Send** (primary), **Print**, **Cancel-less** (no delete in v1)
  * `Sent` → **Confirm Sale / Accept — Record Client PO** (primary), **Set to Draft**, **Print**
  * `Accepted` → **Create Project** (primary, hidden once a project exists), **Print**
  * All statuses: **Create Invoice** link → opens the Tax Invoice form pre-filled from this quotation (P2, forward-compatible stub allowed).

### 5.2 Status Bar
* Right-aligned horizontal statusbar with steps: **Draft → Sent → Accepted → Project**.
* Current step highlighted (filled pill); completed steps dimmed but visible.
* Clicking `Sent` while in `Draft` performs the same action as the **Send** button.
* `Accepted` and `Project` are never directly clickable — they require the Accept (client PO) and Create Project modals respectively.

### 5.3 Smart Buttons
A row of bordered stat buttons above the notebook, each optional and hidden when empty:

| Button | Content | Behaviour on click |
|---|---|---|
| **Total** | Grand total in ₹ | Non-navigational (display only) |
| **Client PO** | PO ref + date | Non-navigational (display only) |
| **Requirement** | Source requirement # | Opens the requirement detail modal |
| **Project** | Project code | Navigates to `#/projects?id=<id>` |

### 5.4 Notebook Tabs
* **Order Lines** tab (default):
  * Editable table: Description · HSN/SAC · Qty · Unit Price · GST % · Amount (auto = qty × price).
  * `+ Add Line` control under the table (Odoo bottom-row pattern); per-row ✕ remove.
  * Item dropdown auto-fills description/HSN/price/GST from the item master (custom lines allowed).
  * Live totals block, right-aligned: Taxable · CGST/SGST **or** IGST (auto from Place of Supply) · **Total** (16px bold).
* **Other Info** tab:
  * Customer (+ "add new customer" inline field, create-on-save as today), Place of Supply, Dispatch Warehouse.
  * Customer PO Ref, Valid Until, Creation date/user, Source Requirement.
  * Notes / Scope of Work (full-width textarea).

### 5.5 Validation & Save
* Save blocked (inline toast + field highlight) when: no customer, or zero valid line items.
* On save: `POST /api/salesdocs` (new) or `PUT /api/salesdocs/:id` (edit), then return to the form in edit mode showing the assigned `QTN-…` number.
* Editing rules: only `Draft` and `Sent` quotations are editable; `Accepted` quotations are read-only (values frozen after client PO).

---

## 6. Visual & Interaction Design Language
* All new surfaces use existing X3M tokens (`--primary #1A73E8`, `--surface`, `--border`, `--radius`) with `.odo-*` class namespace; no new colours introduced.
* Inputs inside the order-lines table are borderless until hover/focus (Odoo inline-edit feel).
* Keyboard: `Ctrl/Cmd+S` saves the form; `Esc` on a dirty form triggers a discard confirmation.
* Responsive: below 768px the statusbar wraps under the breadcrumb, smart buttons become a 2-column grid, and the order-lines table scrolls horizontally.

---

## 7. Acceptance Criteria
1. A sales user can open Quotations from the sidebar, filter to "My + Draft", group by Customer, and see correct per-group totals.
2. A new quotation can be created end-to-end (customer, lines, GST) and lands in `Draft` with a `QTN-YYYY-NNN` number.
3. Draft → Sent → Accepted transitions are available from the form's action row and statusbar without opening modals other than Accept (client PO).
4. An accepted quotation cannot be edited; its smart buttons show the client PO and the created project.
5. The existing Requirement → Quotation and Quotation → Project flows continue to work unchanged through the new form.
6. All other document types (Tax Invoice, Challan, Notes) keep the existing form — no regression.
