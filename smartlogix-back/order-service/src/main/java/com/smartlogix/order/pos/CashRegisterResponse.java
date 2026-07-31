package com.smartlogix.order.pos;

import com.smartlogix.order.domain.CashRegisterStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CashRegisterResponse(
        String sessionNumber,
        String registerCode,
        String openedBy,
        String closedBy,
        CashRegisterStatus status,
        BigDecimal openingAmount,
        BigDecimal cashSalesAmount,
        BigDecimal totalSalesAmount,
        int saleCount,
        BigDecimal expectedCash,
        BigDecimal declaredCash,
        BigDecimal cashDifference,
        OffsetDateTime openedAt,
        OffsetDateTime closedAt
) {
}
