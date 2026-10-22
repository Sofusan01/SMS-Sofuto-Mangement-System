import crypto from 'node:crypto';
import fs from 'node:fs';
export function passwordHash(password,salt=crypto.randomBytes(16).toString('hex')){
 return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')};
}
export function loadAccess(file){
 if(!fs.existsSync(file))return null;
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!/^[a-f0-9]{32}$/.test(value.salt)||!/^[a-f0-9]{128}$/.test(value.hash))throw Error('Invalid access configuration');
 return value;
}
export function verifyPassword(password,access){
 if(typeof password!=='string'||password.length>1024)return false;
 return crypto.timingSafeEqual(crypto.scryptSync(password,access.salt,64),Buffer.from(access.hash,'hex'));
}
