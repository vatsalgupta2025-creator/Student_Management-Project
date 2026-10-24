package com.example.studentmanagement.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

/**
 * AuditLog is stored in MongoDB collection "audit_logs".
 * Each record represents one CRUD operation performed on a student.
 */
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;          // MongoDB ObjectId (auto-generated)

    private String action;      // CREATE | UPDATE | DELETE

    private String studentId;   // The MongoDB id of the affected student

    private String details;     // Human-readable description

    private LocalDateTime createdAt; // Timestamp of the action

    public AuditLog() {}

    public AuditLog(String action, String studentId, String details) {
        this.action    = action;
        this.studentId = studentId;
        this.details   = details;
        this.createdAt = LocalDateTime.now();
    }

    // ── Getters & Setters ───────────────────────────────────
    public String getId()               { return id; }
    public void setId(String id)        { this.id = id; }

    public String getAction()           { return action; }
    public void setAction(String a)     { this.action = a; }

    public String getStudentId()        { return studentId; }
    public void setStudentId(String s)  { this.studentId = s; }

    public String getDetails()          { return details; }
    public void setDetails(String d)    { this.details = d; }

    public LocalDateTime getCreatedAt()             { return createdAt; }
    public void setCreatedAt(LocalDateTime t)       { this.createdAt = t; }
}
