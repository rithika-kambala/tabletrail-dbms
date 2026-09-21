-- 1. INNER JOIN: the contents of every order.
SELECT o.id,b.name branch,m.name item,oi.quantity,oi.unit_price FROM orders o
INNER JOIN branches b ON b.id=o.branch_id INNER JOIN order_items oi ON oi.order_id=o.id
INNER JOIN menu_items m ON m.id=oi.menu_item_id;
-- 2. LEFT JOIN: customers who have not yet ordered.
SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id=c.id WHERE o.id IS NULL;
-- 3. RIGHT JOIN: show every supplier, including suppliers without quotes.
SELECT s.name,i.name ingredient,si.unit_cost FROM supplier_ingredients si
RIGHT JOIN suppliers s ON s.id=si.supplier_id LEFT JOIN ingredients i ON i.id=si.ingredient_id;
-- 4. GROUP BY, aggregates and HAVING: repeat customers.
SELECT customer_id,COUNT(*) visits FROM orders WHERE status='completed'
GROUP BY customer_id HAVING COUNT(*)>1;
-- 5. Nested subquery: customers spending above the customer average.
SELECT name,spending FROM customer_insights WHERE spending >
(SELECT AVG(spending) FROM (SELECT spending FROM customer_insights) totals);
-- 6. Category performance. Gross sales exclude promotion discounts.
SELECT c.name,SUM(oi.quantity) units,SUM(oi.quantity*oi.unit_price) gross_sales
FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN menu_items m ON m.id=oi.menu_item_id
JOIN menu_categories c ON c.id=m.category_id WHERE o.status='completed' GROUP BY c.id,c.name;
-- 7. Each customer's frequently ordered items.
SELECT cu.name customer,m.name item,SUM(oi.quantity) units FROM customers cu
JOIN orders o ON o.customer_id=cu.id JOIN order_items oi ON oi.order_id=o.id
JOIN menu_items m ON m.id=oi.menu_item_id WHERE o.status='completed'
GROUP BY cu.id,cu.name,m.id,m.name ORDER BY cu.id,units DESC;
-- 8. Cheapest supplier quotes using a correlated subquery.
SELECT i.name,s.name supplier,si.unit_cost FROM supplier_ingredients si
JOIN ingredients i ON i.id=si.ingredient_id JOIN suppliers s ON s.id=si.supplier_id
WHERE si.unit_cost=(SELECT MIN(x.unit_cost) FROM supplier_ingredients x WHERE x.ingredient_id=si.ingredient_id);
-- 9. Useful views and function.
SELECT * FROM low_stock;
SELECT * FROM branch_performance;
SELECT * FROM promotion_performance;
SELECT order_total(1) payable;
-- 10. A safe transaction demo that leaves the database unchanged.
START TRANSACTION;
UPDATE inventory SET quantity=quantity+500 WHERE branch_id=1 AND ingredient_id=1;
SELECT * FROM inventory_log ORDER BY id DESC LIMIT 1;
ROLLBACK;
-- 11. Inspect the composite index used for branch order history.
EXPLAIN SELECT * FROM orders WHERE branch_id=1 AND status='completed' ORDER BY created_at DESC;
