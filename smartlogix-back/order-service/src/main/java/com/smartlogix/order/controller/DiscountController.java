package com.smartlogix.order.controller;

import com.smartlogix.order.discount.DiscountRequest;
import com.smartlogix.order.discount.DiscountResponse;
import com.smartlogix.order.discount.DiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discounts")
@RequiredArgsConstructor
public class DiscountController {

    private final DiscountService discountService;

    @PostMapping
    public DiscountResponse create(@RequestBody DiscountRequest request) {
        return discountService.create(request);
    }

    @GetMapping
    public List<DiscountResponse> findAll() {
        return discountService.findAll();
    }

    @GetMapping("/{id}")
    public DiscountResponse findById(@PathVariable Long id) {
        return discountService.findById(id);
    }

    @PutMapping("/{id}")
    public DiscountResponse update(
            @PathVariable Long id,
            @RequestBody DiscountRequest request) {

        return discountService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        discountService.delete(id);
    }
}