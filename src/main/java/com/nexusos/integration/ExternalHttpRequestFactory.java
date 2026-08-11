package com.nexusos.integration;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

public final class ExternalHttpRequestFactory {
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(30);

    private ExternalHttpRequestFactory() {
    }

    public static SimpleClientHttpRequestFactory create() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return factory;
    }
}
