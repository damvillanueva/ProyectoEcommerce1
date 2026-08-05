package com.smartlogix.order.controller;

import com.smartlogix.order.dto.NotificationResponse;
import com.smartlogix.order.service.OrderNotificationService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final OrderNotificationService service;

    public NotificationController(OrderNotificationService service) {
        this.service = service;
    }

    @GetMapping("/mine")
    public List<NotificationResponse> listMine(Authentication authentication) {
        return service.listMine(authentication.getName());
    }

    @PatchMapping("/mine/{notificationId}/read")
    public NotificationResponse markMineRead(
            Authentication authentication,
            @PathVariable Long notificationId
    ) {
        return service.markMineRead(authentication.getName(), notificationId);
    }

    @PatchMapping("/mine/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllMineRead(Authentication authentication) {
        service.markAllMineRead(authentication.getName());
    }

    @GetMapping
    public List<NotificationResponse> listAll() {
        return service.listAll();
    }

    @PostMapping("/{notificationId}/retry")
    public NotificationResponse retry(@PathVariable Long notificationId) {
        return service.retry(notificationId);
    }
}
