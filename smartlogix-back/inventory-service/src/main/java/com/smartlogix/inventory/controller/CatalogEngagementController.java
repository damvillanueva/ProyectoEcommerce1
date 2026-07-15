package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.ProductAnswerRequest;
import com.smartlogix.inventory.dto.ProductQuestionRequest;
import com.smartlogix.inventory.dto.ProductQuestionResponse;
import com.smartlogix.inventory.dto.ProductReviewRequest;
import com.smartlogix.inventory.dto.ProductReviewResponse;
import com.smartlogix.inventory.service.CatalogEngagementService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/products/{sku}")
public class CatalogEngagementController {

    private final CatalogEngagementService engagementService;

    public CatalogEngagementController(CatalogEngagementService engagementService) {
        this.engagementService = engagementService;
    }

    @GetMapping("/reviews")
    public List<ProductReviewResponse> listReviews(@PathVariable String sku) {
        return engagementService.listReviews(sku);
    }

    @PostMapping("/reviews")
    public ProductReviewResponse saveReview(
            @PathVariable String sku,
            Authentication authentication,
            @Valid @RequestBody ProductReviewRequest request
    ) {
        return engagementService.saveReview(sku, authentication.getName(), request);
    }

    @DeleteMapping("/reviews/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(
            @PathVariable String sku,
            @PathVariable Long reviewId,
            Authentication authentication
    ) {
        engagementService.deleteReview(sku, reviewId, authentication.getName());
    }

    @GetMapping("/questions")
    public List<ProductQuestionResponse> listQuestions(@PathVariable String sku) {
        return engagementService.listQuestions(sku);
    }

    @PostMapping("/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductQuestionResponse createQuestion(
            @PathVariable String sku,
            Authentication authentication,
            @Valid @RequestBody ProductQuestionRequest request
    ) {
        return engagementService.createQuestion(sku, authentication.getName(), request);
    }

    @DeleteMapping("/questions/{questionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(
            @PathVariable String sku,
            @PathVariable Long questionId,
            Authentication authentication
    ) {
        engagementService.deleteQuestion(sku, questionId, authentication.getName());
    }

    @PutMapping("/questions/{questionId}/answer")
    public ProductQuestionResponse answerQuestion(
            @PathVariable String sku,
            @PathVariable Long questionId,
            Authentication authentication,
            @Valid @RequestBody ProductAnswerRequest request
    ) {
        return engagementService.answerQuestion(sku, questionId, authentication.getName(), request);
    }
}
