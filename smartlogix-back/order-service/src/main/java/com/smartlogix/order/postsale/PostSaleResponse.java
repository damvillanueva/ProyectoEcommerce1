package com.smartlogix.order.postsale;

import com.smartlogix.order.domain.PostSaleResolution;
import com.smartlogix.order.domain.PostSaleStatus;
import com.smartlogix.order.domain.PostSaleType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PostSaleResponse(
        String requestNumber,
        String orderNumber,
        String customerUsername,
        String customerName,
        String customerEmail,
        PostSaleType type,
        PostSaleStatus status,
        PostSaleResolution preferredResolution,
        PostSaleResolution finalResolution,
        String reason,
        String customerNotes,
        String staffResponse,
        String reviewedBy,
        String receivedBy,
        String resolvedBy,
        String receivingWarehouseCode,
        String resolutionReference,
        String replacementTrackingCode,
        BigDecimal refundAmount,
        String refundReference,
        OffsetDateTime requestedAt,
        OffsetDateTime reviewedAt,
        OffsetDateTime receivedAt,
        OffsetDateTime resolvedAt,
        OffsetDateTime cancelledAt,
        List<PostSaleLineResponse> lines
) {
}
