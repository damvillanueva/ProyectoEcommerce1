package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ProductQuestion;
import com.smartlogix.inventory.domain.ProductReview;
import com.smartlogix.inventory.dto.ProductAnswerRequest;
import com.smartlogix.inventory.dto.ProductQuestionRequest;
import com.smartlogix.inventory.dto.ProductQuestionResponse;
import com.smartlogix.inventory.dto.ProductReviewRequest;
import com.smartlogix.inventory.dto.ProductReviewResponse;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.ProductQuestionRepository;
import com.smartlogix.inventory.repository.ProductReviewRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CatalogEngagementService {

    private final InventoryItemRepository itemRepository;
    private final ProductReviewRepository reviewRepository;
    private final ProductQuestionRepository questionRepository;

    public CatalogEngagementService(
            InventoryItemRepository itemRepository,
            ProductReviewRepository reviewRepository,
            ProductQuestionRepository questionRepository
    ) {
        this.itemRepository = itemRepository;
        this.reviewRepository = reviewRepository;
        this.questionRepository = questionRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductReviewResponse> listReviews(String sku) {
        String normalizedSku = requireProduct(sku);
        return reviewRepository.findAllBySkuOrderByUpdatedAtDesc(normalizedSku)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductReviewResponse saveReview(
            String sku,
            String username,
            ProductReviewRequest request
    ) {
        String normalizedSku = requireProduct(sku);
        ProductReview review = reviewRepository
                .findBySkuAndUsername(normalizedSku, username)
                .orElseGet(() -> {
                    ProductReview created = new ProductReview();
                    created.setSku(normalizedSku);
                    created.setUsername(username);
                    return created;
                });

        review.setRating(request.rating());
        review.setTitle(request.title().trim());
        review.setComment(request.comment().trim());
        return toResponse(reviewRepository.save(review));
    }

    public void deleteReview(String sku, Long reviewId, String username) {
        String normalizedSku = normalizeSku(sku);
        ProductReview review = reviewRepository
                .findByIdAndSkuAndUsername(reviewId, normalizedSku, username)
                .orElseThrow(() -> new InventoryNotFoundException(
                        "No existe una resena propia con ese identificador."));
        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public List<ProductQuestionResponse> listQuestions(String sku) {
        String normalizedSku = requireProduct(sku);
        return questionRepository.findAllBySkuOrderByCreatedAtDesc(normalizedSku)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductQuestionResponse createQuestion(
            String sku,
            String username,
            ProductQuestionRequest request
    ) {
        String normalizedSku = requireProduct(sku);
        ProductQuestion question = new ProductQuestion();
        question.setSku(normalizedSku);
        question.setUsername(username);
        question.setQuestion(request.question().trim());
        return toResponse(questionRepository.save(question));
    }

    public void deleteQuestion(String sku, Long questionId, String username) {
        String normalizedSku = normalizeSku(sku);
        ProductQuestion question = questionRepository
                .findByIdAndSkuAndUsername(questionId, normalizedSku, username)
                .orElseThrow(() -> new InventoryNotFoundException(
                        "No existe una pregunta propia con ese identificador."));
        questionRepository.delete(question);
    }

    public ProductQuestionResponse answerQuestion(
            String sku,
            Long questionId,
            String username,
            ProductAnswerRequest request
    ) {
        String normalizedSku = requireProduct(sku);
        ProductQuestion question = questionRepository.findByIdAndSku(questionId, normalizedSku)
                .orElseThrow(() -> new InventoryNotFoundException("No existe la pregunta solicitada."));
        question.setAnswer(request.answer().trim());
        question.setAnsweredBy(username);
        question.setAnsweredAt(OffsetDateTime.now());
        return toResponse(questionRepository.save(question));
    }

    private String requireProduct(String sku) {
        String normalizedSku = normalizeSku(sku);
        if (!itemRepository.existsBySku(normalizedSku)) {
            throw new InventoryNotFoundException("No existe un producto con SKU " + normalizedSku);
        }
        return normalizedSku;
    }

    private String normalizeSku(String sku) {
        return sku == null ? "" : sku.trim().toUpperCase(Locale.ROOT);
    }

    private ProductReviewResponse toResponse(ProductReview review) {
        return new ProductReviewResponse(
                review.getId(),
                review.getSku(),
                review.getUsername(),
                review.getRating(),
                review.getTitle(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    private ProductQuestionResponse toResponse(ProductQuestion question) {
        return new ProductQuestionResponse(
                question.getId(),
                question.getSku(),
                question.getUsername(),
                question.getQuestion(),
                question.getAnswer(),
                question.getAnsweredBy(),
                question.getCreatedAt(),
                question.getAnsweredAt()
        );
    }
}
