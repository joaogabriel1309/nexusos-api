# Busca global

## Objetivo

A busca global do header localiza registros por um unico termo e permite abrir diretamente o contexto do resultado.

## Consulta e resultados

- O termo deve conter de 2 a 100 caracteres depois de removidos os espacos das extremidades.
- A comparacao textual ignora diferencas entre maiusculas e minusculas.
- Ordens de servico sao localizadas pelo codigo exato, titulo ou nome do cliente.
- Clientes sao localizados pelo nome, projetos pelo nome e usuarios pelo e-mail.
- Os resultados sao agrupados em ordens de servico, clientes, projetos e usuarios, com no maximo cinco itens por grupo.
- Uma OS abre sua pagina de detalhe. Os demais registros abrem a respectiva listagem filtrada pelo item selecionado.

## Autorizacao

- Administradores podem receber resultados de todos os grupos.
- Desenvolvedores recebem somente ordens de servico atribuidas ao proprio usuario.
- Clientes, projetos e usuarios nao sao expostos a desenvolvedores, preservando as mesmas permissoes das telas e endpoints desses cadastros.
