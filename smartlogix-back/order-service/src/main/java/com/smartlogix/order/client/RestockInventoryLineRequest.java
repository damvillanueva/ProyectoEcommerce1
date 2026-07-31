package com.smartlogix.order.client;

public record RestockInventoryLineRequest(String sku, int quantity) {
}
