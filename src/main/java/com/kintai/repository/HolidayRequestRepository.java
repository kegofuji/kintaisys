package com.kintai.repository;

import com.kintai.entity.HolidayRequest;
import com.kintai.entity.HolidayRequest.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRequestRepository extends JpaRepository<HolidayRequest, Long> {
    List<HolidayRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<HolidayRequest> findByStatusOrderByCreatedAtDesc(Status status);
    List<HolidayRequest> findByEmployeeIdAndStatusIn(Long employeeId, List<Status> statuses);
    List<HolidayRequest> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    long countByStatus(Status status);
}

