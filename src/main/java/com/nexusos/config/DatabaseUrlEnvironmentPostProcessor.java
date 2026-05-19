package com.nexusos.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "railwayDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");

        if (!StringUtils.hasText(databaseUrl) || databaseUrl.startsWith("jdbc:")) {
            return;
        }

        if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
            return;
        }

        URI uri = URI.create(databaseUrl);
        Map<String, Object> properties = new HashMap<>();
        properties.put("spring.datasource.url", toJdbcUrl(uri));

        if (!StringUtils.hasText(environment.getProperty("SPRING_DATASOURCE_USERNAME"))) {
            String username = extractUsername(uri);
            if (StringUtils.hasText(username)) {
                properties.put("spring.datasource.username", username);
            }
        }

        if (!StringUtils.hasText(environment.getProperty("SPRING_DATASOURCE_PASSWORD"))) {
            String password = extractPassword(uri);
            if (StringUtils.hasText(password)) {
                properties.put("spring.datasource.password", password);
            }
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    private String toJdbcUrl(URI uri) {
        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                .append(uri.getHost());

        if (uri.getPort() > 0) {
            jdbcUrl.append(":").append(uri.getPort());
        }

        jdbcUrl.append(uri.getPath());

        if (StringUtils.hasText(uri.getQuery())) {
            jdbcUrl.append("?").append(uri.getQuery());
        }

        return jdbcUrl.toString();
    }

    private String extractUsername(URI uri) {
        String userInfo = uri.getUserInfo();
        if (!StringUtils.hasText(userInfo)) {
            return null;
        }

        return decode(userInfo.split(":", 2)[0]);
    }

    private String extractPassword(URI uri) {
        String userInfo = uri.getUserInfo();
        if (!StringUtils.hasText(userInfo) || !userInfo.contains(":")) {
            return null;
        }

        return decode(userInfo.split(":", 2)[1]);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
