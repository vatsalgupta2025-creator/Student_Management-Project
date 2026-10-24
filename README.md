# Student Management System

A full-stack student management application demonstrating all four core college project components:
1. **Frontend**: HTML5, CSS3, Vanilla JavaScript (responsive dashboard, modern design)
2. **Backend**: Java 17 + Spring Boot 3 REST APIs
3. **NoSQL Database**: MongoDB for primary student records
4. **Relational Database & JDBC**: MySQL + Spring `JdbcTemplate` for system audit logging

---

## Architecture & Technology Stack

| Component | Technology | Role |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS | Interactive student directory, live stats, instant search, filters, modal forms |
| **Backend REST API** | Java 17 + Spring Boot 3 | REST controllers, Bean Validation (`@NotBlank`, `@Email`, `@Min`), error handling |
| **NoSQL Database** | MongoDB | Stores student profile documents in collection `students` |
| **JDBC Connectivity** | MySQL + `JdbcTemplate` | Captures CRUD audit logs (`CREATE`, `UPDATE`, `DELETE`) in table `audit_logs` |

---

## Key Features

- **Student Directory**: Full CRUD (Create, Read, Update, Delete) with live UI synchronization.
- **Search & Quick Filters**: Search across name, email, course + quick filter pills.
- **Column Sorting**: Sort by name, course, or age ascending/descending.
- **Audit Logging via JDBC**: Automatically logs every student addition, update, or deletion into MySQL with timestamp.
- **Real-Time System Status**: Sidebar indicators showing live connectivity for **Backend API**, **MongoDB**, and **MySQL (JDBC)**.
- **Quick-Fill Demo**: One-click demo button to instantly populate sample student records.
- **JSON Export**: Export student table data directly to JSON.

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
│   │   │   │   └── Student.java                   # MongoDB document model
│   │   │   ├── repository/
│   │   │   │   └── StudentRepository.java         # Spring Data MongoRepository
│   │   │   └── service/
│   │   │       └── AuditService.java              # JDBC service logging via JdbcTemplate
│   │   └── resources/
│   │       ├── application.properties             # Spring & database configuration
│   │       ├── schema.sql                         # MySQL audit_logs table creation schema
│   │       └── static/                            # Frontend assets
│   │           ├── index.html                     # Application UI
│   │           ├── style.css                      # Design system & responsive layout
│   │           └── app.js                         # REST API calls and UI state
├── database/
│   ├── setup.sql                                  # MySQL database and table setup script
│   └── setup_mongodb.js                           # MongoDB collection initialization
├── server.js                                      # Quick local development server
├── pom.xml                                        # Maven dependencies (Web, MongoDB, JDBC, MySQL)
└── README.md
```

---

## How to Run

### Option 1: Java & Spring Boot (Full College Demo)

#### Prerequisites
1. **Java JDK 17** or newer installed.
2. **MongoDB** running locally on port `27017`.
3. **MySQL** running locally on port `3306`.

#### Step 1: Configure Databases
In `src/main/resources/application.properties`:
```properties
# MongoDB URI
spring.data.mongodb.uri=mongodb://localhost:27017/student_management

# MySQL JDBC Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/student_audit_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

Run `database/setup.sql` in MySQL to initialize `student_audit_db` if not using auto-create.

#### Step 2: Start Spring Boot
```bash
mvn spring-boot:run
```
Open **http://localhost:8080** in your browser.

---

### Option 2: Quick Start via Node.js Dev Server

To preview and interact with the full web interface immediately:
```bash
node server.js
```
Open **http://localhost:8080** in your browser.

---

## Database Verification

### MongoDB (`mongosh`):
```javascript
use student_management;
db.students.find().pretty();
```

### MySQL (Audit Logs via JDBC):
```sql
USE student_audit_db;
SELECT * FROM audit_logs ORDER BY created_at DESC;
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/students` | Get all students (from MongoDB) |
| `GET` | `/api/students/{id}` | Get student by ID |
| `POST` | `/api/students` | Create student (MongoDB) + log via JDBC (MySQL) |
| `PUT` | `/api/students/{id}` | Update student (MongoDB) + log via JDBC (MySQL) |
| `DELETE` | `/api/students/{id}` | Delete student (MongoDB) + log via JDBC (MySQL) |
| `GET` | `/api/audit-logs` | Retrieve recent audit logs (from MySQL via JDBC) |
| `GET` | `/api/status` | Connection health check (Backend, MongoDB, MySQL) |
