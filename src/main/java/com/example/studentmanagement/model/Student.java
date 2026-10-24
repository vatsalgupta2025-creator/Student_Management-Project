package com.example.studentmanagement.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Document(collection = "students")
public class Student {
    @Id
    private String id;
    @NotBlank(message = "Name is required")
    private String name;
    @Email(message = "Enter a valid email")
    @NotBlank(message = "Email is required")
    private String email;
    @NotBlank(message = "Course is required")
    private String course;
    @Min(value = 1, message = "Age must be at least 1")
    private int age;

    public Student() {}
    public Student(String name, String email, String course, int age) {
        this.name = name; this.email = email; this.course = course; this.age = age;
    }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCourse() { return course; }
    public void setCourse(String course) { this.course = course; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
}
