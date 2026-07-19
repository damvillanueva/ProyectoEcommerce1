package com.smartlogix.gateway.filter;

import java.time.Duration;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    public static final String HEADER_NAME = "X-Correlation-ID";
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{7,127}");
    private static final Logger log = LoggerFactory.getLogger(CorrelationIdFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = resolveCorrelationId(
                exchange.getRequest().getHeaders().getFirst(HEADER_NAME)
        );
        long startedAt = System.nanoTime();

        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove(HEADER_NAME);
                    headers.set(HEADER_NAME, correlationId);
                })
                .build();
        ServerWebExchange correlatedExchange = exchange.mutate().request(request).build();
        correlatedExchange.getResponse().beforeCommit(() -> {
            correlatedExchange.getResponse().getHeaders().set(HEADER_NAME, correlationId);
            return Mono.empty();
        });

        return chain.filter(correlatedExchange)
                .doOnSuccess(ignored -> log.info(
                        "request_completed correlationId={} method={} path={} status={} durationMs={}",
                        correlationId,
                        request.getMethod(),
                        request.getURI().getPath(),
                        correlatedExchange.getResponse().getStatusCode(),
                        Duration.ofNanos(System.nanoTime() - startedAt).toMillis()
                ))
                .doOnError(error -> log.error(
                        "request_failed correlationId={} method={} path={} durationMs={} error={}",
                        correlationId,
                        request.getMethod(),
                        request.getURI().getPath(),
                        Duration.ofNanos(System.nanoTime() - startedAt).toMillis(),
                        error.getClass().getSimpleName()
                ));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private String resolveCorrelationId(String candidate) {
        if (candidate != null && VALID_ID.matcher(candidate).matches()) {
            return candidate;
        }
        return UUID.randomUUID().toString();
    }
}
