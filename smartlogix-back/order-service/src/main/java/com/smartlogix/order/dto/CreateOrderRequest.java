package com.smartlogix.order.dto;

import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateOrderRequest(
        @NotBlank String customerName,
        @NotBlank @Email String customerEmail,
        String shippingAddress,
        String discountCode,
        FulfillmentMethod fulfillmentMethod,
        String pickupLocation,
        PaymentMethod paymentMethod,
        @NotEmpty List<@Valid OrderLineRequest> lines
) {
    public CreateOrderRequest(
            String customerName,
            String customerEmail,
            String shippingAddress,
            String discountCode,
            List<OrderLineRequest> lines
    ) {
        this(customerName, customerEmail, shippingAddress, discountCode, null, null, null, lines);
    }
}
