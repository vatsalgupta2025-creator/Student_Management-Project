package com.example.studentmanagement.service;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * AuditService uses Spring JdbcTemplate (JDBC) to write and read
 * audit logs in the MySQL database (student_audit_db).
 */
@Service
public class AuditService {

    private final JdbcTemplate jdbcTemplate;

    public AuditService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Insert one audit log entry into MySQL via JDBC.
     */
    public void log(String action, String studentId, String details) {
        try {
            jdbcTemplate.update(
                "INSERT INTO audit_logs (action, student_id, details) VALUES (?, ?, ?)",
                action, studentId, details
            );
        } catch (DataAccessException e) {
            // MySQL may be offline – log to console but don't crash the app
            System.err.println("[AuditService] Could not write audit log to MySQL: " + e.getMessage());
        }
    }

    /**
     * Fetch the most recent audit log entries from MySQL via JDBC.
     * Returns an empty list if MySQL is unavailable.
     */
    public List<Map<String, Object>> getRecentLogs(int limit) {
        try {
            return jdbcTemplate.queryForList(
                "SELECT id, action, student_id, details, created_at FROM audit_logs ORDER BY id DESC LIMIT ?",
                limit
            );
        } catch (DataAccessException e) {
            System.err.println("[AuditService] Could not read audit logs from MySQL: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Check whether the JDBC/MySQL connection is alive.
     */
    public boolean isMysqlAlive() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (DataAccessException e) {
            return false;
        }
    }
}
