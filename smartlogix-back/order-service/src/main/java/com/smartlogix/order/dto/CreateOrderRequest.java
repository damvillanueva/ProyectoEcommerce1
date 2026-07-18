package com.smartlogix.order.dto;

import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.ShippingMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateOrderRequest(
        @NotBlank String customerName,
        @NotBlank @Email String customerEmail,
        String customerPhone,
        String customerDocument,
        boolean marketingOptIn,
        String shippingAddress,
        String billingAddress,
        String deliveryInstructions,
        String discountCode,
        FulfillmentMethod fulfillmentMethod,
        String pickupLocation,
        ShippingMethod shippingMethod,
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
        this(
                customerName,
                customerEmail,
                null,
                null,
                false,
                shippingAddress,
                shippingAddress,
                null,
                discountCode,
                null,
                null,
                null,
                null,
                lines
        );
    }

    public CreateOrderRequest(
            String customerName,
            String customerEmail,
            String shippingAddress,
            String discountCode,
            FulfillmentMethod fulfillmentMethod,
            String pickupLocation,
            PaymentMethod paymentMethod,
            List<OrderLineRequest> lines
    ) {
        this(
                customerName,
                customerEmail,
                null,
                null,
                false,
                shippingAddress,
                shippingAddress,
                null,
                discountCode,
                fulfillmentMethod,
                pickupLocation,
                null,
                paymentMethod,
                lines
        );
    }
}
