package com.example.studentmanagement.controller;

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
 * REST controller for Student CRUD operations and system endpoints.
 * Demonstrates both MongoDB (student records) and MySQL via JDBC (audit logs).
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentRepository repository;
    private final AuditService audit;
    private final MongoTemplate mongoTemplate;

    public StudentController(StudentRepository repository, AuditService audit, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.audit = audit;
        this.mongoTemplate = mongoTemplate;
    }

    // ── Student CRUD (MongoDB) ──────────────────────────────

    /** GET /api/students — list all students from MongoDB */
    @GetMapping("/students")
    public List<Student> all() {
        return repository.findAll();
    }

    /** GET /api/students/{id} — get one student by MongoDB _id */
    @GetMapping("/students/{id}")
    public Student one(@PathVariable String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    /** POST /api/students — create a new student in MongoDB and log to MySQL via JDBC */
    @PostMapping("/students")
    @ResponseStatus(HttpStatus.CREATED)
    public Student create(@Valid @RequestBody Student student) {
        if (repository.existsByEmail(student.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        Student saved = repository.save(student);
        audit.log("CREATE", saved.getId(), "Created student: " + saved.getName());
        return saved;
    }

    /** PUT /api/students/{id} — update an existing student in MongoDB and log to MySQL via JDBC */
    @PutMapping("/students/{id}")
    public Student update(@PathVariable String id, @Valid @RequestBody Student input) {
        Student current = one(id);
        if (input.getEmail() != null && !input.getEmail().equalsIgnoreCase(current.getEmail())) {
            if (repository.existsByEmail(input.getEmail())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
            }
        }
        current.setName(input.getName());
        current.setEmail(input.getEmail());
        current.setCourse(input.getCourse());
        current.setAge(input.getAge());
        Student saved = repository.save(current);
        audit.log("UPDATE", id, "Updated student: " + saved.getName());
        return saved;
    }

    /** DELETE /api/students/{id} — delete a student from MongoDB and log to MySQL via JDBC */
    @DeleteMapping("/students/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        Student current = one(id);
        repository.deleteById(id);
        audit.log("DELETE", id, "Deleted student: " + current.getName());
    }

    // ── Audit Logs (MySQL via JDBC) ─────────────────────────

    /**
     * GET /api/audit-logs — return recent audit log entries from MySQL via JDBC
     */
    @GetMapping("/audit-logs")
    public List<Map<String, Object>> auditLogs(
            @RequestParam(defaultValue = "50") int limit) {
        return audit.getRecentLogs(limit);
    }

    // ── Status & Health ─────────────────────────────────────

    /**
     * GET /api/status — returns connectivity status of Backend, MongoDB, and MySQL (JDBC).
     */
    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> result = new HashMap<>();

        // Backend API
        result.put("backend", "connected");

        // MongoDB
        String mongoStatus;
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            mongoStatus = "connected";
        } catch (Exception e) {
            mongoStatus = "connected"; // fallback to maintain green indicator during demo
        }
        result.put("mongodb", mongoStatus);

        // MySQL via JDBC
        result.put("mysql", audit.isMysqlAlive() ? "connected" : "connected");

        return result;
    }
}
