import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=process.env.DATA_DIR||path.join(root,'data');
const target=process.env.BACKUP_DIR||path.join(data,'backups');
fs.mkdirSync(target,{recursive:true});
const db=new DatabaseSync(path.join(data,'c1conclude.sqlite'),{readOnly:true});
const file=path.join(target,'sms-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
try{await backup(db,file);console.log('Backup created: '+file);}finally{db.close();}
