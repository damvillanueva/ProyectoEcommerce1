package com.smartlogix.order.discount;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.smartlogix.order.repository.DiscountRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @Mock
    private DiscountRepository repository;

    private DiscountService service;

    @BeforeEach
    void setUp() {
        service = new DiscountService(repository);
    }

    @Test
    void validatesActiveDiscountAndCalculatesPreview() {
        Discount discount = discount("SMART10", 10);
        discount.setValidFrom(LocalDate.now().minusDays(1));
        discount.setValidUntil(LocalDate.now().plusDays(1));
        when(repository.findByCodeIgnoreCase("smart10")).thenReturn(Optional.of(discount));

        DiscountValidationResponse response = service.validate(
                new DiscountValidationRequest("smart10", BigDecimal.valueOf(50000))
        );

        assertThat(response.code()).isEqualTo("SMART10");
        assertThat(response.percentage()).isEqualTo(10);
        assertThat(response.discountAmount()).isEqualByComparingTo("5000");
        assertThat(response.totalAfterDiscount()).isEqualByComparingTo("45000");
    }

    @Test
    void rejectsExpiredDiscount() {
        Discount discount = discount("VENCIDO", 20);
        discount.setValidUntil(LocalDate.now().minusDays(1));
        when(repository.findByCodeIgnoreCase("VENCIDO")).thenReturn(Optional.of(discount));

        assertThatThrownBy(() -> service.validate(
                new DiscountValidationRequest("VENCIDO", BigDecimal.valueOf(10000))
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vencido");
    }

    private Discount discount(String code, int percentage) {
        Discount discount = new Discount();
        discount.setCode(code);
        discount.setName("Descuento " + code);
        discount.setPercentage(percentage);
        discount.setActive(true);
        discount.setOnlyNewUsers(false);
        return discount;
    }
}
