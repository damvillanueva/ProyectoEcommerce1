package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record SupplierResponse(
        Long id,
        String code,
        String businessName,
        String taxId,
        String contactName,
        String email,
        String phone,
        String address,
        int paymentTermsDays,
        int leadTimeDays,
        boolean active,
        List<SupplierProductResponse> products,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
