import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hash } from 'bcryptjs';
import { Db } from './common/db';
import { migrate } from './migrations';
async function main() {
  const args=process.argv.slice(2),arg=(name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
  let muted=false;
  const output=new Writable({write(chunk,_encoding,done){if(!muted)process.stdout.write(chunk);done();}});
  const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
  try {
    const nome=arg('--nome')||await rl.question('Nome: '),email=(arg('--email')||await rl.question('E-mail: ')).trim().toLowerCase();
    let senha=process.env.NEXUSOS_ADMIN_PASSWORD;
    if(!senha){if(!process.stdin.isTTY)throw new Error('Defina NEXUSOS_ADMIN_PASSWORD para execução não interativa.'); process.stdout.write('Senha (mínimo 8 caracteres, maiúscula, minúscula e número): ');muted=true;senha=await rl.question('');muted=false;process.stdout.write('\n');}
    if(!nome.trim()||nome.length>120||email.length>160||!/^\S+@\S+\.\S+$/.test(email)||! /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,120}$/.test(senha))throw new Error('Nome, e-mail ou senha inválidos.');
    const db=new Db();
    try {await migrate(db);await db.transaction(async()=>{
      await db.query('select pg_advisory_xact_lock(18082028)');
      if((await db.one('select count(*) as total from usuarios'))!.total>0)throw new Error('Já existem usuários. Use um administrador existente para gerenciar os acessos pela API.');
      await db.insert('usuarios',{nome,email,senha:await hash(senha!,10),perfil:'ADMIN',ativo:true});
    });console.log('Usuário administrador criado.');}finally{await db.onModuleDestroy();}
  }finally{rl.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
