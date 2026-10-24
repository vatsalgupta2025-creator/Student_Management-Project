# Student Management System

A full-stack student management application built with modern HTML/CSS/JavaScript (vanilla), Java Spring Boot 3 REST APIs, and **MongoDB** for all persistence (both student records and system activity audit logs).

---

## Architecture & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive dashboard, live statistics, quick filters, search, modal forms, status indicators |
| **Backend API** | Java 17 + Spring Boot 3 | RESTful controllers, DTO validation (`@Valid`, `@NotBlank`, `@Email`, `@Min`), global exception handling |
| **Primary Database** | MongoDB | Stores student profile documents in the `students` collection |
| **Audit Logs** | MongoDB | Stores create, update, and delete audit events in the `audit_logs` collection |

---

## Key Features

- **Student Directory**: Add, view, edit, and delete student records with instant UI updates.
- **Search & Filter**: Real-time multi-field search (by name, email, or course) + course filter pills.
- **Sorting**: Sort table columns by name, course, or age ascending/descending.
- **Activity & Audit Logging**: Automatic background recording of every student addition, modification, and deletion into MongoDB.
- **Live Connection Indicators**: Real-time status display in the sidebar for backend API and MongoDB.
- **Quick-Fill Demo**: One-click demo button to instantly pre-fill sample student data.
- **Data Export**: Export student table directly to JSON format.

---

## Project Structure

```
StudentManagementProject/
├── src/
│   ├── main/
│   │   ├── java/com/example/studentmanagement/
│   │   │   ├── StudentManagementApplication.java  # Main Spring Boot entry point
│   │   │   ├── controller/
│   │   │   │   └── StudentController.java         # REST endpoints for students, logs, status
│   │   │   ├── model/
│   │   │   │   ├── Student.java                   # MongoDB document for student records
│   │   │   │   └── AuditLog.java                  # MongoDB document for audit trails
│   │   │   ├── repository/
│   │   │   │   ├── StudentRepository.java         # Spring Data MongoRepository for students
│   │   │   │   └── AuditLogRepository.java        # Spring Data MongoRepository for logs
│   │   │   └── service/
│   │   │       └── AuditService.java              # Service layer logging student actions
│   │   └── resources/
│   │       ├── application.properties             # Spring configuration (port, Mongo URI)
│   │       └── static/                            # Frontend assets
│   │           ├── index.html                     # Application UI
│   │           ├── style.css                      # Design system & styles
│   │           └── app.js                         # Dynamic interactions & REST API calls
├── database/
│   └── setup_mongodb.js                           # MongoDB collection and index initialization
├── server.js                                      # Quick local development server
├── pom.xml                                        # Maven dependencies
└── README.md
```

---

## How to Run

### Option 1: Using Java & Spring Boot (Production / College Demo)

#### Prerequisites
1. **Java JDK 17** or newer installed.
2. **MongoDB** running locally on port `27017` (or provide a remote URI in `application.properties`).

#### Configuration (`src/main/resources/application.properties`)
```properties
server.port=8080
spring.data.mongodb.uri=mongodb://localhost:27017/student_management
```

#### Run Spring Boot
```bash
mvn spring-boot:run
```
*(Or open the project in IntelliJ IDEA / Eclipse and run `StudentManagementApplication.java`)*

---

### Option 2: Quick Start via Node.js Dev Server

If running in an environment without Java 17 or Maven installed:
```bash
node server.js
```
Open **http://localhost:8080** in your browser.

---

## Verifying Data in MongoDB Shell (`mongosh`)

Connect to MongoDB:
```bash
mongosh
```

Inspect records:
```javascript
use student_management;

// View all students
db.students.find().pretty();

// View audit logs recorded by the system
db.audit_logs.find().sort({ createdAt: -1 }).pretty();
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/students` | Get all students |
| `GET` | `/api/students/{id}` | Get student by MongoDB `_id` |
| `POST` | `/api/students` | Create a new student (logs to `audit_logs`) |
| `PUT` | `/api/students/{id}` | Update student by ID (logs to `audit_logs`) |
| `DELETE` | `/api/students/{id}` | Delete student by ID (logs to `audit_logs`) |
| `GET` | `/api/audit-logs?limit=50` | Retrieve recent activity audit logs |
| `GET` | `/api/status` | Real-time health check of Backend and MongoDB |

### Example Student JSON Payload
```json
{
  "name": "Aditi Sharma",
  "email": "aditi.sharma@example.com",
  "course": "Computer Science",
  "age": 20
}
```
