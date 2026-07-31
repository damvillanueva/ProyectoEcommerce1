package com.smartlogix.order.pos;

import java.math.BigDecimal;

public record PosSaleLineResponse(
        String sku,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
}
