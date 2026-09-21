-- MySQL 8.0.16+ (CHECK constraints enforced). Fresh database only.
CREATE TABLE branches (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE,
 city VARCHAR(80) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE customers (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE, phone VARCHAR(25)
);
CREATE TABLE employees (
 id INT PRIMARY KEY AUTO_INCREMENT, branch_id INT,
 name VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('admin','manager','staff') NOT NULL DEFAULT 'staff',
 active BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(branch_id) REFERENCES branches(id),
 CHECK (role = 'admin' OR branch_id IS NOT NULL)
);
CREATE TABLE menu_categories (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(80) NOT NULL UNIQUE
);
CREATE TABLE menu_items (
 id INT PRIMARY KEY AUTO_INCREMENT, category_id INT NOT NULL,
 name VARCHAR(100) NOT NULL UNIQUE, price DECIMAL(10,2) NOT NULL CHECK(price > 0),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(category_id) REFERENCES menu_categories(id)
);
CREATE TABLE branch_menu (
 branch_id INT NOT NULL, menu_item_id INT NOT NULL, available BOOLEAN NOT NULL DEFAULT TRUE,
 PRIMARY KEY(branch_id,menu_item_id),
 FOREIGN KEY(branch_id) REFERENCES branches(id),
 FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
);
CREATE TABLE ingredients (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE,
 unit ENUM('g','ml','piece') NOT NULL
);
CREATE TABLE suppliers (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE,
 email VARCHAR(150) NOT NULL UNIQUE
);
CREATE TABLE supplier_ingredients (
 supplier_id INT NOT NULL, ingredient_id INT NOT NULL,
 unit_cost DECIMAL(10,4) NOT NULL CHECK(unit_cost > 0),
 PRIMARY KEY(supplier_id,ingredient_id),
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
 FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE recipes (
 menu_item_id INT NOT NULL, ingredient_id INT NOT NULL,
 quantity DECIMAL(12,3) NOT NULL CHECK(quantity > 0),
 PRIMARY KEY(menu_item_id,ingredient_id),
 FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
 FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE inventory (
 branch_id INT NOT NULL, ingredient_id INT NOT NULL,
 quantity DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK(quantity >= 0),
 threshold DECIMAL(12,3) NOT NULL DEFAULT 100 CHECK(threshold >= 0),
 PRIMARY KEY(branch_id,ingredient_id),
 FOREIGN KEY(branch_id) REFERENCES branches(id),
 FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE inventory_log (
 id INT PRIMARY KEY AUTO_INCREMENT, branch_id INT NOT NULL, ingredient_id INT NOT NULL,
 old_quantity DECIMAL(12,3) NOT NULL, new_quantity DECIMAL(12,3) NOT NULL,
 changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(branch_id,ingredient_id) REFERENCES inventory(branch_id,ingredient_id)
);
CREATE TABLE promotions (
 id INT PRIMARY KEY AUTO_INCREMENT, code VARCHAR(30) NOT NULL UNIQUE,
 discount_percent DECIMAL(5,2) NOT NULL CHECK(discount_percent > 0 AND discount_percent <= 100),
 starts_on DATE NOT NULL, ends_on DATE NOT NULL, CHECK(ends_on >= starts_on)
);
CREATE TABLE marketing_campaigns (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL,
 promotion_id INT NOT NULL, channel ENUM('email','social','in-store') NOT NULL,
 budget DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(budget >= 0),
 FOREIGN KEY(promotion_id) REFERENCES promotions(id)
);
CREATE TABLE orders (
 id INT PRIMARY KEY AUTO_INCREMENT, branch_id INT NOT NULL, customer_id INT NOT NULL,
 employee_id INT NOT NULL, status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(branch_id) REFERENCES branches(id),
 FOREIGN KEY(customer_id) REFERENCES customers(id),
 FOREIGN KEY(employee_id) REFERENCES employees(id)
);
CREATE TABLE order_items (
 order_id INT NOT NULL, menu_item_id INT NOT NULL, quantity INT NOT NULL CHECK(quantity > 0),
 unit_price DECIMAL(10,2) NOT NULL CHECK(unit_price > 0),
 PRIMARY KEY(order_id,menu_item_id),
 FOREIGN KEY(order_id) REFERENCES orders(id),
 FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
);
CREATE TABLE order_promotions (
 order_id INT PRIMARY KEY, promotion_id INT NOT NULL,
 discount_percent DECIMAL(5,2) NOT NULL CHECK(discount_percent > 0 AND discount_percent <= 100),
 FOREIGN KEY(order_id) REFERENCES orders(id),
 FOREIGN KEY(promotion_id) REFERENCES promotions(id)
);
CREATE TABLE payments (
 id INT PRIMARY KEY AUTO_INCREMENT, order_id INT NOT NULL UNIQUE,
 amount DECIMAL(10,2) NOT NULL CHECK(amount >= 0),
 method ENUM('cash','card','upi') NOT NULL,
 paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(id)
);
CREATE TABLE customer_feedback (
 order_id INT PRIMARY KEY, rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment VARCHAR(500) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(id)
);
