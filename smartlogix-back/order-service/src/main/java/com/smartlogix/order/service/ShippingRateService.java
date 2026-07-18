package com.smartlogix.order.service;

import com.smartlogix.order.domain.ShippingMethod;
import com.smartlogix.order.dto.ShippingOptionResponse;
import com.smartlogix.order.dto.ShippingQuoteResponse;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ShippingRateService {

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = BigDecimal.valueOf(150000);
    private static final Set<String> EXTENDED_METRO_COMMUNES = Set.of(
            "buin", "calera de tango", "colina", "curacavi", "el monte", "isla de maipo",
            "lampa", "maria pinto", "melipilla", "padre hurtado", "paine", "penaflor",
            "pirque", "san jose de maipo", "talagante", "tiltil"
    );
    private static final Set<String> ISOLATED_COMMUNES = Set.of(
            "cabo de hornos", "chaiten", "futaleufu", "isla de pascua", "juan fernandez",
            "palena", "puerto williams"
    );

    public ShippingQuoteResponse quote(String region, String commune, BigDecimal subtotal) {
        String cleanRegion = requireLocation(region, "La region es obligatoria para cotizar el envio.");
        String cleanCommune = requireLocation(commune, "La comuna es obligatoria para cotizar el envio.");
        BigDecimal cleanSubtotal = subtotal == null || subtotal.signum() < 0
                ? BigDecimal.ZERO
                : subtotal;
        Zone zone = resolveZone(cleanRegion);
        String normalizedCommune = normalize(cleanCommune);
        boolean extendedMetro = zone == Zone.METROPOLITANA
                && EXTENDED_METRO_COMMUNES.contains(normalizedCommune);
        boolean isolated = ISOLATED_COMMUNES.contains(normalizedCommune);
        BigDecimal standardSurcharge = isolated
                ? BigDecimal.valueOf(4000)
                : extendedMetro ? BigDecimal.valueOf(1500) : BigDecimal.ZERO;
        BigDecimal expressSurcharge = isolated
                ? BigDecimal.valueOf(6000)
                : extendedMetro ? BigDecimal.valueOf(2000) : BigDecimal.ZERO;
        int extraDays = isolated ? 3 : extendedMetro ? 1 : 0;
        boolean freeStandard = cleanSubtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0 && !isolated;
        BigDecimal standardAmount = freeStandard
                ? BigDecimal.ZERO
                : zone.standardAmount.add(standardSurcharge);
        BigDecimal expressAmount = zone.expressAmount.add(expressSurcharge);
        boolean expressAvailable = !isolated;
        BigDecimal remaining = FREE_SHIPPING_THRESHOLD.subtract(cleanSubtotal).max(BigDecimal.ZERO);

        return new ShippingQuoteResponse(
                cleanRegion,
                cleanCommune,
                zone.code,
                zone.label,
                cleanSubtotal,
                FREE_SHIPPING_THRESHOLD,
                remaining,
                List.of(
                        new ShippingOptionResponse(
                                ShippingMethod.STANDARD,
                                standardAmount,
                                zone.standardDaysMin + extraDays,
                                zone.standardDaysMax + extraDays,
                                true,
                                freeStandard ? "Envio gratis por monto de compra" : locationNote(extendedMetro, isolated)
                        ),
                        new ShippingOptionResponse(
                                ShippingMethod.EXPRESS,
                                expressAmount,
                                zone.expressDaysMin + extraDays,
                                zone.expressDaysMax + extraDays,
                                expressAvailable,
                                expressAvailable ? locationNote(extendedMetro, false) : "No disponible para esta comuna"
                        )
                )
        );
    }

    public BigDecimal amountFor(
            ShippingMethod method,
            String region,
            String commune,
            BigDecimal subtotal
    ) {
        ShippingMethod selectedMethod = method == null ? ShippingMethod.STANDARD : method;
        ShippingOptionResponse option = quote(region, commune, subtotal).options().stream()
                .filter(item -> item.method() == selectedMethod)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Metodo de envio no soportado."));
        if (!option.available()) {
            throw new IllegalArgumentException("El despacho express no esta disponible para esta comuna.");
        }
        return option.amount();
    }

    private Zone resolveZone(String region) {
        String normalized = normalize(region);
        if (normalized.contains("metropolitana")) {
            return Zone.METROPOLITANA;
        }
        if (normalized.contains("valparaiso") || normalized.contains("higgins")) {
            return Zone.CENTRO;
        }
        if (normalized.contains("coquimbo")
                || normalized.contains("maule")
                || normalized.contains("nuble")
                || normalized.contains("biobio")
                || normalized.contains("araucania")
                || normalized.contains("rios")
                || normalized.contains("lagos")) {
            return Zone.REGIONAL;
        }
        if (normalized.contains("arica")
                || normalized.contains("tarapaca")
                || normalized.contains("antofagasta")
                || normalized.contains("atacama")
                || normalized.contains("aysen")
                || normalized.contains("magallanes")) {
            return Zone.EXTREMA;
        }
        throw new IllegalArgumentException("La region seleccionada no tiene una tarifa configurada.");
    }

    private String requireLocation(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private String locationNote(boolean extendedMetro, boolean isolated) {
        if (isolated) {
            return "Tarifa especial para comuna aislada";
        }
        if (extendedMetro) {
            return "Incluye cobertura metropolitana extendida";
        }
        return "Tarifa calculada segun region y comuna";
    }

    private enum Zone {
        METROPOLITANA("RM", "Zona Metropolitana", 3990, 6990, 1, 3, 1, 2),
        CENTRO("CENTRO", "Zona Centro", 4990, 8990, 2, 4, 1, 2),
        REGIONAL("REGIONAL", "Zona Regional", 6490, 10990, 3, 6, 2, 4),
        EXTREMA("EXTREMA", "Zona Extrema", 9990, 16990, 5, 9, 3, 6);

        private final String code;
        private final String label;
        private final BigDecimal standardAmount;
        private final BigDecimal expressAmount;
        private final int standardDaysMin;
        private final int standardDaysMax;
        private final int expressDaysMin;
        private final int expressDaysMax;

        Zone(
                String code,
                String label,
                long standardAmount,
                long expressAmount,
                int standardDaysMin,
                int standardDaysMax,
                int expressDaysMin,
                int expressDaysMax
        ) {
            this.code = code;
            this.label = label;
            this.standardAmount = BigDecimal.valueOf(standardAmount);
            this.expressAmount = BigDecimal.valueOf(expressAmount);
            this.standardDaysMin = standardDaysMin;
            this.standardDaysMax = standardDaysMax;
            this.expressDaysMin = expressDaysMin;
            this.expressDaysMax = expressDaysMax;
        }
    }
}
