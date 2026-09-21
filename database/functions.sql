DELIMITER $$
CREATE FUNCTION order_total(p_order_id INT) RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
 DECLARE v_total DECIMAL(10,2);
 SELECT ROUND(COALESCE(SUM(oi.quantity*oi.unit_price),0) *
 (1-COALESCE((SELECT discount_percent FROM order_promotions WHERE order_id=p_order_id),0)/100),2)
 INTO v_total FROM order_items oi WHERE oi.order_id=p_order_id;
 RETURN v_total;
END$$
DELIMITER ;
