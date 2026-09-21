-- Caller owns the transaction. Never call without START TRANSACTION.
DELIMITER $$
CREATE PROCEDURE complete_order(IN p_order INT, IN p_method VARCHAR(10))
BEGIN
 DECLARE v_branch INT;
 DECLARE v_status VARCHAR(20);
 DECLARE v_missing INT DEFAULT 0;
 DECLARE v_ingredient INT;
 DECLARE v_need DECIMAL(12,3);
 DECLARE v_done BOOLEAN DEFAULT FALSE;
 DECLARE needs CURSOR FOR
 SELECT r.ingredient_id,SUM(r.quantity*oi.quantity)
 FROM order_items oi JOIN recipes r ON r.menu_item_id=oi.menu_item_id
 WHERE oi.order_id=p_order GROUP BY r.ingredient_id ORDER BY r.ingredient_id;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done=TRUE;
 SELECT branch_id,status INTO v_branch,v_status FROM orders WHERE id=p_order FOR UPDATE;
 IF v_branch IS NULL OR v_status <> 'pending' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Order is not pending';
 END IF;
 IF p_method NOT IN ('cash','card','upi') OR p_method IS NULL THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid payment method';
 END IF;
 SELECT COUNT(*) INTO v_missing FROM order_items WHERE order_id=p_order;
 IF v_missing=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Order has no items'; END IF;
 SELECT COUNT(*) INTO v_missing FROM order_items oi WHERE oi.order_id=p_order
 AND NOT EXISTS(SELECT 1 FROM recipes r WHERE r.menu_item_id=oi.menu_item_id);
 IF v_missing>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Menu item has no recipe'; END IF;
 SET v_done=FALSE;
 OPEN needs;
 consume_loop: LOOP
  FETCH needs INTO v_ingredient,v_need;
  IF v_done THEN LEAVE consume_loop; END IF;
  -- Conditional UPDATE takes a row lock and cannot oversell during concurrent checkouts.
  UPDATE inventory SET quantity=quantity-v_need
  WHERE branch_id=v_branch AND ingredient_id=v_ingredient AND quantity>=v_need;
  IF ROW_COUNT()<>1 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient ingredient stock';
  END IF;
 END LOOP;
 CLOSE needs;
 INSERT INTO payments(order_id,amount,method) VALUES(p_order,order_total(p_order),p_method);
 UPDATE orders SET status='completed' WHERE id=p_order;
END$$
DELIMITER ;
