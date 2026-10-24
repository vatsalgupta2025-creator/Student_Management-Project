# Student Management System

A small full-stack college project using HTML/CSS/JavaScript, Java Spring Boot, MongoDB, and MySQL through JDBC.

## What this project does
- Add, list, edit, and delete students (CRUD).
- Stores student documents in MongoDB (`student_management`, `students` collection).
- Writes create/update/delete audit records to MySQL (`student_audit_db`, `audit_logs` table) through Spring JDBC.
- Serves the frontend and REST API from the same Spring Boot application.

## Requirements
1. Java JDK 17 or newer.
2. MongoDB Community Server running locally on port `27017`.
3. MySQL Server running locally on port `3306`.
4. Maven installed, or open this folder in an IDE such as IntelliJ IDEA and let it import `pom.xml`.

## Step 1 — Configure MySQL
Open `src/main/resources/application.properties`. Set the MySQL username and password. The default username is `root`; change `DB_PASSWORD` below to your own MySQL password when running the app.

Windows Command Prompt:

```bat
set DB_USERNAME=root
set DB_PASSWORD=YOUR_MYSQL_PASSWORD
```

If using PowerShell:

```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
```

The app creates the database (through `createDatabaseIfNotExist=true`) and the `audit_logs` table at startup. If your MySQL user cannot create databases, run `database/setup.sql` as a MySQL administrator first.

## Step 2 — Start MongoDB
Start MongoDB Community Server as a Windows service, or start `mongod` using your installation's configuration. Confirm it listens on `localhost:27017`.

## Step 3 — Run the application
From this folder:

```bash
mvn spring-boot:run
```

If Maven is not installed, open the project in IntelliJ IDEA, wait for Maven dependencies to download, then run `StudentManagementApplication.java`.

## Step 4 — Open the app
Visit http://localhost:8080 in your browser. Add a student using the form. The student is stored in MongoDB and the action is recorded in MySQL.

## Verify the data
MongoDB Shell (`mongosh`):

```javascript
use student_management
db.students.find().pretty()
```

MySQL:

```sql
USE student_audit_db;
SELECT * FROM audit_logs ORDER BY created_at DESC;
```

## API endpoints
- `GET /api/students` — list students
- `GET /api/students/{id}` — get one student
- `POST /api/students` — create student
- `PUT /api/students/{id}` — update student
- `DELETE /api/students/{id}` — delete student

Example JSON:

```json
{
  "name": "Aditi Sharma",
  "email": "aditi@example.com",
  "course": "Computer Science",
  "age": 20
}
```

## Notes
- This is a learning/demo project, not production-ready authentication or deployment software.
- Do not put your real database password into GitHub. Environment variables are recommended.
- The assignment PDFs cover MongoDB installation/CRUD and replication/backup/restore. This starter app covers the frontend/backend/JDBC portion too. Replica-set practice can be performed separately using the provided assignment instructions; this application uses a local MongoDB server by default.
