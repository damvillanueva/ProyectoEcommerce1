package com.smartlogix.order.client;

import com.smartlogix.order.security.InternalServiceTokenProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import java.util.List;

@Component
public class InventoryClient {

    private final RestTemplate restTemplate;
    private final InternalServiceTokenProvider internalServiceTokenProvider;

    public InventoryClient(
            RestTemplate restTemplate,
            InternalServiceTokenProvider internalServiceTokenProvider
    ) {
        this.restTemplate = restTemplate;
        this.internalServiceTokenProvider = internalServiceTokenProvider;
    }

    public CatalogProductResponse findProduct(String sku) {
        try {
            return restTemplate.getForObject(
                    "http://inventory-service/api/catalog/products/{sku}",
                    CatalogProductResponse.class,
                    sku
            );
        } catch (RestClientException ex) {
            throw new InventoryClientException("No fue posible consultar el producto " + sku, ex);
        }
    }

    public InventoryAvailabilityResponse checkAvailability(String sku, int quantity) {
        return restTemplate.getForObject(
                "http://inventory-service/api/inventory/items/{sku}/availability?quantity={quantity}",
                InventoryAvailabilityResponse.class,
                sku,
                quantity
        );
    }

    public void reserve(String sku, int quantity) {
        try {
            restTemplate.postForObject(
                    "http://inventory-service/api/inventory/items/{sku}/reserve?quantity={quantity}",
                    internalRequest(),
                    Object.class,
                    sku,
                    quantity
            );
        } catch (RestClientException ex) {
            throw new InventoryClientException("No fue posible reservar stock para " + sku, ex);
        }
    }

    public void release(String sku, int quantity) {
        try {
            restTemplate.postForObject(
                    "http://inventory-service/api/inventory/items/{sku}/release?quantity={quantity}",
                    internalRequest(),
                    Object.class,
                    sku,
                    quantity
            );
        } catch (RestClientException ex) {
            throw new InventoryClientException("No fue posible liberar stock para " + sku, ex);
        }
    }

    public void dispatch(String sku, int quantity) {
        try {
            restTemplate.postForObject(
                    "http://inventory-service/api/inventory/items/{sku}/dispatch?quantity={quantity}",
                    internalRequest(),
                    Object.class,
                    sku,
                    quantity
            );
        } catch (RestClientException ex) {
            throw new InventoryClientException("No fue posible descontar stock para " + sku, ex);
        }
    }

    public void dispatchBatch(List<InventoryBatchLineRequest> lines) {
        try {
            restTemplate.postForObject(
                    "http://inventory-service/api/inventory/items/dispatch-batch",
                    authorizedRequest(new DispatchInventoryBatchRequest(lines)),
                    Object.class
            );
        } catch (RestClientException ex) {
            throw new InventoryClientException("No fue posible descontar el lote de inventario", ex);
        }
    }

    private HttpEntity<Void> internalRequest() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(internalServiceTokenProvider.createInventoryToken());
        return new HttpEntity<>(headers);
    }

    private <T> HttpEntity<T> authorizedRequest(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(internalServiceTokenProvider.createInventoryToken());
        return new HttpEntity<>(body, headers);
    }
}
