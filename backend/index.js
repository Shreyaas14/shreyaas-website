require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const dbPath = path.join(__dirname, 'blog.db');
const db = new sqlite3.Database(dbPath);

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`[${new Date.toISOString()}] ${req.method} ${req.url}`);
  next();
});

//post req
app.post('/api/posts', basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD },
  challenge: true,
}), (req, res) => {
  const { title, content } = req.body;
  db.run(
    'INSERT INTO posts (title, content, created_at) VALUES (?, ?, ?)',
    [title, content, new Date()],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

//get req
app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ posts: rows });
  });
});

//static files
app.use(express.static(path.join(__dirname, 'build')));

//catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating posts table:', err.message);
    } else {
      console.log('Posts table ready');
    }
  });
});

//start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
