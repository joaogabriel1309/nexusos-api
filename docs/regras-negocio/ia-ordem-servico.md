# Assistente de IA para ordens de serviço

- A análise de IA é uma sugestão e não altera automaticamente descrição, prioridade, prazo, status ou textos da OS.
- Administradores e desenvolvedores autenticados podem gerar a análise somente para ordens de serviço que já estejam autorizados a consultar.
- Somente administradores podem habilitar a integração e configurar endpoint, modelo, temperatura e chave da API.
- A chave é aceita apenas para gravação, nunca é devolvida pela API e não deve aparecer em logs ou mensagens de erro.
- A análise considera os dados operacionais da OS e seus apontamentos de tempo. O texto enviado ao cliente deve ser objetivo e não incluir informações internas sensíveis.
- A prioridade sugerida deve ser uma das prioridades válidas do NexusOS. O risco de atraso é uma estimativa informativa, não uma decisão automática.
- Se a integração estiver desabilitada ou incompleta, nenhuma chamada externa é realizada.
