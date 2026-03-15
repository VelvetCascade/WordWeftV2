package com.wordweft.support.service;

import com.wordweft.support.dto.GrievanceRequest;
import com.wordweft.support.model.Grievance;
import com.wordweft.support.repository.GrievanceRepository;
import org.springframework.stereotype.Service;

@Service
public class SupportService {

    private final GrievanceRepository grievanceRepository;

    public SupportService(GrievanceRepository grievanceRepository) {
        this.grievanceRepository = grievanceRepository;
    }

    public Grievance createGrievance(GrievanceRequest request) {
        Grievance grievance = new Grievance(
            request.getName(),
            request.getEmail(),
            request.getCategory(),
            request.getSubject(),
            request.getMessage()
        );
        return grievanceRepository.save(grievance);
    }
}
