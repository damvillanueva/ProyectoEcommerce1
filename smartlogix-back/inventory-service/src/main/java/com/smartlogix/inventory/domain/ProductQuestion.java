package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "product_questions")
public class ProductQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String sku;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(length = 1000)
    private String answer;

    @Column(name = "answered_by", length = 50)
    private String answeredBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "answered_at")
    private OffsetDateTime answeredAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public String getAnsweredBy() { return answeredBy; }
    public void setAnsweredBy(String answeredBy) { this.answeredBy = answeredBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getAnsweredAt() { return answeredAt; }
    public void setAnsweredAt(OffsetDateTime answeredAt) { this.answeredAt = answeredAt; }
}
