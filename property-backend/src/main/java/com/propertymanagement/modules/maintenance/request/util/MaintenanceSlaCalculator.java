package com.propertymanagement.modules.maintenance.request.util;

import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;

import java.time.LocalDateTime;

public final class MaintenanceSlaCalculator {

    private MaintenanceSlaCalculator() {}

    public static LocalDateTime deadlineFor(RequestPriority priority, LocalDateTime from) {
        LocalDateTime base = from != null ? from : LocalDateTime.now();
        RequestPriority p = priority != null ? priority : RequestPriority.NORMAL;
        return switch (p) {
            case URGENT -> base.plusHours(4);
            case HIGH -> base.plusHours(24);
            case NORMAL -> base.plusHours(48);
            case LOW -> base.plusHours(72);
        };
    }
}
