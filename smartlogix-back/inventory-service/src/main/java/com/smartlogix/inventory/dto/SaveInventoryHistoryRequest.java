package com.smartlogix.inventory.dto;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.MovementType;
import java.time.LocalDate;

public record SaveInventoryHistoryRequest(
        String product,
        MovementType type,
        ActionType action,
        String user,
        LocalDate startDate,
        LocalDate endDate,
        Integer minQuantity,
        Integer maxQuantity
) {
}
