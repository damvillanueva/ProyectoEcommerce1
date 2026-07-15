package com.smartlogix.inventory.config;

import com.smartlogix.inventory.domain.ProductQuestion;
import com.smartlogix.inventory.domain.ProductReview;
import com.smartlogix.inventory.repository.ProductQuestionRepository;
import com.smartlogix.inventory.repository.ProductReviewRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class CatalogEngagementSeedConfig {

    @Bean
    @Order(2)
    CommandLineRunner catalogEngagementSeeder(
            ProductReviewRepository reviewRepository,
            ProductQuestionRepository questionRepository
    ) {
        return args -> {
            if (reviewRepository.count() == 0) {
                reviewRepository.saveAll(List.of(
                        review("SKU-1001", "camila.tech", 5, "Excelente teclado", "Se siente firme, el RGB se ve bien y llego rapido."),
                        review("SKU-1001", "matias.cl", 4, "Buena relacion precio calidad", "Compacto y comodo para trabajar y jugar."),
                        review("SKU-1001", "vale.gamer", 5, "Muy recomendado", "Los switches responden bien y la construccion se siente solida."),
                        review("SKU-3001", "diego.pro", 4, "Notebook equilibrado", "Buen rendimiento para estudio, oficina y uso diario.")
                ));
            }

            if (questionRepository.count() == 0) {
                ProductQuestion answered = question(
                        "SKU-1001",
                        "nicolas.pc",
                        "Es compatible con Windows 11?"
                );
                answered.setAnswer("Si, funciona por USB y no requiere controladores adicionales.");
                answered.setAnsweredBy("admin");
                answered.setAnsweredAt(OffsetDateTime.now());

                questionRepository.saveAll(List.of(
                        answered,
                        question("SKU-1001", "sofia.cl", "Incluye distribucion de teclas en espanol?"),
                        question("SKU-3001", "fernando.rm", "La memoria RAM se puede ampliar?")
                ));
            }
        };
    }

    private ProductReview review(
            String sku,
            String username,
            int rating,
            String title,
            String comment
    ) {
        ProductReview review = new ProductReview();
        review.setSku(sku);
        review.setUsername(username);
        review.setRating(rating);
        review.setTitle(title);
        review.setComment(comment);
        return review;
    }

    private ProductQuestion question(String sku, String username, String text) {
        ProductQuestion question = new ProductQuestion();
        question.setSku(sku);
        question.setUsername(username);
        question.setQuestion(text);
        return question;
    }
}
