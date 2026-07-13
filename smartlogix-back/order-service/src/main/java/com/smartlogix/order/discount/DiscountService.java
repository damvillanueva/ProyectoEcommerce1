package com.smartlogix.order.discount;

import com.smartlogix.order.repository.DiscountRepository;
import org.springframework.stereotype.Service;

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
