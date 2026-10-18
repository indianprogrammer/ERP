-- Seed data for X3M ERP SAAS (multi-tenant)
-- Super admin: tenant_id NULL
-- Sample tenant: acme (slug: acme)

SET FOREIGN_KEY_CHECKS=0;
DELETE FROM audit_logs; DELETE FROM notifications; DELETE FROM gstr2b_lines; DELETE FROM gst_returns;
DELETE FROM project_links; DELETE FROM leads; DELETE FROM lead_stages;
DELETE FROM stock_movements; DELETE FROM stock_levels; DELETE FROM items; DELETE FROM warehouses;
DELETE FROM receipts; DELETE FROM expenses; DELETE FROM sales_doc_items; DELETE FROM sales_documents; DELETE FROM customers;
DELETE FROM warranties; DELETE FROM shipments; DELETE FROM po_items; DELETE FROM purchase_orders;
DELETE FROM vendor_quotes; DELETE FROM rfqs; DELETE FROM vendors;
DELETE FROM role_permissions; DELETE FROM users; DELETE FROM staff_roles;
DELETE FROM subscriptions; DELETE FROM plans; DELETE FROM tenants;
DELETE FROM projects;
SET FOREIGN_KEY_CHECKS=1;

-- Plans
INSERT INTO plans (id, name, slug, price_monthly, max_users, max_vendors, max_customers, features) VALUES
(1,'Starter','starter',499,5,50,50,'{"gst_reconciliation":true,"multi_project":true}'),
(2,'Growth','growth',1499,25,200,200,'{"gst_reconciliation":true,"multi_project":true,"advanced_reports":true}'),
(3,'Enterprise','enterprise',3999,100,1000,1000,'{"gst_reconciliation":true,"multi_project":true,"advanced_reports":true,"custom_domain":true}');

-- Super admin tenant (system-level, no slug/domain)
-- Users with tenant_id NULL are super admins
-- Staff roles for super admin are scoped per-tenant; super admin user is role_id NULL / handled in auth

INSERT INTO users (id, username, password_hash, full_name, email, tenant_id, role_id, must_change_password, is_active) VALUES
(1,'superadmin','$2b$10$EL7sD14zkdSu/mOtNO4K1uMXr/AudxC61kifXOSswIqaQQ9A725Am','Super Administrator','superadmin@x3m.local',NULL,NULL,1,1);

-- Sample tenant: Acme Corporation
INSERT INTO tenants (id,name,slug,domain,plan,status,gstin,address) VALUES
(1,'Acme Corporation India','acme',NULL,'starter','trial','22AAAAA0000A1Z5','Nagpur, Maharashtra');

INSERT INTO staff_roles (id,tenant_id,name,description,is_system) VALUES
(1,1,'Super Admin','Full tenant access',1),
(2,1,'Procurement Manager','Vendors, RFQs, POs',0),
(3,1,'Sales & Billing','Customers, invoices, e-way bills',0),
(4,1,'Project Manager','Projects, cost mapping, reports',0),
(5,1,'Accountant','GST filing, reconciliation, receipts',0),
(6,1,'Inventory Clerk','Items, warehouses, stock',0);

INSERT INTO users (id,tenant_id,username,password_hash,full_name,email,role_id,must_change_password,is_active) VALUES
(2,1,'admin','$2b$10$EL7sD14zkdSu/mOtNO4K1uMXr/AudxC61kifXOSswIqaQQ9A725Am','Acme Admin','admin@acme.in',1,1,1),
(3,1,'sales','$2b$10$EL7sD14zkdSu/mOtNO4K1uMXr/AudxC61kifXOSswIqaQQ9A725Am','Priya Sharma','sales@acme.in',3,0,1),
(4,1,'purchase','$2b$10$EL7sD14zkdSu/mOtNO4K1uMXr/AudxC61kifXOSswIqaQQ9A725Am','Rahul Mehta','purchase@acme.in',2,0,1);

INSERT INTO role_permissions (role_id, module, can_create, can_read, can_update, can_delete, can_export, can_approve) VALUES
(1,'procurement',1,1,1,1,1,1),(1,'sales',1,1,1,1,1,1),(1,'inventory',1,1,1,1,1,1),
(1,'crm',1,1,1,1,1,1),(1,'projects',1,1,1,1,1,1),(1,'gst',1,1,1,1,1,1),(1,'admin',1,1,1,1,1,1),
(2,'procurement',1,1,1,0,1,1),(2,'inventory',0,1,0,0,1,0),(2,'projects',0,1,0,0,0,0),
(3,'sales',1,1,1,0,1,1),(3,'inventory',0,1,0,0,0,0),(3,'crm',1,1,1,0,0,0),
(4,'projects',1,1,1,0,1,1),(4,'sales',0,1,0,0,1,0),(4,'procurement',0,1,0,0,1,0),(4,'inventory',0,1,0,0,0,0),
(5,'gst',1,1,1,0,1,1),(5,'sales',0,1,1,0,1,0),(5,'procurement',0,1,1,0,1,0),(5,'projects',0,1,0,0,1,0),
(6,'inventory',1,1,1,0,1,0),(6,'procurement',0,1,0,0,0,0);

-- Lead stages (tenant-scoped)
INSERT INTO lead_stages (id,tenant_id,name,position,color) VALUES
(1,1,'New',1,'#1A73E8'),(2,1,'Contacted',2,'#F9AB00'),(3,1,'Requirement Gathering',3,'#E37400'),
(4,1,'Proposal Sent',4,'#A142F4'),(5,1,'Won',5,'#1E8E3E'),(6,1,'Lost',6,'#D93025');

