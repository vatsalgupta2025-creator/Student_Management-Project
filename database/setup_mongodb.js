// MongoDB Initialization Script for Student Management System
// Both student records and activity audit logs are stored in MongoDB.

// Switch to database
db = db.getSiblingDB('student_management');

// 1. Create collections
db.createCollection('students');
db.createCollection('audit_logs');

// 2. Indexes
// Enforce unique emails for students
db.students.createIndex({ "email": 1 }, { unique: true });

// Index timestamp for fast chronological audit retrieval
db.audit_logs.createIndex({ "createdAt": -1 });

print("MongoDB student_management database and collections configured successfully!");
