package com.smartlogix.inventory.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogEngagementServiceTest {

    @Mock
    private InventoryItemRepository itemRepository;

    @Mock
    private ProductReviewRepository reviewRepository;

    @Mock
    private ProductQuestionRepository questionRepository;

    private CatalogEngagementService engagementService;

    @BeforeEach
    void setUp() {
        engagementService = new CatalogEngagementService(
                itemRepository,
                reviewRepository,
                questionRepository
        );
    }

    @Test
    void updatesExistingReviewForSameCustomerAndProduct() {
        ProductReview existing = new ProductReview();
        existing.setSku("SKU-1001");
        existing.setUsername("cliente");
        existing.setRating(3);
        existing.setTitle("Anterior");
        existing.setComment("Comentario anterior");

        when(itemRepository.existsBySku("SKU-1001")).thenReturn(true);
        when(reviewRepository.findBySkuAndUsername("SKU-1001", "cliente"))
                .thenReturn(Optional.of(existing));
        when(reviewRepository.save(any(ProductReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductReviewResponse response = engagementService.saveReview(
                " sku-1001 ",
                "cliente",
                new ProductReviewRequest(5, " Excelente ", " Muy recomendado ")
        );

        assertEquals(5, response.rating());
        assertEquals("Excelente", response.title());
        assertEquals("Muy recomendado", response.comment());
        verify(reviewRepository).save(existing);
    }

    @Test
    void createsTrimmedQuestionForAuthenticatedCustomer() {
        when(itemRepository.existsBySku("SKU-1001")).thenReturn(true);
        when(questionRepository.save(any(ProductQuestion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductQuestionResponse response = engagementService.createQuestion(
                "SKU-1001",
                "cliente",
                new ProductQuestionRequest(" Incluye garantia? ")
        );

        assertEquals("Incluye garantia?", response.question());
        assertEquals("cliente", response.username());
    }

    @Test
    void customerCannotDeleteQuestionOwnedByAnotherUser() {
        when(questionRepository.findByIdAndSkuAndUsername(10L, "SKU-1001", "cliente"))
                .thenReturn(Optional.empty());

        assertThrows(InventoryNotFoundException.class, () ->
                engagementService.deleteQuestion("SKU-1001", 10L, "cliente")
        );
    }

    @Test
    void staffCanAnswerExistingQuestion() {
        ProductQuestion question = new ProductQuestion();
        question.setSku("SKU-1001");
        question.setUsername("cliente");
        question.setQuestion("Funciona en Windows?");

        when(itemRepository.existsBySku("SKU-1001")).thenReturn(true);
        when(questionRepository.findByIdAndSku(4L, "SKU-1001"))
                .thenReturn(Optional.of(question));
        when(questionRepository.save(any(ProductQuestion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductQuestionResponse response = engagementService.answerQuestion(
                "SKU-1001",
                4L,
                "admin",
                new ProductAnswerRequest("Si, es compatible.")
        );

        assertEquals("Si, es compatible.", response.answer());
        assertEquals("admin", response.answeredBy());
        assertNotNull(response.answeredAt());
    }
}
