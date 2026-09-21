import { Router } from 'express';
import { query, transaction, fail } from './db.js';
import { verifyReceipt } from './auth.js';
import { feedbackInput } from './validation.js';
export const feedback=Router();
feedback.get('/:token',async(req,res)=>{
 const orderId=verifyReceipt(req.params.token);
 const [row]=await query(`SELECT o.id,b.name branch,f.rating FROM orders o JOIN branches b ON b.id=o.branch_id
 LEFT JOIN customer_feedback f ON f.order_id=o.id WHERE o.id=? AND o.status='completed'`,[orderId]);
 if(!row) throw fail(404,'Completed order not found');res.json(row);
});
feedback.post('/:token',async(req,res)=>{
 const orderId=verifyReceipt(req.params.token),data=feedbackInput.parse(req.body);
 await transaction(async db=>{
  const [order]=await query('SELECT status FROM orders WHERE id=? FOR UPDATE',[orderId],db);
  if(!order || order.status!=='completed')throw fail(404,'Completed order not found');
  await query('INSERT INTO customer_feedback(order_id,rating,comment) VALUES(?,?,?)',[orderId,data.rating,data.comment],db);
 });res.status(201).json({message:'Thank you for your feedback!'});
});
