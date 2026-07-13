package com.smartlogix.order.controller;

import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.UpdateOrderRequest;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
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