-- Warehouses
INSERT INTO warehouses (id,tenant_id,code,name,location) VALUES
(1,1,'WH-MUM','Mumbai Main Warehouse','Andheri East, Mumbai'),
(2,1,'WH-PUN','Pune Depot','Hinjawadi, Pune');

-- Items
INSERT INTO items (id,tenant_id,sku,name,barcode,uom,hsn_sac,category,sale_price,purchase_price,gst_rate,reorder_level) VALUES
(1,1,'SRV-ENT-01','Industrial Enterprise Server','8901234000011','Nos','8471','Hardware',95000,78000,18,2),
(2,1,'NET-SW-12','Network Switch 48-Port','8901234000028','Nos','8517','Hardware',18500,14200,18,5),
(3,1,'CLD-SETUP','Enterprise Cloud Setup','8901234000035','Service','998315','Services',100000,0,18,0),
(4,1,'RTR-WIFI-6','Wi-Fi 6 Router Pro','8901234000042','Nos','8517','Hardware',8500,5600,18,10),
(5,1,'LIC-SW-1Y','Security Software License (1yr)','8901234000059','Lic','8523','Software',25000,15000,18,0);

INSERT INTO stock_levels (id,tenant_id,item_id,warehouse_id,qty) VALUES
(1,1,1,1,8),(2,1,1,2,3),(3,1,2,1,22),(4,1,2,2,9),(5,1,4,1,4),(6,1,4,2,15),(7,1,5,1,50),(8,1,3,1,0),(9,1,3,2,0);

-- Vendors
INSERT INTO vendors (id,tenant_id,name,gstin,pan,contact_person,phone,email,address,bank_details,payment_terms,hsn_sac) VALUES
(1,1,'TechCorp Systems Pvt Ltd','29ABCDE1234F1Z5','ABCDE1234F','Anil Kumar','9810011111','billing@techcorp.in','HSR Layout, Bengaluru','HDFC 50200012345678','Net 45','8471,8517'),
(2,1,'Global Supplies','27AAAAA0000A1Z5','AAAAA0000A','Sneha Patil','9820022222','orders@globalsupplies.in','Vashi, Navi Mumbai','ICICI 002301501234','Net 30','8517'),
(3,1,'Apex Distribution Ltd','33BBBBB0000B1Z5','BBBBB0000B','Vikram Singh','9830033333','sales@apexdist.in','Salt Lake, Kolkata','SBI 12345678901','Advance','8523');

-- Customers
INSERT INTO customers (id,tenant_id,name,gstin,pan,contact_person,phone,email,address,state_code,place_of_supply,payment_terms) VALUES
(1,1,'Tata Technologies','27AAAAA0000A1Z5','AAAAA0000A','Ravi Iyer','9870011111','ap@tatatech.in','Pune, MH','27','Maharashtra','Net 45'),
(2,1,'Reliance Retail','24AAAAA0000A1Z5','AAAAA0000A','Kiran Shah','9870022222','accounts@ril.in','Mumbai, MH','24','Gujarat','Net 30'),
(3,1,'Acme Corporation India','22AAAAA0000A1Z5','AAAAA0000A','Deepa Nair','9870033333','billing@acme.in','Nagpur, MH','22','Maharashtra','Net 30');

-- Projects
INSERT INTO projects (id,tenant_id,code,name,client_name,budget,status,start_date) VALUES
(1,1,'PRJ-ALPHA','Project Alpha: Cloud Migration','Tata Technologies',1500000,'Active','2026-01-15'),
(2,1,'PRJ-BETA','Project Beta: Retail POS Rollout','Reliance Retail',2200000,'Active','2026-03-01'),
(3,1,'PRJ-GAMMA','Project Gamma: Network Upgrade','Acme Corporation India',800000,'On Hold','2026-06-10');

-- RFQ + Quotes
INSERT INTO rfqs (id,tenant_id,rfq_no,title,project_id,status,due_date,created_by) VALUES
(1,1,'RFQ-2026-001','Server & Network Hardware Q1',1,'Open','2026-11-05',4);

INSERT INTO vendor_quotes (id,tenant_id,rfq_id,vendor_id,item_desc,qty,unit_price,gst_rate,lead_time_days,payment_terms,status) VALUES
(1,1,1,1,'Industrial Enterprise Servers',5,45000,18,21,'Net 45','Received'),
(2,1,1,2,'Industrial Enterprise Servers',5,43000,18,30,'Net 30','Received'),
(3,1,1,3,'Industrial Enterprise Servers',5,46000,18,14,'Advance','Received'),
(4,1,1,1,'Network Switches',12,12000,18,10,'Net 45','Received'),
(5,1,1,2,'Network Switches',12,12500,18,7,'Net 30','Received'),
(6,1,1,3,'Network Switches',12,13000,18,5,'Advance','Received');

-- Leads
INSERT INTO leads (id,tenant_id,title,company,contact_name,phone,email,value,stage_id,notes,owner_id) VALUES
(1,1,'Infosys - Cloud Infra Deal','Infosys','Arun P','9845011111','arun.p@infosys.example',350000,1,'Inbound from website',3),
(2,1,'Wipro ERP Upgrade','Wipro','Meera K','9845022222','meera.k@wipro.example',220000,2,'Follow-up call done',3),
(3,1,'Zensar Tech CRM Module','Zensar','Sagar D','9845033333','sagar.d@zensar.example',180000,3,'Need SOW draft',4),
(4,1,'Tech Mahindra SOC Setup','Tech Mahindra','Nita R','9845044444','nita.r@techm.example',540000,4,'Proposal sent 10 Oct',4),
(5,1,'Acme Corp Network Refresh','Acme Corporation India','Deepa Nair','9870033333','billing@acme.in',460000,5,'PO received — convert to invoice',3);
