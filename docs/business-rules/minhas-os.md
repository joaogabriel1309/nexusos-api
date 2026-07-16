# Minhas OS

- Administradores e desenvolvedores autenticados podem acessar a rotina **Minhas OS**.
- Desenvolvedores visualizam exclusivamente as ordens de servico atribuidas a eles.
- Administradores podem selecionar um desenvolvedor ativo e visualizar a fila de ordens atribuida a ele.
- A fila considera apenas ordens nao finalizadas e segue a sequencia de execucao definida para cada desenvolvedor.
- Somente administradores podem reordenar a fila, movendo uma OS para cima ou para baixo; a operacao nao altera status, prioridade ou qualquer outro dado da OS.
- A nova posicao deve estar dentro dos limites da fila do mesmo desenvolvedor. Desenvolvedores podem consultar a sequencia, mas nao altera-la.
- Ordens sem sequencia persistida ficam ao final da fila, usando a data de atualizacao e o codigo apenas como desempate.
