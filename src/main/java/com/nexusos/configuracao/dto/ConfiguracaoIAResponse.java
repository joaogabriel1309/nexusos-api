package com.nexusos.configuracao.dto;
import com.nexusos.configuracao.ConfiguracaoIA;
import java.math.BigDecimal;
public record ConfiguracaoIAResponse(boolean habilitado, String apiUrl, String modelo,
        BigDecimal temperatura, boolean chaveConfigurada) {
    public static ConfiguracaoIAResponse from(ConfiguracaoIA c) {
        return new ConfiguracaoIAResponse(c.isHabilitado(), c.getApiUrl(), c.getModelo(),
                c.getTemperatura(), c.getApiKeyCriptografada() != null && !c.getApiKeyCriptografada().isBlank());
    }
}
