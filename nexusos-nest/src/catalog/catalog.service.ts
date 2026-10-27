import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { Db } from '../common/db';
import { notFound } from '../common/helpers';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class CatalogService {
  constructor(private readonly db: Db, private readonly notifications: NotificationsService) {}
  private userResponse(row: any) { const { senha, ...value } = row; return value; }
  private clientResponse(row: any) { const { whatsappApiKey, ...value } = row; return value; }
  private token() { return { tokenAcesso: randomBytes(48).toString('base64url'), tokenAcessoExpiraEm: new Date(Date.now() + Number(process.env.PORTAL_CLIENTE_TOKEN_EXPIRATION_DAYS || 90)*86400000) }; }
  async users() { return (await this.db.query('select * from usuarios order by criado_em')).map(row=>this.userResponse(row)); }
  async user(id: string) { return this.userResponse(notFound(await this.db.one('select * from usuarios where id=$1',[id]),'Usuário não encontrado.')); }
  async saveUser(body: any, id?: string) {
    return this.db.transaction(async()=>{
      if(id) await this.user(id);
      const duplicate = await this.db.one('select id from usuarios where email=$1 and ($2::uuid is null or id<>$2)',[body.email.toLowerCase(),id||null]);
      if(duplicate) throw new UnprocessableEntityException('E-mail já cadastrado.');
      const data: any = {nome:body.nome,email:body.email.toLowerCase(),perfil:body.perfil,ativo:id?body.ativo:true};
      if(body.senha) data.senha = await hash(body.senha,10);
      const saved = id?await this.db.update('usuarios',id,data):await this.db.insert('usuarios',data);
      if(!id) await this.notifications.notify('USUARIO','Usuário novo cadastrado',`O usuário ${saved.nome} (${saved.email}) foi cadastrado como ${saved.perfil}.`);
      return this.userResponse(saved);
    });
  }
  async disableUser(id: string) { await this.db.transaction(async()=>{ const user=await this.user(id); await this.db.update('usuarios',id,{ativo:false}); await this.notifications.notify('USUARIO','Usuário inativado',`O usuário ${user.nome} (${user.email}) foi inativado.`); }); }
  async clients() { return (await this.db.query('select * from clientes order by criado_em')).map(row=>this.clientResponse(row)); }
  async client(id: string) { return this.clientResponse(notFound(await this.db.one('select * from clientes where id=$1',[id]),'Cliente não encontrado.')); }
  async saveClient(body: any,id?: string) {
    return this.db.transaction(async()=>{
      const previous=id?await this.client(id):undefined;
      if(await this.db.one('select id from clientes where documento=$1 and ($2::uuid is null or id<>$2)',[body.documento,id||null])) throw new UnprocessableEntityException('Documento já cadastrado.');
      const data = {nome:body.nome,documento:body.documento,email:body.email.toLowerCase(),telefone:body.telefone??null,valorHora:body.valorHora,enviarEmail:body.enviarEmail===true,enviarWhatsapp:body.enviarWhatsapp===true,ativo:id?body.ativo:true,...(!id?this.token():{})};
      const saved=id?await this.db.update('clientes',id,data):await this.db.insert('clientes',data);
      if(previous?.ativo&&!saved.ativo) await this.notifications.notify('CLIENTE','Cliente desativado',`O cliente ${saved.nome} foi desativado.`);
      return this.clientResponse(saved);
    });
  }
  async rotateToken(id: string) { await this.client(id); return this.clientResponse(await this.db.update('clientes',id,this.token())); }
  async disableClient(id: string) { await this.db.transaction(async()=>{const client=await this.client(id); await this.db.update('clientes',id,{ativo:false}); await this.notifications.notify('CLIENTE','Cliente desativado',`O cliente ${client.nome} foi desativado.`);}); }
  async projects() { return this.db.query('select p.*,c.nome as cliente_nome from projetos p left join clientes c on c.id=p.cliente_id order by p.criado_em'); }
  async project(id: string) { return notFound(await this.db.one('select p.*,c.nome as cliente_nome from projetos p left join clientes c on c.id=p.cliente_id where p.id=$1',[id]),'Projeto não encontrado.'); }
  async saveProject(body: any,id?: string) {
    return this.db.transaction(async()=>{
      if(id) await this.project(id);
      await this.client(body.clienteId);
      const data = {nome:body.nome,descricao:body.descricao??null,clienteId:body.clienteId,ativo:id?body.ativo:true};
      const saved=id?await this.db.update('projetos',id,data):await this.db.insert('projetos',data);
      if(!id) await this.notifications.notify('PROJETO','Projeto criado sem ticket',`O projeto ${saved.nome} foi criado e ainda não possui ticket vinculado.`);
      return this.project(saved.id);
    });
  }
  async disableProject(id: string) { await this.project(id); await this.db.update('projetos',id,{ativo:false}); }
}
