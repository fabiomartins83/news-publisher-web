const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const db = new sqlite3.Database("materias-db.sqlite");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FRONT ---
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/app.js", (req, res) => {
res.sendFile(path.join(__dirname, "app.js"));
});

// --- DB ---
db.run(`
CREATE TABLE IF NOT EXISTS materias (
id INTEGER PRIMARY KEY AUTOINCREMENT,
date DATETIME DEFAULT (datetime('now','localtime')),
name VARCHAR(100),
type VARCHAR(50) DEFAULT 'reportagem',
publishdate DATETIME,
title VARCHAR(255),
content TEXT,
linhafina TEXT,
abstract TEXT,
path TEXT,
url TEXT,
image TEXT,
chapeu TEXT,
category VARCHAR(50) DEFAULT 'geral',
editoria TEXT,
tema TEXT,
destaque BOOLEAN,
imgrights VARCHAR(100) DEFAULT 'Reprodução',
imgdescript TEXT,
author VARCHAR(100) DEFAULT 'Fábio de Almeida Martins',
location TEXT DEFAULT 'São Paulo',
cortexto VARCHAR(20) DEFAULT 'black',
corfundo VARCHAR(20) DEFAULT 'standard',
fontetexto VARCHAR(100),
entrelinhas VARCHAR(20) DEFAULT 'standard',
margin VARCHAR(20) DEFAULT 'standard',
padding VARCHAR(20) DEFAULT 'standard',
textalign VARCHAR(20),
paragrafo INTEGER DEFAULT 0,
comentarios TEXT,
usrviews INTEGER,
maislidas BOOLEAN,
importante BOOLEAN
)`);

// --- LISTAR ---
app.get("/api/materias", (req, res) => {
db.all("SELECT * FROM materias ORDER BY id DESC", (err, rows) => {
res.json(rows);
});
});

// --- CADASTRAR ---
app.post("/api/materias", (req, res) => {
const {
content,
title,
linhafina,
author,
url,
image,
imgrights,
chapeu,
editoria,
path
} = req.body;

const agora = new Date().toISOString();

db.run(`
INSERT INTO materias (
date,
publishdate,
content,
title,
linhafina,
author,
url,
image,
imgrights,
chapeu,
editoria,
path
)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`,
[
agora,
agora,
content,
title,
linhafina,
author,
url,
image,
imgrights || "Reprodução",
chapeu,
editoria,
path
],
() => res.json({ ok: true })
);
});

// --- EDITAR ---
app.put("/api/materias/:id", (req, res) => {
const { title, content, author, editoria, chapeu, publishdate } = req.body;

db.run(
`UPDATE materias
SET title=?,
content=?,
author=?,
editoria=?,
chapeu=?,
publishdate=?
WHERE id=?`,
[
title,
content,
author,
editoria,
chapeu,
publishdate,
req.params.id
],
() => res.json({ ok: true })
);
});

// --- EXCLUIR 1 ---
app.delete("/api/materias/:id", (req, res) => {
db.run("DELETE FROM materias WHERE id=?", [req.params.id], () => {
res.json({ ok: true });
});
});

// --- ❌ EXCLUIR TABELA INTEIRA (NOVA FUNÇÃO) ---
app.delete("/api/tabela", (req, res) => {
db.run("DELETE FROM materias", () => {
db.run("DELETE FROM sqlite_sequence WHERE name='materias'");
res.json({ ok: true });
});
});

// --- EXPORT JSON (melhorado) ---
app.get("/export/json", (req, res) => {
db.all("SELECT * FROM materias ORDER BY id DESC", (err, rows) => {
const data = { conteudo: rows };

fs.writeFileSync(
"conteudo.json",
JSON.stringify(data, null, 2),
"utf-8"
);

res.json({ ok: true });
});
});

// --- EXPORT CSV (NOVO) ---
app.get("/export/csv", (req, res) => {
db.all("SELECT * FROM materias ORDER BY id DESC", (err, rows) => {

const header = "id,title,author,editoria,chapeu,url,publishdate\n";

const body = rows.map(r =>
`${r.id},"${r.title || ""}","${r.author || ""}","${r.editoria || ""}","${r.chapeu || ""}","${r.url || ""}","${r.publishdate}"`
).join("\n");

fs.writeFileSync("materias.csv", header + body, "utf-8");

res.json({ ok: true });
});
});

// --- START ---
app.listen(3000, () => console.log("http://localhost:3000"));