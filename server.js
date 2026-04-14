const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const db = new sqlite3.Database("materias-db.sqlite");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DB ---
db.run(`
CREATE TABLE IF NOT EXISTS materias (
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT,
content TEXT,
author TEXT,
editoria TEXT,
chapeu TEXT,
url TEXT,
publishdate TEXT DEFAULT (datetime('now'))
)`);

// --- API ---
app.get("/api/materias", (req, res) => {
db.all("SELECT * FROM materias ORDER BY id DESC", (err, rows) => {
res.json(rows);
});
});

app.post("/api/materias", (req, res) => {
const { title, content, author, editoria, chapeu, url } = req.body;

db.run(
"INSERT INTO materias (title, content, author, editoria, chapeu, url) VALUES (?,?,?,?,?,?)",
[title, content, author, editoria, chapeu, url],
() => res.json({ ok: true })
);
});

app.put("/api/materias/:id", (req, res) => {
const { title, content, author, editoria, chapeu } = req.body;

db.run(
"UPDATE materias SET title=?, content=?, author=?, editoria=?, chapeu=? WHERE id=?",
[title, content, author, editoria, chapeu, req.params.id],
() => res.json({ ok: true })
);
});

app.delete("/api/materias/:id", (req, res) => {
db.run("DELETE FROM materias WHERE id=?", [req.params.id], () => {
res.json({ ok: true });
});
});

// --- EXPORT JSON ---
app.get("/export", (req, res) => {
db.all("SELECT * FROM materias", (err, rows) => {
fs.writeFileSync(
"conteudo.json",
JSON.stringify({ conteudo: rows }, null, 2)
);
res.json({ ok: true });
});
});

// --- FRONTEND (HTML separado) ---
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});

// --- START ---
app.listen(3000, () => {
console.log("Servidor rodando em http://localhost:3000");
});