const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Initialize the app
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(__dirname)); // This will serve files directly from the root folder

// SQLite Database Connection
const db = new sqlite3.Database('./attendance.db', (err) => {
  if (err) {
    console.error("Error opening database", err);
  }
});

// Initialize SQLite database and create tables if they don't exist
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)");
  db.run("CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, status TEXT NOT NULL, date TEXT NOT NULL, FOREIGN KEY(student_id) REFERENCES users(id))");
});

// Home route (only accessible when logged in)
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'base.html')); // Serve base.html as the homepage
});

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html')); // Serve login.html
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check if the username and password match a user in the database
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (user) {
      req.session.user = user;
      res.redirect('/');
    } else {
      res.send("Invalid credentials");
    }
  });
});

// Mark Attendance route (API)
app.post('/api/mark_attendance', (req, res) => {
  const { student_id, status } = req.body;
  const date = new Date().toISOString().slice(0, 10); // Get current date in YYYY-MM-DD format

  // Insert attendance record into database
  db.run("INSERT INTO attendance (student_id, status, date) VALUES (?, ?, ?)", [student_id, status, date], (err) => {
    if (err) {
      return res.status(500).json({ message: "Error marking attendance" });
    }
    res.status(200).json({ message: "Attendance marked successfully" });
  });
});

// Report route (Fetch attendance records)
app.get('/api/attendance_report', (req, res) => {
  // Fetch all attendance records from database
  db.all("SELECT * FROM attendance JOIN users ON attendance.student_id = users.id", (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching attendance report" });
    }
    res.status(200).json(rows); // Return all attendance records
  });
});

// Other Routes for Additional Pages
app.get('/attendance', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'attendance.html')); // Serve attendance.html
});

app.get('/report', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'report.html')); // Serve report.html
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.redirect('/login');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
