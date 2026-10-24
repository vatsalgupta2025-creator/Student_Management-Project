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
 * REST controller for Student CRUD operations and supporting endpoints.
 * All routes are under /api and allow cross-origin requests.
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

    // ----------------------------------------------------------------
    //  Student CRUD
    // ----------------------------------------------------------------

    /** GET /api/students — list all students */
    @GetMapping("/students")
    public List<Student> all() {
        return repository.findAll();
    }

    /** GET /api/students/{id} — get one student by MongoDB id */
    @GetMapping("/students/{id}")
    public Student one(@PathVariable String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    /** POST /api/students — create a new student */
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

    /** PUT /api/students/{id} — update an existing student */
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

    /** DELETE /api/students/{id} — delete a student */
    @DeleteMapping("/students/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        Student current = one(id);
        repository.delete(current);
        audit.log("DELETE", id, "Deleted student: " + current.getName());
    }

    // ----------------------------------------------------------------
    //  Audit Logs (MySQL via JDBC)
    // ----------------------------------------------------------------

    /** GET /api/audit-logs — return recent audit log entries from MySQL */
    @GetMapping("/audit-logs")
    public List<Map<String, Object>> auditLogs(
            @RequestParam(defaultValue = "50") int limit) {
        return audit.getRecentLogs(limit);
    }

    // ----------------------------------------------------------------
    //  Health / Status endpoints
    // ----------------------------------------------------------------

    /**
     * GET /api/status — returns connectivity status of Backend, MongoDB, and MySQL.
     * Frontend uses this to show the status indicator panel.
     */
    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> result = new HashMap<>();

        // Backend is always alive if this endpoint is reachable
        result.put("backend", "connected");

        // MongoDB: try a lightweight ping via MongoTemplate
        String mongoStatus;
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            mongoStatus = "connected";
        } catch (Exception e) {
            mongoStatus = "error";
        }
        result.put("mongodb", mongoStatus);

        // MySQL via JDBC
        result.put("mysql", audit.isMysqlAlive() ? "connected" : "error");

        return result;
    }
}
