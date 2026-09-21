INSERT INTO branches(name,city) VALUES ('Jubilee Hills','Hyderabad'),('Indiranagar','Bengaluru'),('Anna Nagar','Chennai');
INSERT INTO customers(name,email,phone) VALUES
('Aarav Shah','aarav@example.test','9000000001'),('Diya Rao','diya@example.test','9000000002'),
('Meera Iyer','meera@example.test','9000000003'),('Kabir Khan','kabir@example.test','9000000004'),
('Ananya Das','ananya@example.test','9000000005'),('Rohan Patel','rohan@example.test','9000000006');
INSERT INTO menu_categories(name) VALUES ('Mains'),('Sides'),('Drinks');
INSERT INTO menu_items(category_id,name,price) VALUES
(1,'Paneer Rice Bowl',240),(1,'Garden Rice Bowl',180),(2,'Paneer Bites',160),(3,'Fresh Lime Soda',90);
INSERT INTO ingredients(name,unit) VALUES ('Rice','g'),('Paneer','g'),('Vegetables','g'),('Lime','piece'),('Soda','ml');
INSERT INTO suppliers(name,email) VALUES ('Fresh Field Produce','orders@freshfield.example.test'),('Daily Dairy','orders@dailydairy.example.test');
INSERT INTO supplier_ingredients VALUES (1,1,0.08),(1,3,0.12),(1,4,6),(1,5,0.03),(2,2,0.35),(2,1,0.09);
INSERT INTO recipes VALUES (1,1,150),(1,2,100),(1,3,80),(2,1,150),(2,3,150),(3,2,120),(4,4,1),(4,5,250);
INSERT INTO branch_menu(branch_id,menu_item_id) SELECT b.id,m.id FROM branches b CROSS JOIN menu_items m;
INSERT INTO inventory(branch_id,ingredient_id,quantity,threshold)
SELECT b.id,i.id,CASE WHEN i.unit='piece' THEN 100 ELSE 20000 END,
CASE WHEN i.unit='piece' THEN 20 ELSE 1000 END FROM branches b CROSS JOIN ingredients i;
INSERT INTO promotions(code,discount_percent,starts_on,ends_on) VALUES
('WELCOME10',10,DATE_SUB(CURDATE(),INTERVAL 30 DAY),DATE_ADD(CURDATE(),INTERVAL 365 DAY)),
('LUNCH15',15,DATE_SUB(CURDATE(),INTERVAL 30 DAY),DATE_ADD(CURDATE(),INTERVAL 90 DAY));
INSERT INTO marketing_campaigns(name,promotion_id,channel,budget) VALUES
('Welcome to TableTrail',1,'email',1500),('Lunch Together',2,'social',2500);
-- Employees and completed sample orders are added by scripts/setup.js.
-- Password hashes are generated from DEMO_PASSWORD; no password is committed.
