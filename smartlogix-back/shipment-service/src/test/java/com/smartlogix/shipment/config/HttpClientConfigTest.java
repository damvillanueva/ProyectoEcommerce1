package com.smartlogix.shipment.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

class HttpClientConfigTest {

    @Test
    void usesRequestFactoryThatSupportsPatchRequests() {
        RestTemplate restTemplate = new HttpClientConfig().restTemplate();

        assertThat(restTemplate.getRequestFactory())
                .isInstanceOf(HttpComponentsClientHttpRequestFactory.class);
    }
}
