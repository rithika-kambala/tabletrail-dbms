-- PK, UNIQUE, and FK indexes are already supplied by MySQL.
CREATE INDEX idx_orders_branch_status_date ON orders(branch_id,status,created_at);
CREATE INDEX idx_orders_customer_status ON orders(customer_id,status);
CREATE INDEX idx_inventory_log_time ON inventory_log(branch_id,changed_at);
