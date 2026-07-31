package com.smartlogix.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "post_sale_lines")
public class PostSaleLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private PostSaleRequest request;

    @Column(nullable = false, length = 60)
    private String sku;

    @Column(nullable = false, length = 160)
    private String productName;

    @Column(nullable = false)
    private int requestedQuantity;

    @Column(nullable = false)
    private int receivedQuantity;

    @Column(nullable = false)
    private int restockedQuantity;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal unitPrice;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProductCondition productCondition;

    public Long getId() { return id; }
    public PostSaleRequest getRequest() { return request; }
    public void setRequest(PostSaleRequest request) { this.request = request; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public int getRequestedQuantity() { return requestedQuantity; }
    public void setRequestedQuantity(int requestedQuantity) { this.requestedQuantity = requestedQuantity; }
    public int getReceivedQuantity() { return receivedQuantity; }
    public void setReceivedQuantity(int receivedQuantity) { this.receivedQuantity = receivedQuantity; }
    public int getRestockedQuantity() { return restockedQuantity; }
    public void setRestockedQuantity(int restockedQuantity) { this.restockedQuantity = restockedQuantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public ProductCondition getProductCondition() { return productCondition; }
    public void setProductCondition(ProductCondition productCondition) { this.productCondition = productCondition; }
}
