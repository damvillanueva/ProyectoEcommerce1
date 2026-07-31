package com.smartlogix.order.controller;

import com.smartlogix.order.pos.CashRegisterResponse;
import com.smartlogix.order.pos.CloseCashRegisterRequest;
import com.smartlogix.order.pos.CreatePosSaleRequest;
import com.smartlogix.order.pos.OpenCashRegisterRequest;
import com.smartlogix.order.pos.PosSaleResponse;
import com.smartlogix.order.service.PosService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pos")
public class PosController {

    private final PosService posService;

    public PosController(PosService posService) {
        this.posService = posService;
    }

    @PostMapping("/sessions/open")
    public CashRegisterResponse openSession(
            Authentication authentication,
            @Valid @RequestBody OpenCashRegisterRequest request
    ) {
        return posService.openSession(authentication.getName(), request);
    }

    @GetMapping("/sessions/current")
    public ResponseEntity<CashRegisterResponse> currentSession(Authentication authentication) {
        return posService.currentSession(authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/sessions/history")
    public List<CashRegisterResponse> sessionHistory(Authentication authentication) {
        return posService.sessionHistory(authentication.getName());
    }

    @PostMapping("/sessions/{sessionNumber}/close")
    public CashRegisterResponse closeSession(
            Authentication authentication,
            @PathVariable String sessionNumber,
            @Valid @RequestBody CloseCashRegisterRequest request
    ) {
        return posService.closeSession(authentication.getName(), sessionNumber, request);
    }

    @GetMapping("/sessions/{sessionNumber}/sales")
    public List<PosSaleResponse> sessionSales(
            Authentication authentication,
            @PathVariable String sessionNumber
    ) {
        return posService.sessionSales(authentication.getName(), sessionNumber);
    }

    @PostMapping("/sales")
    public PosSaleResponse createSale(
            Authentication authentication,
            @Valid @RequestBody CreatePosSaleRequest request
    ) {
        return posService.createSale(authentication.getName(), request);
    }
}
