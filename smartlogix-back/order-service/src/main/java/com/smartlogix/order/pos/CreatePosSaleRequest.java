package com.smartlogix.order.pos;

import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.dto.OrderLineRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record CreatePosSaleRequest(
        @NotBlank String sessionNumber,
        String customerName,
        @Email String customerEmail,
        String discountCode,
        @NotNull PaymentMethod paymentMethod,
        BigDecimal amountTendered,
        @NotEmpty List<@Valid OrderLineRequest> lines
) {
}
