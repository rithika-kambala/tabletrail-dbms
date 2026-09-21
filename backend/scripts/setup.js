import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { config, pool } from '../src/db.js';
if(!/^[a-zA-Z0-9_]+$/.test(config.database)) throw new Error('Invalid DB_NAME');
const password=process.env.DEMO_PASSWORD;
if(!password || password.length<10 || password.length>72 || password.startsWith('choose-')) throw new Error('Set DEMO_PASSWORD to 10–72 characters');
const db=await mysql.createConnection({...config,database:undefined});
try {
 await db.query(`CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
 await db.query(`USE ${config.database}`);
 const [tables]=await db.query('SHOW TABLES');
 if(tables.length) throw new Error('Database is not empty. Use a new DB_NAME; setup never erases your data.');
 for(const name of ['schema','functions','views','procedures','triggers','indexes','seed']) {
  const sql=await readFile(new URL(`../../database/${name}.sql`,import.meta.url),'utf8');
  let delimiter=';',buffer='';
  for(const line of sql.split('\n')) {
   if(line.trim().startsWith('--') || !line.trim()) continue;
   if(line.startsWith('DELIMITER ')){delimiter=line.slice(10).trim();continue;}
   buffer+=line+'\n';
   if(buffer.trimEnd().endsWith(delimiter)) {await db.query(buffer.trimEnd().slice(0,-delimiter.length));buffer='';}
  }
  if(buffer.trim()) throw new Error(`Unterminated SQL in ${name}`);
  console.log(`Loaded ${name}.sql`);
 }
 const hash=await bcrypt.hash(password,12);
 const employees=[['Admin','admin@tabletrail.test','admin',null],['Jubilee Manager','manager@tabletrail.test','manager',1],['Jubilee Staff','staff@tabletrail.test','staff',1],['Indiranagar Staff','staff2@tabletrail.test','staff',2],['Anna Nagar Staff','staff3@tabletrail.test','staff',3]];
 for(const [name,email,role,branch] of employees) await db.execute('INSERT INTO employees(name,email,role,branch_id,password_hash) VALUES(?,?,?,?,?)',[name,email,role,branch,hash]);
 for(let n=0;n<36;n++) {
  await db.beginTransaction();
  try {
   const branch=n%3+1,customer=n%6+1,menu=n%3+1;
   const [order]=await db.execute('INSERT INTO orders(branch_id,customer_id,employee_id,created_at) VALUES(?,?,?,DATE_SUB(NOW(), INTERVAL ? DAY))',[branch,customer,branch+2,n%7]);
   await db.execute('INSERT INTO order_items VALUES(?,?,?,(SELECT price FROM menu_items WHERE id=?))',[order.insertId,menu,n%2+1,menu]);
   await db.execute('INSERT INTO order_items VALUES(?,4,1,90)',[order.insertId]);
   if(n%3===0) await db.execute('INSERT INTO order_promotions VALUES(?,1,10)',[order.insertId]);
   await db.query('CALL complete_order(?,?)',[order.insertId,['cash','card','upi'][n%3]]);
   await db.execute('UPDATE payments SET paid_at=DATE_SUB(NOW(),INTERVAL ? DAY) WHERE order_id=?',[n%7,order.insertId]);
   if(n%2===0) await db.execute('INSERT INTO customer_feedback(order_id,rating,comment) VALUES(?,?,?)',[order.insertId,n%5===0?4:5,n%5===0?'Good food; a little wait.':'Fresh food and friendly service.']);
   await db.commit();
  } catch(error) {await db.rollback();throw error;}
 }
 await db.query('UPDATE inventory SET quantity=8 WHERE branch_id=2 AND ingredient_id=4');
 await db.query('UPDATE inventory SET quantity=650 WHERE branch_id=3 AND ingredient_id=2');
 console.log('Ready: 3 branches, 36 paid orders, 5 demo employees. Password comes from DEMO_PASSWORD.');
} finally {await db.end();await pool.end();}
