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

//start
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
