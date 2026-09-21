import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, transaction, fail } from './db.js';
import { roles, branchAccess } from './auth.js';
import { catalog,id,employeeInput,recipeInput } from './validation.js';
export const management=Router();
// Table and column names come only from our schema allowlist, never user input.
for(const [resource,{table,schema}] of Object.entries(catalog)) {
 management.get('/'+resource,async(req,res)=>{
  if(resource==='branches' && req.user.role!=='admin') return res.json(await query('SELECT * FROM branches WHERE id=?',[req.user.branch_id]));
  res.json(await query(`SELECT * FROM ${table} ORDER BY id`));
 });
 for(const method of ['post','put']) management[method]('/'+resource+(method==='put'?'/:id':''), roles(...(resource==='customers'?['admin','manager','staff']:['admin'])),async(req,res)=>{
  const data=schema.parse(req.body), keys=Object.keys(data);
  const result=await transaction(async db=>{
   let result;
   if(method==='post') result=await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,Object.values(data),db);
   else {
    const recordId=id.parse(req.params.id);
    if(!(await query(`SELECT id FROM ${table} WHERE id=?`,[recordId],db)).length) throw fail(404,'Record not found');
    result=await query(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`,[...Object.values(data),recordId],db);
   }
   // New branch/menu/ingredient records immediately get their junction rows.
   if(method==='post' && resource==='branches') {
    await query('INSERT INTO branch_menu(branch_id,menu_item_id) SELECT ?,id FROM menu_items',[result.insertId],db);
    await query('INSERT INTO inventory(branch_id,ingredient_id) SELECT ?,id FROM ingredients',[result.insertId],db);
   }
   if(method==='post' && resource==='menu') await query('INSERT INTO branch_menu(branch_id,menu_item_id) SELECT id,? FROM branches',[result.insertId],db);
   if(method==='post' && resource==='ingredients') await query('INSERT INTO inventory(branch_id,ingredient_id) SELECT id,? FROM branches',[result.insertId],db);
   return result;
  }); res.status(method==='post'?201:200).json({id:method==='post'?result.insertId:Number(req.params.id)});
 });
}
management.get('/employees',roles('admin'),async(req,res)=>res.json(await query('SELECT id,name,email,branch_id,role,active FROM employees ORDER BY id')));
for(const method of ['post','put']) management[method]('/employees'+(method==='put'?'/:id':''),roles('admin'),async(req,res)=>{
 const data=employeeInput.parse(req.body),recordId=method==='put'?id.parse(req.params.id):null;
 if(recordId===req.user.id && (!data.active || data.role!=='admin')) throw fail(400,'You cannot deactivate or demote your own account');
 if(method==='post' && !data.password) throw fail(400,'Password is required');
 const {password,...fields}=data;
 if(password) fields.password_hash=await bcrypt.hash(password,12);
 const keys=Object.keys(fields);
 if(method==='put' && !(await query('SELECT id FROM employees WHERE id=?',[recordId])).length) throw fail(404,'Employee not found');
 const result=method==='post'
 ? await query(`INSERT INTO employees(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,Object.values(fields))
 : await query(`UPDATE employees SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`,[...Object.values(fields),recordId]);
 res.status(method==='post'?201:200).json({id:recordId||result.insertId});
});
management.get('/recipes',async(req,res)=>res.json(await query('SELECT r.*,m.name item,i.name ingredient,i.unit FROM recipes r JOIN menu_items m ON m.id=r.menu_item_id JOIN ingredients i ON i.id=r.ingredient_id')));
management.put('/recipes/:id',roles('admin'),async(req,res)=>{
 const menuId=id.parse(req.params.id),items=recipeInput.parse(req.body);
 await transaction(async db=>{
  if(!(await query('SELECT id FROM menu_items WHERE id=? FOR UPDATE',[menuId],db)).length) throw fail(404,'Menu item not found');
  await query('DELETE FROM recipes WHERE menu_item_id=?',[menuId],db);
  for(const item of items) await query('INSERT INTO recipes VALUES(?,?,?)',[menuId,item.ingredient_id,item.quantity],db);
 });res.json({message:'Recipe saved'});
});
management.get('/inventory',roles('admin','manager'),async(req,res)=>{
 const branch=req.user.role==='admin'?(req.query.branch_id?id.parse(req.query.branch_id):null):req.user.branch_id;
 res.json(await query(`SELECT i.*,g.name ingredient,g.unit,b.name branch FROM inventory i
 JOIN ingredients g ON g.id=i.ingredient_id JOIN branches b ON b.id=i.branch_id
 WHERE (? IS NULL OR i.branch_id=?) ORDER BY i.branch_id,g.name`,[branch,branch]));
});
management.put('/inventory/:branch/:ingredient',roles('admin','manager'),async(req,res)=>{
 const branch=id.parse(req.params.branch),ingredient=id.parse(req.params.ingredient);branchAccess(req.user,branch);
 const data=z.object({add:z.coerce.number().min(0).max(1000000),threshold:z.coerce.number().min(0).max(1000000)}).parse(req.body);
 await transaction(async db=>{
  if(!(await query('SELECT quantity FROM inventory WHERE branch_id=? AND ingredient_id=? FOR UPDATE',[branch,ingredient],db)).length) throw fail(404,'Inventory row not found');
  await query('UPDATE inventory SET quantity=quantity+?,threshold=? WHERE branch_id=? AND ingredient_id=?',[data.add,data.threshold,branch,ingredient],db);
 });res.json({message:'Stock updated'});
});
management.get('/availability',async(req,res)=>{
 const branch=req.user.role==='admin'?(req.query.branch_id?id.parse(req.query.branch_id):null):req.user.branch_id;
 res.json(await query(`SELECT bm.*,m.name item,b.name branch FROM branch_menu bm
 JOIN menu_items m ON m.id=bm.menu_item_id JOIN branches b ON b.id=bm.branch_id
 WHERE (? IS NULL OR bm.branch_id=?)`,[branch,branch]));
});
management.put('/availability/:branch/:item',roles('admin','manager'),async(req,res)=>{
 const branch=id.parse(req.params.branch),item=id.parse(req.params.item);branchAccess(req.user,branch);
 const {available}=z.object({available:z.boolean()}).parse(req.body);
 if(!(await query('SELECT branch_id FROM branch_menu WHERE branch_id=? AND menu_item_id=?',[branch,item])).length) throw fail(404,'Branch menu entry not found');
 await query('UPDATE branch_menu SET available=? WHERE branch_id=? AND menu_item_id=?',[available,branch,item]);res.json({message:'Availability saved'});
});
management.get('/supplier-quotes',roles('admin','manager'),async(req,res)=>res.json(await query('SELECT si.*,s.name supplier,i.name ingredient,i.unit FROM supplier_ingredients si JOIN suppliers s ON s.id=si.supplier_id JOIN ingredients i ON i.id=si.ingredient_id')));
management.put('/supplier-quotes',roles('admin'),async(req,res)=>{
 const data=z.object({supplier_id:id,ingredient_id:id,unit_cost:z.coerce.number().positive().max(100000)}).parse(req.body);
 await query('INSERT INTO supplier_ingredients VALUES(?,?,?) ON DUPLICATE KEY UPDATE unit_cost=?',[data.supplier_id,data.ingredient_id,data.unit_cost,data.unit_cost]);res.json({message:'Quote saved'});
});
