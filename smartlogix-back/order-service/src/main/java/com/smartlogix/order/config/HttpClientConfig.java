package com.smartlogix.order.config;

import com.smartlogix.order.observability.CorrelationIdFilter;
import org.slf4j.MDC;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.client.RestTemplate;

@Configuration
public class HttpClientConfig {

    @Bean
    @LoadBalanced
    RestTemplate restTemplate(RestTemplateBuilder builder) {
        RestTemplate restTemplate = builder.build();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
                String incomingCorrelationId = attributes.getRequest()
                        .getHeader(CorrelationIdFilter.HEADER_NAME);
                if (StringUtils.hasText(incomingCorrelationId)) {
                    correlationId = incomingCorrelationId;
                }
                String authorization = attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                if (StringUtils.hasText(authorization)
                        && !request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                    request.getHeaders().set(HttpHeaders.AUTHORIZATION, authorization);
                }
            }
            if (StringUtils.hasText(correlationId)) {
                request.getHeaders().set(CorrelationIdFilter.HEADER_NAME, correlationId);
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }
}
