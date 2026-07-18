package com.smartlogix.order.dto;

import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentStatus;
import java.time.LocalDate;

public record OrderTrackingResponse(
        String orderNumber,
        FulfillmentMethod fulfillmentMethod,
        OrderStatus orderStatus,
        PaymentStatus paymentStatus,
        String trackingCode,
        String shipmentStatus,
        String carrier,
        String routeCode,
        LocalDate estimatedDeliveryDate,
        String pickupLocation
) {
}
