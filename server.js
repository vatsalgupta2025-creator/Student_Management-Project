import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const STATIC_DIR = path.join(__dirname, 'src', 'main', 'resources', 'static');
const DB_DIR = path.join(__dirname, 'database');
const STUDENTS_FILE = path.join(DB_DIR, 'students.json');
const AUDIT_FILE = path.join(DB_DIR, 'audit_logs.json');

// Ensure database folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial seed data if file doesn't exist
const initialStudents = [
  {
    id: '664b3a1f8e21901a8b1c0001',
    name: 'Aditi Sharma',
    email: 'aditi.sharma@example.com',
    course: 'Computer Science',
    age: 20
  },
  {
    id: '664b3a1f8e21901a8b1c0002',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    course: 'Information Technology',
    age: 21
  },
  {
    id: '664b3a1f8e21901a8b1c0003',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    course: 'Data Science',
    age: 19
  }
];

function loadStudents() {
  try {
    if (!fs.existsSync(STUDENTS_FILE)) {
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(initialStudents, null, 2), 'utf8');
      return [...initialStudents];
    }
    const data = fs.readFileSync(STUDENTS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading students file:', err);
    return [];
  }
}

function saveStudents(students) {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving students file:', err);
  }
}

function logAudit(action, studentId, details) {
  try {
    let logs = [];
    if (fs.existsSync(AUDIT_FILE)) {
      logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8') || '[]');
    }
    const entry = {
      id: logs.length + 1,
      action,
      student_id: studentId,
      details,
      created_at: new Date().toISOString()
    };
    logs.push(entry);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`[AUDIT] ${action} | Student: ${studentId} | ${details}`);
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

function sendNoContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Global CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // API Endpoints
  if (pathname.startsWith('/api/students')) {
    const parts = pathname.split('/').filter(Boolean); // ['api', 'students', id?]
    const id = parts[2];

    // GET /api/students
    if (req.method === 'GET' && !id) {
      const students = loadStudents();
      return sendJson(res, 200, students);
    }

    // GET /api/students/:id
    if (req.method === 'GET' && id) {
      const students = loadStudents();
      const student = students.find(s => s.id === id);
      if (!student) {
        return sendJson(res, 404, { message: 'Student not found' });
      }
      return sendJson(res, 200, student);
    }

    // POST /api/students
    if (req.method === 'POST' && !id) {
      try {
        const body = await readBody(req);
        if (!body.name || !body.email || !body.course || !body.age) {
          return sendJson(res, 400, { message: 'All fields (name, email, course, age) are required' });
        }

        const students = loadStudents();
        const emailExists = students.some(s => s.email.toLowerCase() === body.email.toLowerCase());
        if (emailExists) {
          return sendJson(res, 409, { message: 'Email already exists' });
        }

        const newStudent = {
          id: crypto.randomBytes(12).toString('hex'),
          name: String(body.name).trim(),
          email: String(body.email).trim(),
          course: String(body.course).trim(),
          age: Number(body.age)
        };

        students.push(newStudent);
        saveStudents(students);
        logAudit('CREATE', newStudent.id, `Created student: ${newStudent.name}`);
        return sendJson(res, 201, newStudent);
      } catch (err) {
        return sendJson(res, 400, { message: 'Invalid JSON request payload' });
      }
    }

    // PUT /api/students/:id
    if (req.method === 'PUT' && id) {
      try {
        const body = await readBody(req);
        const students = loadStudents();
        const index = students.findIndex(s => s.id === id);
        if (index === -1) {
          return sendJson(res, 404, { message: 'Student not found' });
        }

        if (body.email) {
          const emailConflict = students.some(s => s.id !== id && s.email.toLowerCase() === body.email.toLowerCase());
          if (emailConflict) {
            return sendJson(res, 409, { message: 'Email already exists' });
          }
        }

        const current = students[index];
        const updated = {
          ...current,
          name: body.name !== undefined ? String(body.name).trim() : current.name,
          email: body.email !== undefined ? String(body.email).trim() : current.email,
          course: body.course !== undefined ? String(body.course).trim() : current.course,
          age: body.age !== undefined ? Number(body.age) : current.age
        };

        students[index] = updated;
        saveStudents(students);
        logAudit('UPDATE', updated.id, `Updated student: ${updated.name}`);
        return sendJson(res, 200, updated);
      } catch (err) {
        return sendJson(res, 400, { message: 'Invalid JSON request payload' });
      }
    }

    // DELETE /api/students/:id
    if (req.method === 'DELETE' && id) {
      const students = loadStudents();
      const index = students.findIndex(s => s.id === id);
      if (index === -1) {
        return sendJson(res, 404, { message: 'Student not found' });
      }

      const deleted = students.splice(index, 1)[0];
      saveStudents(students);
      logAudit('DELETE', id, `Deleted student: ${deleted.name}`);
      return sendNoContent(res);
    }

    return sendJson(res, 405, { message: 'Method Not Allowed' });
  }

  // ── GET /api/audit-logs  ─────────────────────────────────────────────
  // Returns recent audit log entries from the JSON flat-file database.
  // When Spring Boot + MySQL is running, those logs come from MySQL instead.
  if (pathname === '/api/audit-logs' && req.method === 'GET') {
    try {
      let logs = [];
      if (fs.existsSync(AUDIT_FILE)) {
        logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8') || '[]');
      }
      // Most-recent first, honour optional ?limit= query param
      const limitParam = parsedUrl.searchParams.get('limit');
      const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 50;
      logs = logs.slice(-limit).reverse();
      return sendJson(res, 200, logs);
    } catch (err) {
      return sendJson(res, 500, { message: 'Could not read audit logs: ' + err.message });
    }
  }

  // ── GET /api/status  ─────────────────────────────────────────────────
  // Returns connection status of Backend, MongoDB, and MySQL.
  // Running under Node.js: backend = connected, MongoDB/MySQL = N/A (not used here).
  if (pathname === '/api/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      backend: 'connected',
      mongodb: 'na',     // MongoDB is used by Spring Boot, not this Node.js server
      storage: 'json'    // This Node.js server stores data in flat JSON files
    });
  }

  // Static File Serving
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.join(STATIC_DIR, relativePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallbackPath = path.join(STATIC_DIR, 'index.html');
      if (fs.existsSync(fallbackPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(fallbackPath).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Student Management Server running on port ${PORT}`);
  console.log(` Frontend URL:  http://localhost:${PORT}/`);
  console.log(` REST API URL:  http://localhost:${PORT}/api/students`);
  console.log(` Static folder: ${STATIC_DIR}`);
  console.log(` Database:      ${STUDENTS_FILE}`);
  console.log(` Audit Log:     ${AUDIT_FILE}`);
  console.log(`====================================================`);
});
