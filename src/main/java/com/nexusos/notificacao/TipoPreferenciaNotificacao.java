package com.nexusos.notificacao;

import java.util.Optional;

public enum TipoPreferenciaNotificacao {
    OS_ATRIBUIDA("ATRIBUICAO"),
    PRAZO_VENCIDO("PRAZO_VENCIDO"),
    APROVACAO_CLIENTE("APROVACAO_CLIENTE"),
    PAGAMENTO("PAGAMENTO"),
    COMENTARIO("COMENTARIO"),
    ALTERACAO_STATUS("STATUS");

    private final String tipoNotificacao;

    TipoPreferenciaNotificacao(String tipoNotificacao) {
        this.tipoNotificacao = tipoNotificacao;
    }

    public static Optional<TipoPreferenciaNotificacao> fromTipoNotificacao(String tipoNotificacao) {
        for (var tipo : values()) {
            if (tipo.tipoNotificacao.equals(tipoNotificacao)) {
                return Optional.of(tipo);
            }
        }
        return Optional.empty();
    }
}
