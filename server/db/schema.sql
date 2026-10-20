-- ERP & GST Suite — SAAS multi-tenant schema (MariaDB)
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS audit_logs, notifications, gst_returns, gstr2b_lines, lead_projects, project_links,
  expenses, receipts, sales_doc_items, sales_documents, lead_stages, leads,
  stock_movements, stock_levels, warehouses, items,
  po_items, purchase_orders, shipments, warranties, vendor_quotes, rfqs, vendors, customers,
  company_settings, role_permissions, staff_roles, users, subscriptions, plans, tenants;
SET FOREIGN_KEY_CHECKS=1;

-- Tenants (SAAS accounts)
CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,          -- subdomain, e.g. acme
  domain VARCHAR(200) DEFAULT NULL,          -- custom domain, e.g. erp.acme.com
  plan VARCHAR(40) NOT NULL DEFAULT 'starter',
  status VARCHAR(20) NOT NULL DEFAULT 'trial', -- trial, active, suspended, cancelled
  trial_ends_at DATETIME NULL,
  subscription_ends_at DATETIME NULL,
  gstin CHAR(15) DEFAULT NULL,
  address VARCHAR(400) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_slug (slug),
  INDEX idx_tenant_domain (domain)
) ENGINE=InnoDB;

-- Company settings (per-tenant branding, invoicing & payment details)
CREATE TABLE company_settings (
  tenant_id INT PRIMARY KEY,
  invoice_theme VARCHAR(20) NOT NULL DEFAULT 'classic',
  receipt_theme VARCHAR(20) NOT NULL DEFAULT 'simple',
  receipt_page_size VARCHAR(10) NOT NULL DEFAULT 'a5',
  invoice_page_size VARCHAR(10) NOT NULL DEFAULT 'a4',
  terms_conditions TEXT,
  bank_name VARCHAR(120) DEFAULT '',
  bank_account_no VARCHAR(40) DEFAULT '',
  bank_ifsc VARCHAR(20) DEFAULT '',
  bank_branch VARCHAR(120) DEFAULT '',
  upi_id VARCHAR(80) DEFAULT '',
  qr_image TEXT,
  company_name VARCHAR(150) DEFAULT '',
  company_address VARCHAR(400) DEFAULT '',
  company_gstin CHAR(15) DEFAULT '',
  company_pan VARCHAR(20) DEFAULT '',
  company_state_code VARCHAR(4) DEFAULT '27',
  company_phone VARCHAR(30) DEFAULT '',
  company_email VARCHAR(120) DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- SAAS plans
CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(40) NOT NULL UNIQUE,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INT NOT NULL DEFAULT 5,
  max_vendors INT NOT NULL DEFAULT 50,
  max_customers INT NOT NULL DEFAULT 50,
  features TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Subscriptions (billing history)
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  plan_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  INDEX idx_sub_tenant (tenant_id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NULL,                        -- NULL = super admin (system)
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  email VARCHAR(120) DEFAULT NULL,
  role_id INT DEFAULT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_tenant (tenant_id, username),
  INDEX idx_user_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_tenant (tenant_id, name),
  INDEX idx_role_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  module VARCHAR(40) NOT NULL,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_read TINYINT(1) NOT NULL DEFAULT 1,
  can_update TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_export TINYINT(1) NOT NULL DEFAULT 0,
  can_approve TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_role_module (role_id, module),
  FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NULL,
  user_id INT NULL,
  username VARCHAR(50) DEFAULT '',
  action VARCHAR(60) NOT NULL,
  resource VARCHAR(60) NOT NULL DEFAULT '',
  detail VARCHAR(500) DEFAULT '',
  ip VARCHAR(45) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_tenant (tenant_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_created (created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  body VARCHAR(400) DEFAULT '',
  kind VARCHAR(30) NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(150) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_tenant (tenant_id),
  INDEX idx_notif_user (tenant_id, user_id, is_read),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ================= Procurement =================
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  gstin CHAR(15) DEFAULT NULL,
  pan CHAR(10) DEFAULT NULL,
  contact_person VARCHAR(100) DEFAULT '',
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(120) DEFAULT '',
  address VARCHAR(400) DEFAULT '',
  bank_details VARCHAR(250) DEFAULT '',
  payment_terms VARCHAR(80) DEFAULT 'Net 30',
  hsn_sac VARCHAR(80) DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendor_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rfqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  rfq_no VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  project_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Open',
  due_date DATE NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_doc_id INT NULL,          -- client Requirement this RFQ was raised from
  UNIQUE KEY uq_rfq_tenant (tenant_id, rfq_no),
  INDEX idx_rfq_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vendor_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  rfq_id INT NOT NULL,
  vendor_id INT NOT NULL,
  item_desc VARCHAR(200) NOT NULL,
  qty DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  lead_time_days INT NOT NULL DEFAULT 0,
  payment_terms VARCHAR(80) DEFAULT '',
  notes VARCHAR(300) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Received',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vq_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  po_no VARCHAR(30) NOT NULL,
  vendor_id INT NOT NULL,
  rfq_id INT NULL,
  quote_id INT NULL,
  project_id INT NULL,
  warehouse_id INT NULL,
  source_doc_id INT NULL,          -- client Requirement this PO was raised from
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Ordered',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes VARCHAR(400) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_po_tenant (tenant_id, po_no),
  INDEX idx_po_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
) ENGINE=InnoDB;

CREATE TABLE po_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  po_id INT NOT NULL,
  item_id INT NULL,
  description VARCHAR(200) NOT NULL,
  hsn_sac VARCHAR(20) DEFAULT '',
  qty DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  INDEX idx_poi_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  po_id INT NULL,
  sales_doc_id INT NULL,
  carrier VARCHAR(80) DEFAULT '',
  awb_no VARCHAR(60) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Ordered',
  shipped_date DATE NULL,
  expected_delivery DATE NULL,
  delivered_date DATE NULL,
  notes VARCHAR(300) DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ship_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB;

CREATE TABLE warranties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  item_id INT NULL,
  po_id INT NULL,
  serial_no VARCHAR(80) NOT NULL,
  customer_name VARCHAR(150) DEFAULT '',
  warranty_start DATE NULL,
  warranty_end DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  notes VARCHAR(300) DEFAULT '',
  UNIQUE KEY uq_serial_tenant (tenant_id, serial_no),
  INDEX idx_warr_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB;

-- ================= Sales =================
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  gstin CHAR(15) DEFAULT NULL,
  pan CHAR(10) DEFAULT NULL,
  contact_person VARCHAR(100) DEFAULT '',
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(120) DEFAULT '',
  address VARCHAR(400) DEFAULT '',
  state_code CHAR(2) DEFAULT '27',
  place_of_supply VARCHAR(80) DEFAULT 'Maharashtra',
  payment_terms VARCHAR(80) DEFAULT 'Net 30',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cust_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sales_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  doc_no VARCHAR(30) NOT NULL,
  doc_type VARCHAR(30) NOT NULL, -- Requirement, Quotation, Proforma, TaxInvoice, Invoice, DeliveryChallan, CreditNote, DebitNote
  customer_id INT NOT NULL,
  project_id INT NULL,
  warehouse_id INT NULL,
  source_doc_id INT NULL,          -- parent document (e.g. Quotation/PO raised from a Requirement)
  doc_date DATE NOT NULL,
  place_of_supply VARCHAR(80) DEFAULT '',
  po_ref VARCHAR(60) DEFAULT '',
  eway_awb VARCHAR(60) DEFAULT '',
  carrier VARCHAR(80) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  gst_status VARCHAR(30) NOT NULL DEFAULT 'Pending GSTR-1',
  taxable_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  cgst DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  customer_po_date DATE NULL,
  notes VARCHAR(400) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_tenant (tenant_id, doc_no),
  INDEX idx_doc_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE sales_doc_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  doc_id INT NOT NULL,
  item_id INT NULL,
  description VARCHAR(200) NOT NULL,
  hsn_sac VARCHAR(20) DEFAULT '',
  qty DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  INDEX idx_sdi_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (doc_id) REFERENCES sales_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NULL,
  vendor_id INT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(80) DEFAULT 'General',
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  notes VARCHAR(300) DEFAULT '',
  attachment VARCHAR(255) DEFAULT NULL,  -- uploaded voucher / invoice file (data/uploads/expenses)
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exp_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  receipt_no VARCHAR(30) NOT NULL,
  customer_id INT NOT NULL,
  doc_id INT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  mode VARCHAR(30) NOT NULL DEFAULT 'Bank',
  ref_no VARCHAR(60) DEFAULT '',
  receipt_date DATE NOT NULL,
  notes VARCHAR(300) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_receipt_tenant (tenant_id, receipt_no),
  INDEX idx_receipt_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (doc_id) REFERENCES sales_documents(id)
) ENGINE=InnoDB;

-- ================= Inventory =================
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(200) DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wh_tenant (tenant_id, code),
  INDEX idx_wh_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sku VARCHAR(60) NOT NULL,
  name VARCHAR(200) NOT NULL,
  barcode VARCHAR(80) DEFAULT NULL,
  uom VARCHAR(20) NOT NULL DEFAULT 'Nos',
  hsn_sac VARCHAR(20) DEFAULT '',
  category VARCHAR(80) DEFAULT 'General',
  sale_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sku_tenant (tenant_id, sku),
  INDEX idx_item_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE stock_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  item_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_item_wh_tenant (tenant_id, item_id, warehouse_id),
  INDEX idx_stock_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  item_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  movement_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJ
  qty DECIMAL(12,2) NOT NULL,
  ref_type VARCHAR(30) DEFAULT '',
  ref_no VARCHAR(40) DEFAULT '',
  notes VARCHAR(300) DEFAULT '',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sm_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ================= CRM =================
CREATE TABLE lead_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color VARCHAR(20) DEFAULT '#5F6368',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stage_tenant (tenant_id, name),
  INDEX idx_stage_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(150) DEFAULT '',
  contact_name VARCHAR(120) DEFAULT '',
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(120) DEFAULT '',
  value DECIMAL(14,2) NOT NULL DEFAULT 0,
  stage_id INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  notes VARCHAR(500) DEFAULT '',
  owner_id INT NULL,
  converted_doc_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES lead_stages(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (converted_doc_id) REFERENCES sales_documents(id)
) ENGINE=InnoDB;

-- ================= Projects =================
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  client_name VARCHAR(150) DEFAULT '',
  budget DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  start_date DATE NULL,
  end_date DATE NULL,
  notes VARCHAR(400) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_tenant (tenant_id, code),
  INDEX idx_project_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE project_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NOT NULL,
  ref_type VARCHAR(30) NOT NULL, -- SALE, PO, EXPENSE, RECEIPT
  ref_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_link_tenant (tenant_id, project_id, ref_type, ref_id),
  INDEX idx_link_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ================= GST =================
CREATE TABLE gst_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  return_type VARCHAR(10) NOT NULL, -- GSTR1, GSTR3B, GSTR2B
  period VARCHAR(7) NOT NULL, -- YYYY-MM
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  filed_at DATETIME NULL,
  reference_no VARCHAR(60) DEFAULT '',
  payload JSON NULL,
  UNIQUE KEY uq_ret_tenant (tenant_id, return_type, period),
  INDEX idx_ret_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE gstr2b_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  return_id INT NULL,
  period VARCHAR(7) NOT NULL,
  vendor_gstin CHAR(15) NOT NULL,
  vendor_name VARCHAR(150) DEFAULT '',
  invoice_no VARCHAR(40) NOT NULL,
  invoice_date DATE NULL,
  taxable_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  invoice_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  match_status VARCHAR(30) NOT NULL DEFAULT 'Unmatched',
  erp_po_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gstr2b_tenant (tenant_id),
  INDEX idx_gstr2b_period (tenant_id, period),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (return_id) REFERENCES gst_returns(id)
) ENGINE=InnoDB;

ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES staff_roles(id);
ALTER TABLE rfqs ADD FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE purchase_orders ADD FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE purchase_orders ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE purchase_orders ADD FOREIGN KEY (quote_id) REFERENCES vendor_quotes(id);
ALTER TABLE po_items ADD FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE shipments ADD FOREIGN KEY (po_id) REFERENCES purchase_orders(id);
ALTER TABLE shipments ADD FOREIGN KEY (sales_doc_id) REFERENCES sales_documents(id);
ALTER TABLE warranties ADD FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE warranties ADD FOREIGN KEY (po_id) REFERENCES purchase_orders(id);
ALTER TABLE sales_documents ADD FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE sales_documents ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
ALTER TABLE sales_doc_items ADD FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE expenses ADD FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE expenses ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE receipts ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE receipts ADD FOREIGN KEY (doc_id) REFERENCES sales_documents(id);
ALTER TABLE sales_documents ADD FOREIGN KEY (source_doc_id) REFERENCES sales_documents(id);
ALTER TABLE rfqs ADD FOREIGN KEY (source_doc_id) REFERENCES sales_documents(id);
ALTER TABLE purchase_orders ADD FOREIGN KEY (source_doc_id) REFERENCES sales_documents(id);
