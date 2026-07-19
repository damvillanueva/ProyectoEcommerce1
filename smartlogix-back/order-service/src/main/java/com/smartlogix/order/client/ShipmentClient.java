package com.smartlogix.order.client;

import com.smartlogix.order.observability.CorrelationIdFilter;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.client.RestTemplate;

@Component
public class ShipmentClient {

    private static final Logger log = LoggerFactory.getLogger(ShipmentClient.class);

    private final RestTemplate restTemplate;
    private final CircuitBreakerFactory<?, ?> circuitBreakerFactory;
    private final SecretKey signingKey;

    public ShipmentClient(
            RestTemplate restTemplate,
            CircuitBreakerFactory<?, ?> circuitBreakerFactory,
            @Value("${jwt.secret}") String jwtSecret
    ) {
        this.restTemplate = restTemplate;
        this.circuitBreakerFactory = circuitBreakerFactory;
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public ShipmentResponse requestShipment(ShipmentRequest request) {
        String correlationId = currentCorrelationId();
        return circuitBreakerFactory.create("shipmentService").run(
                () -> restTemplate.exchange(
                        "http://shipment-service/api/shipments",
                        HttpMethod.POST,
                        authorizedEntity(request, correlationId),
                        ShipmentResponse.class
                ).getBody(),
                (Throwable throwable) -> {
                    log.error(
                            "shipment_client_create_failed orderNumber={}",
                            request.orderNumber(),
                            throwable
                    );
                    return fallbackResponse(request);
                }
        );
    }

    public ShipmentResponse getShipment(String trackingCode) {
        String correlationId = currentCorrelationId();
        return circuitBreakerFactory.create("shipmentService").run(
                () -> restTemplate.exchange(
                        "http://shipment-service/api/shipments/{trackingCode}",
                        HttpMethod.GET,
                        authorizedEntity(null, correlationId),
                        ShipmentResponse.class,
                        trackingCode
                ).getBody(),
                (Throwable throwable) -> {
                    log.warn(
                            "shipment_client_lookup_failed trackingCode={} error={}",
                            trackingCode,
                            throwable.getClass().getSimpleName()
                    );
                    return null;
                }
        );
    }

    public boolean updateShipment(String trackingCode, ShipmentRequest request) {
        String correlationId = currentCorrelationId();
        return circuitBreakerFactory.create("shipmentService").run(
                () -> {
                    ShipmentResponse currentShipment = restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.GET,
                            authorizedEntity(null, correlationId),
                            ShipmentResponse.class,
                            trackingCode
                    ).getBody();
                    String currentStatus = currentShipment == null || currentShipment.status() == null
                            ? "PLANNED"
                            : currentShipment.status();

                    restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.PUT,
                            authorizedEntity(new ShipmentUpdateRequest(
                                    request.orderNumber(),
                                    request.destinationAddress(),
                                    request.totalUnits(),
                                    currentStatus
                            ), correlationId),
                            ShipmentResponse.class,
                            trackingCode
                    );

                    return true;
                },
                (Throwable throwable) -> {
                    log.error(
                            "shipment_client_update_failed trackingCode={}",
                            trackingCode,
                            throwable
                    );
                    return false;
                }
        );
    }

    public boolean deleteShipment(String trackingCode) {
        String correlationId = currentCorrelationId();
        return circuitBreakerFactory.create("shipmentService").run(
                () -> {
                    restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.DELETE,
                            authorizedEntity(null, correlationId),
                            Void.class,
                            trackingCode
                    );

                    return true;
                },
                (Throwable throwable) -> {
                    log.error(
                            "shipment_client_delete_failed trackingCode={}",
                            trackingCode,
                            throwable
                    );
                    return false;
                }
        );
    }

    private <T> HttpEntity<T> authorizedEntity(T body, String correlationId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(createInternalToken());
        if (StringUtils.hasText(correlationId)) {
            headers.set(CorrelationIdFilter.HEADER_NAME, correlationId);
        }
        return new HttpEntity<>(body, headers);
    }

    private String currentCorrelationId() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            String incomingCorrelationId = attributes.getRequest()
                    .getHeader(CorrelationIdFilter.HEADER_NAME);
            if (StringUtils.hasText(incomingCorrelationId)) {
                return incomingCorrelationId;
            }
        }
        return MDC.get(CorrelationIdFilter.MDC_KEY);
    }

    private String createInternalToken() {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject("order-service")
                .claim("role", "ROLE_ORDER_SERVICE")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
    }

    private ShipmentResponse fallbackResponse(ShipmentRequest request) {
        return new ShipmentResponse(
                null,
                request.orderNumber(),
                "NO_CARRIER",
                "NO_ROUTE",
                null,
                "PENDING_MANUAL_ASSIGNMENT"
        );
    }
}
