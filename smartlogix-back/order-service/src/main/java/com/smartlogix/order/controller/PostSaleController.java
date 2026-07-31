package com.smartlogix.order.controller;

import com.smartlogix.order.postsale.CreatePostSaleRequest;
import com.smartlogix.order.postsale.PostSaleResponse;
import com.smartlogix.order.postsale.ReceivePostSaleRequest;
import com.smartlogix.order.postsale.ResolvePostSaleRequest;
import com.smartlogix.order.postsale.ReviewPostSaleRequest;
import com.smartlogix.order.service.PostSaleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/returns")
public class PostSaleController {

    private final PostSaleService service;

    public PostSaleController(PostSaleService service) {
        this.service = service;
    }

    @GetMapping("/mine")
    public List<PostSaleResponse> listMine(Authentication authentication) {
        return service.listCustomerRequests(authentication.getName());
    }

    @PostMapping("/mine/orders/{orderNumber}")
    public PostSaleResponse createMine(
            Authentication authentication,
            @PathVariable String orderNumber,
            @Valid @RequestBody CreatePostSaleRequest request
    ) {
        return service.createCustomerRequest(authentication.getName(), orderNumber, request);
    }

    @PostMapping("/mine/{requestNumber}/cancel")
    public PostSaleResponse cancelMine(
            Authentication authentication,
            @PathVariable String requestNumber
    ) {
        return service.cancelCustomerRequest(authentication.getName(), requestNumber);
    }

    @GetMapping
    public List<PostSaleResponse> listAll() {
        return service.listRequests();
    }

    @GetMapping("/{requestNumber}")
    public PostSaleResponse findByNumber(@PathVariable String requestNumber) {
        return service.findRequest(requestNumber);
    }

    @PostMapping("/{requestNumber}/review")
    public PostSaleResponse review(
            Authentication authentication,
            @PathVariable String requestNumber,
            @Valid @RequestBody ReviewPostSaleRequest request
    ) {
        return service.review(requestNumber, authentication.getName(), request);
    }

    @PostMapping("/{requestNumber}/receive")
    public PostSaleResponse receive(
            Authentication authentication,
            @PathVariable String requestNumber,
            @Valid @RequestBody ReceivePostSaleRequest request
    ) {
        return service.receive(requestNumber, authentication.getName(), request);
    }

    @PostMapping("/{requestNumber}/resolve")
    public PostSaleResponse resolve(
            Authentication authentication,
            @PathVariable String requestNumber,
            @Valid @RequestBody ResolvePostSaleRequest request
    ) {
        return service.resolve(requestNumber, authentication.getName(), request);
    }
}
