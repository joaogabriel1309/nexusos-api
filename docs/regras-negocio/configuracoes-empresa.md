# Configurações da empresa

- Existe um único cadastro de configurações da empresa para toda a instalação.
- Usuários autenticados podem consultar a identidade e os dados institucionais; somente usuários com perfil `ADMIN` podem alterar as configurações ou acessar a tela de edição.
- O nome da empresa e a cor principal são obrigatórios.
- CNPJ/CPF é opcional, mas, quando informado, deve conter 11 ou 14 dígitos após a remoção da máscara.
- E-mail, telefone/WhatsApp e endereço são opcionais e têm seus formatos e tamanhos validados.
- A cor principal usa o formato hexadecimal `#RRGGBB` e é aplicada à identidade visual após o carregamento da sessão administrativa.
- A logo é opcional, enviada como imagem PNG, JPEG ou WebP, limitada a 2 MiB e armazenada como `data URL` para não depender de armazenamento externo.
- Atualizações substituem integralmente os valores editáveis e preservam um único registro persistido.
