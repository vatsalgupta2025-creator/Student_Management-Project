package com.example.studentmanagement.service;

import com.example.studentmanagement.model.AuditLog;
import com.example.studentmanagement.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * AuditService writes and reads audit log entries from MongoDB.
 *
 * MongoDB collection: audit_logs
 * No MySQL or JDBC involved — MongoDB handles everything.
 *
 * Each operation on a student (CREATE / UPDATE / DELETE) is logged
 * as a separate AuditLog document with a timestamp.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Save a new audit log entry to MongoDB.
     *
     * @param action    e.g. "CREATE", "UPDATE", "DELETE"
     * @param studentId the MongoDB _id of the affected student
     * @param details   human-readable description of the operation
     */
    public void log(String action, String studentId, String details) {
        try {
            auditLogRepository.save(new AuditLog(action, studentId, details));
            System.out.println("[AuditService] " + action + " | " + studentId + " | " + details);
        } catch (Exception e) {
            System.err.println("[AuditService] Failed to write audit log: " + e.getMessage());
        }
    }

    /**
     * Retrieve the most recent audit log entries from MongoDB.
     *
     * @param limit maximum number of entries to return (newest first)
     */
    public List<AuditLog> getRecentLogs(int limit) {
        try {
            return auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, limit)
            );
        } catch (Exception e) {
            System.err.println("[AuditService] Failed to read audit logs: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Check if MongoDB is reachable by running a lightweight count query.
     */
    public boolean isMongoAlive() {
        try {
            auditLogRepository.count();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
