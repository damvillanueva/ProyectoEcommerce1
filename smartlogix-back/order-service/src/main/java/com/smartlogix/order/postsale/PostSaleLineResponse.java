package com.smartlogix.order.postsale;

import com.smartlogix.order.domain.ProductCondition;
import java.math.BigDecimal;

public record PostSaleLineResponse(
        String sku,
        String productName,
        int requestedQuantity,
        int receivedQuantity,
        int restockedQuantity,
        BigDecimal unitPrice,
        ProductCondition condition
) {
}
