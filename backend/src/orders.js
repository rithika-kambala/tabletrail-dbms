import { Router } from 'express';
import { query, transaction, fail } from './db.js';
import { branchAccess, receiptToken } from './auth.js';
import { id, orderInput, paymentInput, feedbackInput } from './validation.js';
export const orders = Router();
async function accessibleOrder(user, orderId, db) {
 const [order] = await query('SELECT * FROM orders WHERE id=? FOR UPDATE',[orderId],db);
 if (!order) throw fail(404,'Order not found');
 branchAccess(user,order.branch_id); return order;
}
orders.get('/',async(req,res)=>{
 const branch=req.user.role==='admin' ? (req.query.branch_id ? id.parse(req.query.branch_id) : null) : req.user.branch_id;
 res.json(await query(`SELECT o.*,c.name customer,b.name branch,order_total(o.id) total,p.method,
 (SELECT rating FROM customer_feedback WHERE order_id=o.id) rating
 FROM orders o JOIN customers c ON c.id=o.customer_id JOIN branches b ON b.id=o.branch_id
 LEFT JOIN payments p ON p.order_id=o.id WHERE (? IS NULL OR o.branch_id=?) ORDER BY o.id DESC LIMIT 100`,[branch,branch]));
});
orders.get('/:id',async(req,res)=>{
 const orderId=id.parse(req.params.id);
 const [order]=await query('SELECT * FROM orders WHERE id=?',[orderId]);
 if(!order) throw fail(404,'Order not found'); branchAccess(req.user,order.branch_id);
 res.json({ ...order,feedback_token:order.status==='completed'?receiptToken(orderId):null,items:await query('SELECT oi.*,m.name FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id WHERE order_id=?',[orderId]),total:(await query('SELECT order_total(?) total',[orderId]))[0].total });
});
orders.post('/',async(req,res)=>{
 const data=orderInput.parse(req.body); branchAccess(req.user,data.branch_id);
 const orderId=await transaction(async db=>{
  const [branch]=await query('SELECT id FROM branches WHERE id=? AND active=TRUE FOR UPDATE',[data.branch_id],db);
  if(!branch) throw fail(400,'Branch is inactive');
  if(!(await query('SELECT id FROM customers WHERE id=?',[data.customer_id],db)).length) throw fail(400,'Customer not found');
  const prices=[];
  for(const item of [...data.items].sort((a,b)=>a.menu_item_id-b.menu_item_id)) {
   const [menu]=await query(`SELECT m.* FROM menu_items m JOIN branch_menu bm ON bm.menu_item_id=m.id
    WHERE m.id=? AND bm.branch_id=? AND m.active=TRUE AND bm.available=TRUE FOR UPDATE`,[item.menu_item_id,data.branch_id],db);
   if(!menu) throw fail(400,'A menu item is unavailable at this branch');
   if(!(await query('SELECT ingredient_id FROM recipes WHERE menu_item_id=?',[menu.id],db)).length) throw fail(400,'Menu item needs a recipe');
   prices.push({...item,price:menu.price});
  }
  const order=await query('INSERT INTO orders(branch_id,customer_id,employee_id) VALUES(?,?,?)',[data.branch_id,data.customer_id,req.user.id],db);
  for(const item of prices) await query('INSERT INTO order_items VALUES(?,?,?,?)',[order.insertId,item.menu_item_id,item.quantity,item.price],db);
  if(data.promotion_id) {
   const [promo]=await query('SELECT * FROM promotions WHERE id=? AND CURDATE() BETWEEN starts_on AND ends_on',[data.promotion_id],db);
   if(!promo) throw fail(400,'Promotion is expired or invalid');
   await query('INSERT INTO order_promotions VALUES(?,?,?)',[order.insertId,promo.id,promo.discount_percent],db);
  }
  return order.insertId;
 });
 res.status(201).json({id:orderId});
});
orders.post('/:id/complete',async(req,res)=>{
 const orderId=id.parse(req.params.id),data=paymentInput.parse(req.body);
 await transaction(async db=>{
  await accessibleOrder(req.user,orderId,db);
  await query('CALL complete_order(?,?)',[orderId,data.method],db);
 });
 res.json({message:'Payment recorded and inventory deducted'});
});
orders.post('/:id/cancel',async(req,res)=>{
 await transaction(async db=>{
  const order=await accessibleOrder(req.user,id.parse(req.params.id),db);
  if(order.status!=='pending') throw fail(409,'Only pending orders can be cancelled');
  await query("UPDATE orders SET status='cancelled' WHERE id=?",[order.id],db);
 }); res.json({message:'Order cancelled'});
});
orders.post('/:id/feedback',async(req,res)=>{
 const data=feedbackInput.parse(req.body);
 await transaction(async db=>{
  const order=await accessibleOrder(req.user,id.parse(req.params.id),db);
  if(order.status!=='completed') throw fail(409,'Complete the order before recording feedback');
  await query('INSERT INTO customer_feedback(order_id,rating,comment) VALUES(?,?,?)',[order.id,data.rating,data.comment],db);
 }); res.status(201).json({message:'Customer feedback recorded'});
});
