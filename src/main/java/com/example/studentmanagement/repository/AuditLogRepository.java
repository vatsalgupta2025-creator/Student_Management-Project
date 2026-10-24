package com.example.studentmanagement.repository;

import com.example.studentmanagement.model.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Spring Data MongoDB repository for audit log entries.
 * Extends MongoRepository so all standard CRUD methods are available automatically.
 */
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    /**
     * Returns audit logs sorted newest-first, limited by the given Pageable.
     * Spring Data generates the query automatically from the method name.
     */
    List<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
