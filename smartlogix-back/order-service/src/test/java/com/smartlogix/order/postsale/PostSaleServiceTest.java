package com.smartlogix.order.postsale;

import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.RestockInventoryLineRequest;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.domain.PostSaleResolution;
import com.smartlogix.order.domain.PostSaleStatus;
import com.smartlogix.order.domain.PostSaleType;
import com.smartlogix.order.domain.ProductCondition;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.repository.PostSaleRequestRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import com.smartlogix.order.service.PostSaleService;
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

@SpringBootTest
@ActiveProfiles("test")
class PostSaleServiceTest {

    @Autowired
    private PostSaleService service;

    @Autowired
    private PostSaleRequestRepository requestRepository;

    @Autowired
    private PurchaseOrderRepository orderRepository;

    @MockBean
    private InventoryClient inventoryClient;

    @MockBean
    private ShipmentClient shipmentClient;

    @BeforeEach
    void cleanDatabase() {
        requestRepository.deleteAll();
        orderRepository.deleteAll();
    }

    @Test
    void returnFlowRestocksProductAndRegistersPartialRefund() {
        PurchaseOrder order = saveCompletedOrder(2, "10000.00");
        PostSaleResponse created = service.createCustomerRequest(
                "cliente",
                order.getOrderNumber(),
                new CreatePostSaleRequest(
                        PostSaleType.RETURN,
                        PostSaleResolution.REFUND,
                        "Producto sin uso",
                        "Conserva su empaque.",
                        List.of(new CreatePostSaleLineRequest("sku-test", 1))
                )
        );

        PostSaleResponse approved = service.review(
                created.requestNumber(),
                "vendedor",
                new ReviewPostSaleRequest(true, "Entrega autorizada.")
        );
        PostSaleResponse received = service.receive(
                created.requestNumber(),
                "bodega",
                new ReceivePostSaleRequest(
                        "WH-SCL-01",
                        List.of(new ReceivePostSaleLineRequest(
                                "SKU-TEST",
                                1,
                                1,
                                ProductCondition.OPENED
                        ))
                )
        );
        PostSaleResponse resolved = service.resolve(
                created.requestNumber(),
                "vendedor",
                new ResolvePostSaleRequest(PostSaleResolution.REFUND, "Reembolso aprobado.")
        );

        assertThat(approved.status()).isEqualTo(PostSaleStatus.APPROVED);
        assertThat(received.status()).isEqualTo(PostSaleStatus.RECEIVED);
        assertThat(resolved.status()).isEqualTo(PostSaleStatus.RESOLVED);
        assertThat(resolved.refundAmount()).isEqualByComparingTo("10000.00");
        assertThat(resolved.refundReference()).startsWith("RFD-");
        PurchaseOrder updatedOrder = orderRepository.findByOrderNumber(order.getOrderNumber()).orElseThrow();
        assertThat(updatedOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_REFUNDED);
        assertThat(updatedOrder.getRefundAmount()).isEqualByComparingTo("10000.00");
        verify(inventoryClient).restockBatch(
                "WH-SCL-01",
                created.requestNumber(),
                List.of(new RestockInventoryLineRequest("SKU-TEST", 1))
        );
    }

    @Test
    void cannotRequestMoreUnitsThanPurchased() {
        PurchaseOrder order = saveCompletedOrder(2, "10000.00");

        assertThatThrownBy(() -> service.createCustomerRequest(
                "cliente",
                order.getOrderNumber(),
                new CreatePostSaleRequest(
                        PostSaleType.EXCHANGE,
                        PostSaleResolution.REPLACEMENT,
                        "Producto incorrecto",
                        "Solicito cambio.",
                        List.of(new CreatePostSaleLineRequest("SKU-TEST", 3))
                )
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Solo quedan 2");
    }

    @Test
    void defectiveWarrantyCanBeReceivedWithoutReturningItToAvailableStock() {
        PurchaseOrder order = saveCompletedOrder(1, "20000.00");
        PostSaleResponse created = service.createCustomerRequest(
                "cliente",
                order.getOrderNumber(),
                new CreatePostSaleRequest(
                        PostSaleType.WARRANTY,
                        PostSaleResolution.REPAIR,
                        "No enciende",
                        "Falla durante uso normal.",
                        List.of(new CreatePostSaleLineRequest("SKU-TEST", 1))
                )
        );
        service.review(created.requestNumber(), "vendedor", new ReviewPostSaleRequest(true, "Garantia aceptada."));
        service.receive(
                created.requestNumber(),
                "bodega",
                new ReceivePostSaleRequest(
                        "WH-SCL-01",
                        List.of(new ReceivePostSaleLineRequest(
                                "SKU-TEST",
                                1,
                                0,
                                ProductCondition.DEFECTIVE
                        ))
                )
        );
        PostSaleResponse resolved = service.resolve(
                created.requestNumber(),
                "vendedor",
                new ResolvePostSaleRequest(PostSaleResolution.REPAIR, "Equipo enviado a servicio tecnico.")
        );

        assertThat(resolved.status()).isEqualTo(PostSaleStatus.RESOLVED);
        assertThat(resolved.resolutionReference()).startsWith("RPR-");
        verifyNoInteractions(inventoryClient);
    }

    private PurchaseOrder saveCompletedOrder(int quantity, String unitPrice) {
        PurchaseOrder order = new PurchaseOrder();
        order.setCustomerName("Cliente Prueba");
        order.setCustomerEmail("cliente@smartlogix.cl");
        order.setCustomerUsername("cliente");
        order.setMarketingOptIn(false);
        order.setFulfillmentMethod(FulfillmentMethod.PICKUP);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.COMPLETED);
        BigDecimal subtotal = new BigDecimal(unitPrice).multiply(BigDecimal.valueOf(quantity));
        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setShippingAmount(BigDecimal.ZERO);
        order.setTotalAmount(subtotal);

        OrderLine line = new OrderLine();
        line.setSku("SKU-TEST");
        line.setProductName("Producto de prueba");
        line.setQuantity(quantity);
        line.setUnitPrice(new BigDecimal(unitPrice));
        order.addLine(line);
        return orderRepository.save(order);
    }
}
