import jwt from 'jsonwebtoken';
import { query, fail } from './db.js';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace-')) throw new Error('Set JWT_SECRET to a random secret of at least 32 characters');
export const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8*60*60*1000 };
export function sign(user) { return jwt.sign({ sub: String(user.id) },secret,{ expiresIn:'8h',algorithm:'HS256',audience:'session' }); }
export async function authenticate(req,res,next) {
 let payload;
 try { payload = jwt.verify(req.cookies.session || '',secret,{ algorithms:['HS256'],audience:'session' }); }
 catch { throw fail(401,'Please sign in'); }
 const [user] = await query('SELECT id,name,email,role,branch_id FROM employees WHERE id=? AND active=TRUE',[payload.sub]);
 if (!user) throw fail(401,'Account is inactive');
 req.user=user; next();
}
export const roles = (...allowed) => (req,res,next) => {
 if (!allowed.includes(req.user.role)) throw fail(403,'Your role cannot perform this action'); next();
};
export function branchAccess(user, branch) {
 if (user.role !== 'admin' && Number(branch)!==user.branch_id) throw fail(403,'This branch is outside your access');
}

export function receiptToken(orderId) { return jwt.sign({ sub: String(orderId) },secret,{ expiresIn:'30d',algorithm:'HS256',audience:'feedback' }); }
export function verifyReceipt(token) {
 try { return Number(jwt.verify(token,secret,{algorithms:['HS256'],audience:'feedback'}).sub); }
 catch { throw fail(400,'This feedback link is invalid or expired'); }
}
