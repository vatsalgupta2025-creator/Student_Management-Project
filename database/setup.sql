-- Run this script in MySQL to manually prepare the audit database and table.
CREATE DATABASE IF NOT EXISTS student_audit_db;
USE student_audit_db;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(30) NOT NULL,
  student_id VARCHAR(100),
  details VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
