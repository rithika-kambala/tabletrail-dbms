CREATE VIEW low_stock AS
SELECT i.branch_id,b.name branch,i.ingredient_id,g.name ingredient,g.unit,i.quantity,i.threshold
FROM inventory i JOIN branches b ON b.id=i.branch_id JOIN ingredients g ON g.id=i.ingredient_id
WHERE i.quantity < i.threshold;
CREATE VIEW branch_performance AS
SELECT b.id branch_id,b.name,b.city,b.active,COUNT(p.id) orders,
 COALESCE(SUM(p.amount),0) revenue,COALESCE(AVG(p.amount),0) average_order_value,
 COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN o.customer_id END) customers
FROM branches b LEFT JOIN orders o ON o.branch_id=b.id AND o.status='completed'
LEFT JOIN payments p ON p.order_id=o.id GROUP BY b.id,b.name,b.city,b.active;
CREATE VIEW customer_insights AS
SELECT c.id,c.name,c.email,COUNT(p.id) orders,COALESCE(SUM(p.amount),0) spending,
 COALESCE(AVG(p.amount),0) average_order_value
FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.status='completed'
LEFT JOIN payments p ON p.order_id=o.id GROUP BY c.id,c.name,c.email;
CREATE VIEW promotion_performance AS
SELECT p.id,p.code,COUNT(pay.id) orders,
 COALESCE(SUM(CASE WHEN pay.id IS NOT NULL THEN
 (SELECT SUM(quantity*unit_price) FROM order_items WHERE order_id=o.id)-pay.amount ELSE 0 END),0) discount_amount,
 COALESCE(SUM(pay.amount),0) revenue
FROM promotions p LEFT JOIN order_promotions op ON op.promotion_id=p.id
LEFT JOIN orders o ON o.id=op.order_id AND o.status='completed'
LEFT JOIN payments pay ON pay.order_id=o.id GROUP BY p.id,p.code;
