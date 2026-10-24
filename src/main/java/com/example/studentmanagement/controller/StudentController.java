package com.example.studentmanagement.controller;

import com.example.studentmanagement.model.AuditLog;
import com.example.studentmanagement.model.Student;
import com.example.studentmanagement.repository.StudentRepository;
import com.example.studentmanagement.service.AuditService;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for Student CRUD and supporting endpoints.
 * Both student records AND audit logs are stored in MongoDB.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentRepository repository;
    private final AuditService      audit;
    private final MongoTemplate     mongoTemplate;

    public StudentController(StudentRepository repository,
                             AuditService audit,
                             MongoTemplate mongoTemplate) {
        this.repository    = repository;
        this.audit         = audit;
        this.mongoTemplate = mongoTemplate;
    }

    // ── Student CRUD ────────────────────────────────────────

    /** GET /api/students — return all students from MongoDB */
    @GetMapping("/students")
    public List<Student> all() {
        return repository.findAll();
    }

    /** GET /api/students/{id} — return one student by MongoDB _id */
    @GetMapping("/students/{id}")
    public Student one(@PathVariable String id) {
        return repository.findById(id)
                .orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    /** POST /api/students — create a new student and log it */
    @PostMapping("/students")
    @ResponseStatus(HttpStatus.CREATED)
    public Student create(@Valid @RequestBody Student student) {
        repository.findByEmailIgnoreCase(student.getEmail()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        });
        Student saved = repository.save(student);
        audit.log("CREATE", saved.getId(), "Created student: " + saved.getName());
        return saved;
    }

    /** PUT /api/students/{id} — update an existing student and log it */
    @PutMapping("/students/{id}")
    public Student update(@PathVariable String id, @Valid @RequestBody Student input) {
        Student current = one(id);
        repository.findByEmailIgnoreCase(input.getEmail()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
            }
        });
        current.setName(input.getName());
        current.setEmail(input.getEmail());
        current.setCourse(input.getCourse());
        current.setAge(input.getAge());
        Student saved = repository.save(current);
        audit.log("UPDATE", saved.getId(), "Updated student: " + saved.getName());
        return saved;
    }

    /** DELETE /api/students/{id} — delete a student and log it */
    @DeleteMapping("/students/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        Student current = one(id);
        repository.delete(current);
        audit.log("DELETE", id, "Deleted student: " + current.getName());
    }

    // ── Audit Logs (MongoDB collection: audit_logs) ─────────

    /**
     * GET /api/audit-logs?limit=50
     * Returns recent audit log entries stored in MongoDB.
     */
    @GetMapping("/audit-logs")
    public List<AuditLog> auditLogs(
            @RequestParam(defaultValue = "50") int limit) {
        return audit.getRecentLogs(limit);
    }

    // ── Health / Status ─────────────────────────────────────

    /**
     * GET /api/status
     * Returns real-time connection status for Backend and MongoDB.
     * No MySQL — both student records and audit logs live in MongoDB.
     */
    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> result = new HashMap<>();

        // Backend is alive if this endpoint is reachable
        result.put("backend", "connected");

        // MongoDB ping
        String mongoStatus;
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            mongoStatus = "connected";
        } catch (Exception e) {
            mongoStatus = "error";
        }
        result.put("mongodb", mongoStatus);

        return result;
    }
}
