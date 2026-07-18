package com.smartlogix.order.controller;

import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.UpdateOrderRequest;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.dto.OrderTrackingResponse;
import com.smartlogix.order.dto.ShippingQuoteRequest;
import com.smartlogix.order.dto.ShippingQuoteResponse;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.security.AuthenticatedUser;
import com.smartlogix.order.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderResponse createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            Authentication authentication
    ) {
        boolean customer = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
        AuthenticatedUser principal = authentication.getPrincipal() instanceof AuthenticatedUser user
                ? user
                : new AuthenticatedUser(authentication.getName(), null);

        return orderService.createOrder(
                request,
                customer ? principal.username() : null,
                customer ? principal.email() : null,
                customer ? OrderChannel.ONLINE : OrderChannel.STORE
        );
    }

    @PostMapping("/shipping-quote")
    public ShippingQuoteResponse quoteShipping(@Valid @RequestBody ShippingQuoteRequest request) {
        return orderService.quoteShipping(request);
    }

    @GetMapping("/mine")
    public List<OrderResponse> listMyOrders(Authentication authentication) {
        return orderService.getCustomerOrders(authentication.getName());
    }

    @GetMapping("/mine/{orderNumber}")
    public OrderResponse findMyOrder(
            Authentication authentication,
            @PathVariable String orderNumber
    ) {
        return orderService.getCustomerOrder(authentication.getName(), orderNumber);
    }

    @GetMapping("/mine/{orderNumber}/tracking")
    public OrderTrackingResponse findMyOrderTracking(
            Authentication authentication,
            @PathVariable String orderNumber
    ) {
        return orderService.getCustomerOrderTracking(authentication.getName(), orderNumber);
    }

    @GetMapping
    public List<OrderResponse> listOrders() {
        return orderService.getOrders();
    }

    @GetMapping("/{orderNumber}")
    public OrderResponse findByOrderNumber(@PathVariable String orderNumber) {
        return orderService.getOrderByNumber(orderNumber);
    }

    @PutMapping("/{orderNumber}")
    public OrderResponse updateOrder(
            @PathVariable String orderNumber,
            @Valid @RequestBody UpdateOrderRequest request) {
        return orderService.updateOrder(orderNumber, request);
    }

    @DeleteMapping("/{orderNumber}")
    public void deleteOrder(@PathVariable String orderNumber) {
        orderService.deleteOrder(orderNumber);
    }
}
