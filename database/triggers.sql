DELIMITER $$
CREATE TRIGGER inventory_audit AFTER UPDATE ON inventory FOR EACH ROW
BEGIN
 IF OLD.quantity <> NEW.quantity THEN
  INSERT INTO inventory_log(branch_id,ingredient_id,old_quantity,new_quantity)
  VALUES(NEW.branch_id,NEW.ingredient_id,OLD.quantity,NEW.quantity);
 END IF;
END$$
CREATE TRIGGER feedback_completed BEFORE INSERT ON customer_feedback FOR EACH ROW
BEGIN
 IF (SELECT status FROM orders WHERE id=NEW.order_id)<>'completed' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Feedback requires a completed order';
 END IF;
END$$
CREATE TRIGGER order_transition BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
 IF OLD.status<>'pending' AND NEW.status<>OLD.status THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Finalized orders cannot change status';
 END IF;
 IF NEW.status='completed' AND NOT EXISTS(SELECT 1 FROM payments WHERE order_id=NEW.id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Completed order requires payment';
 END IF;
END$$
DELIMITER ;
