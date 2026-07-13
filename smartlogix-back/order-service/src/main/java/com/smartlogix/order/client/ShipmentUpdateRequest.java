package com.smartlogix.order.client;

public record ShipmentUpdateRequest(
        String orderNumber,
        String destinationAddress,
        int totalUnits,
        String status
) {
}
