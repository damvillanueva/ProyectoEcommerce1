package com.smartlogix.order.service;

import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentSimulationScenario;
import com.smartlogix.order.domain.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class PaymentSimulationService {

    public PaymentResult process(
            PaymentMethod paymentMethod,
            PaymentSimulationScenario requestedScenario,
            BigDecimal amount
    ) {
        if (paymentMethod == PaymentMethod.PAY_ON_PICKUP) {
            return new PaymentResult(PaymentStatus.PENDING, null, null, null, null);
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El monto de pago no es valido.");
        }

        PaymentSimulationScenario scenario = requestedScenario == null
                ? PaymentSimulationScenario.APPROVED
                : requestedScenario;
        String transactionReference = transactionPrefix(paymentMethod)
                + "-" + randomToken(12);
        OffsetDateTime processedAt = OffsetDateTime.now();

        if (scenario == PaymentSimulationScenario.REJECTED) {
            return new PaymentResult(
                    PaymentStatus.REJECTED,
                    transactionReference,
                    null,
                    processedAt,
                    "La entidad de pago simulada rechazo la transaccion."
            );
        }

        return new PaymentResult(
                PaymentStatus.PAID,
                transactionReference,
                randomToken(6),
                processedAt,
                null
        );
    }

    public RefundResult refund(PaymentStatus paymentStatus, BigDecimal amount) {
        if (paymentStatus == PaymentStatus.PAID) {
            return new RefundResult(
                    PaymentStatus.REFUNDED,
                    "RFD-" + randomToken(12),
                    OffsetDateTime.now(),
                    amount
            );
        }
        if (paymentStatus == PaymentStatus.PENDING) {
            return new RefundResult(
                    PaymentStatus.CANCELLED,
                    null,
                    OffsetDateTime.now(),
                    BigDecimal.ZERO
            );
        }
        throw new IllegalArgumentException("El estado de pago actual no permite reembolso.");
    }

    private String transactionPrefix(PaymentMethod paymentMethod) {
        return paymentMethod == PaymentMethod.BANK_TRANSFER_SIMULATED ? "TRF" : "WBP";
    }

    private String randomToken(int length) {
        return UUID.randomUUID().toString().replace("-", "")
                .substring(0, length)
                .toUpperCase();
    }
}
