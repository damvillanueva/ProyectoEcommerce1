package com.smartlogix.order.pos;

import com.smartlogix.order.client.CatalogProductResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.InventoryBatchLineRequest;
import com.smartlogix.order.domain.CashRegisterStatus;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.repository.CashRegisterSessionRepository;
import com.smartlogix.order.repository.DiscountRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import com.smartlogix.order.service.PosService;
import com.smartlogix.order.service.OrderService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class PosServiceTest {

    @Autowired
    private PosService posService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PurchaseOrderRepository orderRepository;

    @Autowired
    private CashRegisterSessionRepository sessionRepository;

    @Autowired
    private DiscountRepository discountRepository;

    @MockBean
    private InventoryClient inventoryClient;

    @BeforeEach
    void cleanDatabase() {
        orderRepository.deleteAll();
        sessionRepository.deleteAll();
        discountRepository.deleteAll();
    }

    @Test
    void cashSaleCompletesOrderDispatchesStockAndUpdatesRegister() {
        CashRegisterResponse opened = posService.openSession(
                "cajero",
                new OpenCashRegisterRequest("caja 01", BigDecimal.valueOf(10000))
        );
        when(inventoryClient.findProduct("SKU-1001")).thenReturn(product(
                "SKU-1001",
                "Teclado mecanico",
                8,
                15000
        ));

        PosSaleResponse sale = posService.createSale("cajero", new CreatePosSaleRequest(
                opened.sessionNumber(),
                "Cliente presencial",
                "cliente@ejemplo.cl",
                null,
                PaymentMethod.POS_CASH,
                BigDecimal.valueOf(35000),
                List.of(new OrderLineRequest("sku-1001", 2))
        ));

        assertThat(sale.status()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(sale.paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(sale.totalAmount()).isEqualByComparingTo("30000.00");
        assertThat(sale.changeAmount()).isEqualByComparingTo("5000.00");
        assertThat(sale.receiptNumber()).startsWith("CMP-");
        assertThat(sale.lines()).singleElement()
                .satisfies(line -> assertThat(line.productName()).isEqualTo("Teclado mecanico"));

        CashRegisterResponse current = posService.currentSession("cajero").orElseThrow();
        assertThat(current.saleCount()).isEqualTo(1);
        assertThat(current.cashSalesAmount()).isEqualByComparingTo("30000.00");
        assertThat(current.totalSalesAmount()).isEqualByComparingTo("30000.00");
        assertThat(current.expectedCash()).isEqualByComparingTo("40000.00");
        verify(inventoryClient).reserve("SKU-1001", 2);
        verify(inventoryClient).dispatchBatch(List.of(new InventoryBatchLineRequest("SKU-1001", 2)));
        assertThat(orderService.getOrders()).isEmpty();
        assertThatThrownBy(() -> orderService.deleteOrder(sale.orderNumber()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ventas POS");
    }

    @Test
    void cashSaleRejectsTenderBelowTotalBeforeChangingStock() {
        CashRegisterResponse opened = posService.openSession(
                "cajero",
                new OpenCashRegisterRequest("CAJA-01", BigDecimal.ZERO)
        );
        when(inventoryClient.findProduct("SKU-2001")).thenReturn(product(
                "SKU-2001",
                "Monitor",
                3,
                100000
        ));

        assertThatThrownBy(() -> posService.createSale("cajero", new CreatePosSaleRequest(
                opened.sessionNumber(),
                null,
                null,
                null,
                PaymentMethod.POS_CASH,
                BigDecimal.valueOf(50000),
                List.of(new OrderLineRequest("SKU-2001", 1))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no cubre");

        verify(inventoryClient).findProduct("SKU-2001");
    }

    @Test
    void onlyOwnerCanOperateAndCloseRegister() {
        CashRegisterResponse opened = posService.openSession(
                "cajero",
                new OpenCashRegisterRequest("CAJA-02", BigDecimal.valueOf(5000))
        );

        assertThatThrownBy(() -> posService.closeSession(
                "otro",
                opened.sessionNumber(),
                new CloseCashRegisterRequest(BigDecimal.valueOf(5000))
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("otro usuario");

        CashRegisterResponse closed = posService.closeSession(
                "cajero",
                opened.sessionNumber(),
                new CloseCashRegisterRequest(BigDecimal.valueOf(4500))
        );
        assertThat(closed.status()).isEqualTo(CashRegisterStatus.CLOSED);
        assertThat(closed.cashDifference()).isEqualByComparingTo("-500.00");
    }

    @Test
    void customerPaymentMethodsAreNotAcceptedByPos() {
        CashRegisterResponse opened = posService.openSession(
                "cajero",
                new OpenCashRegisterRequest("CAJA-03", BigDecimal.ZERO)
        );

        assertThatThrownBy(() -> posService.createSale("cajero", new CreatePosSaleRequest(
                opened.sessionNumber(),
                null,
                null,
                null,
                PaymentMethod.WEBPAY_SIMULATED,
                null,
                List.of(new OrderLineRequest("SKU-3001", 1))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no esta disponible");

        verifyNoInteractions(inventoryClient);
    }

    private CatalogProductResponse product(String sku, String name, int available, long price) {
        return new CatalogProductResponse(
                sku,
                name,
                null,
                "Perifericos",
                BigDecimal.valueOf(price),
                available,
                available > 0,
                false
        );
    }
}
