import { Router } from 'express';
import { query } from './db.js';
import { id } from './validation.js';
import { roles } from './auth.js';
export const analytics=Router();
analytics.use(roles('admin','manager'));
analytics.get('/',async(req,res)=>{
 const branch=req.user.role==='admin'?(req.query.branch_id?id.parse(req.query.branch_id):null):req.user.branch_id;
 const args=[branch,branch];
 const [branches,lowStock,bestSellers,feedback,customers,promotions,daily,categories,favorites] = await Promise.all([
  query('SELECT * FROM branch_performance WHERE (? IS NULL OR branch_id=?)',args),
  query('SELECT * FROM low_stock WHERE (? IS NULL OR branch_id=?)',args),
  query(`SELECT m.name,SUM(oi.quantity) units,SUM(oi.quantity*oi.unit_price) gross_sales
   FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN menu_items m ON m.id=oi.menu_item_id
   WHERE o.status='completed' AND (? IS NULL OR o.branch_id=?) GROUP BY m.id,m.name ORDER BY units DESC LIMIT 5`,args),
  query(`SELECT f.*,c.name customer,b.name branch FROM customer_feedback f JOIN orders o ON o.id=f.order_id
   JOIN customers c ON c.id=o.customer_id JOIN branches b ON b.id=o.branch_id WHERE (? IS NULL OR o.branch_id=?) ORDER BY f.created_at DESC`,args),
  query(`SELECT c.id,c.name,c.email,COUNT(p.id) orders,COALESCE(SUM(p.amount),0) spending,COALESCE(AVG(p.amount),0) average_order_value
   FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.status='completed' AND (? IS NULL OR o.branch_id=?)
   LEFT JOIN payments p ON p.order_id=o.id GROUP BY c.id,c.name,c.email HAVING ? IS NULL OR COUNT(p.id)>0 ORDER BY spending DESC`,[branch,branch,branch]),
  query(`SELECT pr.code,COUNT(p.id) orders,COALESCE(SUM(p.amount),0) revenue,
   COALESCE(SUM((SELECT SUM(quantity*unit_price) FROM order_items WHERE order_id=o.id)-p.amount),0) discount_amount
   FROM promotions pr LEFT JOIN order_promotions op ON op.promotion_id=pr.id
   LEFT JOIN orders o ON o.id=op.order_id AND o.status='completed' AND (? IS NULL OR o.branch_id=?)
   LEFT JOIN payments p ON p.order_id=o.id GROUP BY pr.id,pr.code`,args),
  query(`SELECT DATE_FORMAT(p.paid_at,'%Y-%m-%d') day,SUM(p.amount) revenue FROM payments p JOIN orders o ON o.id=p.order_id
   WHERE (? IS NULL OR o.branch_id=?) AND p.paid_at>=CURDATE()-INTERVAL 6 DAY GROUP BY DATE_FORMAT(p.paid_at,'%Y-%m-%d') ORDER BY day`,args),
  query(`SELECT c.name,SUM(oi.quantity) units,SUM(oi.quantity*oi.unit_price) gross_sales FROM order_items oi
   JOIN orders o ON o.id=oi.order_id JOIN menu_items m ON m.id=oi.menu_item_id JOIN menu_categories c ON c.id=m.category_id
   WHERE o.status='completed' AND (? IS NULL OR o.branch_id=?) GROUP BY c.id,c.name`,args),
  query(`SELECT c.name customer,m.name item,SUM(oi.quantity) units FROM orders o JOIN customers c ON c.id=o.customer_id
   JOIN order_items oi ON oi.order_id=o.id JOIN menu_items m ON m.id=oi.menu_item_id
   WHERE o.status='completed' AND (? IS NULL OR o.branch_id=?) GROUP BY c.id,c.name,m.id,m.name ORDER BY c.name,units DESC`,args),
 ]);
 res.json({branches,lowStock,bestSellers,feedback,customers,promotions,daily,categories,favorites,summary:{
  revenue:branches.reduce((s,b)=>s+b.revenue,0),orders:branches.reduce((s,b)=>s+b.orders,0),
  activeBranches:branches.filter(b=>b.active).length,customers:customers.length,
  averageRating:feedback.length?feedback.reduce((s,f)=>s+f.rating,0)/feedback.length:null,
 }});
});
