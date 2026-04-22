package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.owner.dto.OwnerRequest;
import com.propertymanagement.modules.owner.dto.OwnerResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OwnerService {

    private final OwnerRepository ownerRepository;

    public Page<OwnerResponse> getAll(Pageable pageable) {
        return ownerRepository.findByActiveTrue(pageable).map(this::toResponse);
    }

    public OwnerResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public OwnerResponse create(OwnerRequest request) {
        if (request.getNationalId() != null && ownerRepository.existsByNationalId(request.getNationalId())) {
            throw AppException.conflict("National ID already registered: " + request.getNationalId());
        }
        Owner owner = Owner.builder()
                .fullName(request.getFullName())
                .nationalId(request.getNationalId())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .notes(request.getNotes())
                .active(true)
                .build();
        return toResponse(ownerRepository.save(owner));
    }

    @Transactional
    public OwnerResponse update(Long id, OwnerRequest request) {
        Owner owner = findActive(id);
        owner.setFullName(request.getFullName());
        owner.setPhone(request.getPhone());
        owner.setEmail(request.getEmail());
        owner.setAddress(request.getAddress());
        owner.setNotes(request.getNotes());
        return toResponse(ownerRepository.save(owner));
    }

    @Transactional
    public void delete(Long id) {
        Owner owner = findActive(id);
        owner.setActive(false);
        ownerRepository.save(owner);
    }

    private Owner findActive(Long id) {
        return ownerRepository.findById(id)
                .filter(Owner::isActive)
                .orElseThrow(() -> AppException.notFound("Owner not found: " + id));
    }

    private OwnerResponse toResponse(Owner o) {
        return OwnerResponse.builder()
                .id(o.getId())
                .fullName(o.getFullName())
                .nationalId(o.getNationalId())
                .phone(o.getPhone())
                .email(o.getEmail())
                .address(o.getAddress())
                .notes(o.getNotes())
                .active(o.isActive())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}
