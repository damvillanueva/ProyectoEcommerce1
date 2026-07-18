package com.smartlogix.order.discount;

import com.smartlogix.order.repository.DiscountRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class DiscountService {

    private final DiscountRepository repository;

    public DiscountService(DiscountRepository repository) {
        this.repository = repository;
    }

    public DiscountResponse create(DiscountRequest request) {

        if (repository.existsByCodeIgnoreCase(request.getCode())) {
            throw new IllegalArgumentException("Ya existe un descuento con ese código.");
        }

        Discount campaign = new Discount();

        campaign.setCode(request.getCode().trim().toUpperCase());
        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setPercentage(request.getPercentage());
        campaign.setActive(request.getActive());
        campaign.setValidFrom(request.getValidFrom());
        campaign.setValidUntil(request.getValidUntil());
        campaign.setOnlyNewUsers(request.getOnlyNewUsers());

        repository.save(campaign);

        return toResponse(campaign);
    }

    public DiscountValidationResponse validate(DiscountValidationRequest request) {
        Discount campaign = findApplicable(request.code());
        BigDecimal discountAmount = request.subtotal()
                .multiply(BigDecimal.valueOf(campaign.getPercentage()))
                .divide(BigDecimal.valueOf(100));

        return new DiscountValidationResponse(
                campaign.getCode(),
                campaign.getPercentage(),
                request.subtotal(),
                discountAmount,
                request.subtotal().subtract(discountAmount)
        );
    }

    public List<DiscountResponse> findAll() {

        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DiscountResponse findById(Long id) {

        Discount campaign = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El descuento no existe."));

        return toResponse(campaign);
    }

    public DiscountResponse update(Long id, DiscountRequest request) {

        Discount campaign = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El descuento no existe."));

        campaign.setCode(request.getCode().trim().toUpperCase());
        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setPercentage(request.getPercentage());
        campaign.setActive(request.getActive());
        campaign.setValidFrom(request.getValidFrom());
        campaign.setValidUntil(request.getValidUntil());
        campaign.setOnlyNewUsers(request.getOnlyNewUsers());

        repository.save(campaign);

        return toResponse(campaign);
    }

    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("El descuento no existe.");
        }

        repository.deleteById(id);
    }

    private Discount findApplicable(String code) {
        Discount campaign = repository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new IllegalArgumentException("El codigo de descuento no existe."));
        LocalDate today = LocalDate.now();

        if (!Boolean.TRUE.equals(campaign.getActive())) {
            throw new IllegalArgumentException("El codigo de descuento no esta activo.");
        }
        if (campaign.getValidFrom() != null && today.isBefore(campaign.getValidFrom())) {
            throw new IllegalArgumentException("El codigo de descuento aun no esta vigente.");
        }
        if (campaign.getValidUntil() != null && today.isAfter(campaign.getValidUntil())) {
            throw new IllegalArgumentException("El codigo de descuento esta vencido.");
        }

        return campaign;
    }

    private DiscountResponse toResponse(Discount campaign) {

        DiscountResponse response = new DiscountResponse();

        response.setId(campaign.getId());
        response.setCode(campaign.getCode());
        response.setName(campaign.getName());
        response.setDescription(campaign.getDescription());
        response.setPercentage(campaign.getPercentage());
        response.setActive(campaign.getActive());
        response.setValidFrom(campaign.getValidFrom());
        response.setValidUntil(campaign.getValidUntil());
        response.setOnlyNewUsers(campaign.getOnlyNewUsers());

        return response;
    }

}
