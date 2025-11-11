package com.kintai.repository;

import com.kintai.entity.WorkPatternChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkPatternChangeRequestRepository extends JpaRepository<WorkPatternChangeRequest, Long> {

    List<WorkPatternChangeRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<WorkPatternChangeRequest> findByStatusOrderByCreatedAtDesc(WorkPatternChangeRequest.Status status);

    long countByStatus(WorkPatternChangeRequest.Status status);

    @Query("""
            SELECT r FROM WorkPatternChangeRequest r
            WHERE r.employeeId = :employeeId
              AND r.status = com.kintai.entity.WorkPatternChangeRequest$Status.APPROVED
              AND r.startDate <= :date
              AND r.endDate >= :date
            ORDER BY r.startDate DESC, r.requestId DESC
            """)
    List<WorkPatternChangeRequest> findApprovedRequestsForDate(@Param("employeeId") Long employeeId,
                                                               @Param("date") LocalDate date);

    @Query("""
            SELECT r FROM WorkPatternChangeRequest r
            WHERE r.employeeId = :employeeId
              AND r.status = com.kintai.entity.WorkPatternChangeRequest$Status.APPROVED
              AND r.startDate > :date
            ORDER BY r.startDate ASC, r.requestId ASC
            """)
    List<WorkPatternChangeRequest> findUpcomingApprovedRequests(@Param("employeeId") Long employeeId,
                                                                @Param("date") LocalDate date);

    @Query("""
            SELECT COUNT(r) > 0
            FROM WorkPatternChangeRequest r
            WHERE r.employeeId = :employeeId
              AND r.status IN ('PENDING', 'APPROVED')
              AND r.startDate <= :endDate
              AND r.endDate >= :startDate
            """)
    boolean existsActiveOverlap(@Param("employeeId") Long employeeId,
                                @Param("startDate") LocalDate startDate,
                                @Param("endDate") LocalDate endDate);
}
