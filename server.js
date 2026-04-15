const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const db = new sqlite3.Database("materias.sqlite");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- FRONT ----------------
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/app.js", (req, res) => {
res.sendFile(path.join(__dirname, "app.js"));
});

// ---------------- DB INIT ----------------
db.serialize(() => {

db.run("PRAGMA foreign_keys = ON");

/* =========================
   TABELA MATERIAS
========================= */
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

/* =========================
   TABELA EDITORIAS + SEED
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS editorias (
id INTEGER PRIMARY KEY AUTOINCREMENT,
NomeEditoria TEXT
)`, () => {

db.get(`SELECT COUNT(*) AS total FROM editorias`, (err, row) => {
if (!row || row.total === 0) {

const stmt = db.prepare(`
INSERT INTO editorias (NomeEditoria)
VALUES (?)
`);

[
"Política",
"Economia",
"Cotidiano",
"Esportes",
"Cultura",
"Ciência"
].forEach(e => stmt.run(e));

stmt.finalize();
}
});
});

/* =========================
   TABELA AUTORES + SEED
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS autores (
id INTEGER PRIMARY KEY AUTOINCREMENT,
NomeAutor TEXT,
Email TEXT,
Biografia TEXT,
Editoria INTEGER
)`, () => {

db.get(`SELECT COUNT(*) AS total FROM autores`, (err, row) => {
if (!row || row.total === 0) {

db.run(`
INSERT INTO autores (NomeAutor, Email, Biografia, Editoria)
VALUES (?, ?, ?, ?)
`, [
"Fabio Martins",
"fabio.martins@usp.br",
"",
null
]);
}
});
});

/* =========================
   RELAÇÃO MATERIA ? AUTORES
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS materia_autores (
materia_id INTEGER,
autor_id INTEGER,
PRIMARY KEY (materia_id, autor_id),
FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
FOREIGN KEY (autor_id) REFERENCES autores(id)
)`);

});

// ---------------- API ----------------

// LISTAR MATÉRIAS
app.get("/api/materias", (req, res) => {
db.all(`
SELECT m.*,
GROUP_CONCAT(a.NomeAutor, ', ') AS autores
FROM materias m
LEFT JOIN materia_autores ma ON ma.materia_id = m.id
LEFT JOIN autores a ON a.id = ma.autor_id
GROUP BY m.id
ORDER BY m.id DESC
`, (err, rows) => {
res.json(rows);
});
});

// LISTAR EDITORIAS
app.get("/api/editorias", (req, res) => {
db.all("SELECT * FROM editorias ORDER BY NomeEditoria", (err, rows) => {
res.json(rows);
});
});

// LISTAR AUTORES
app.get("/api/autores", (req, res) => {
db.all("SELECT * FROM autores ORDER BY NomeAutor", (err, rows) => {
res.json(rows);
});
});

// CRIAR AUTOR
app.post("/api/autores", (req, res) => {
  const { NomeAutor } = req.body;

  if (!NomeAutor) {
    return res.status(400).json({ ok: false });
  }

  db.run(
    "INSERT INTO autores (NomeAutor) VALUES (?)",
    [NomeAutor],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ ok: false });
      }

      res.json({
        ok: true,
        id: this.lastID
      });
    }
  );
});

// CRIAR MATÉRIA
app.post("/api/materias", (req, res) => {

const {
content,
title,
linhafina,
authors,
url,
image,
imgrights,
chapeu,
editoria,
path
} = req.body;

const now = new Date().toISOString();

db.run(`
INSERT INTO materias (
date,
publishdate,
content,
title,
linhafina,
url,
image,
imgrights,
chapeu,
editoria,
path
)
VALUES (?,?,?,?,?,?,?,?,?,?,?)
`, [
now,
now,
content,
title,
linhafina,
url,
image,
imgrights || "Reprodução",
chapeu,
editoria,
path
], function () {

const materiaId = this.lastID;

// garante sempre array
let lista = [];

if (typeof authors === "string") {
  lista = authors.split(/[;.]/).map(a => a.trim()).filter(Boolean);
} else if (Array.isArray(authors)) {
  lista = authors;
}

// garante somente IDs válidos
const stmtSelect = `SELECT id FROM autores WHERE NomeAutor = ?`;
const stmtInsert = db.prepare(`INSERT INTO autores (NomeAutor) VALUES (?)`);
const stmtRel = db.prepare(`
  INSERT INTO materia_autores (materia_id, autor_id)
  VALUES (?, ?)
`);

lista.forEach(valor => {

  // se já é número → usa direto
  if (typeof valor === "number") {
    stmtRel.run(materiaId, valor);
    return;
  }

  // se é string → resolve nome
  db.get(stmtSelect, [valor], (err, row) => {

    if (row) {
      stmtRel.run(materiaId, row.id);
    } else {
      stmtInsert.run(valor, function () {
        stmtRel.run(materiaId, this.lastID);
      });
    }
  });
});

res.json({ ok: true });

});
});

// EDITAR
app.put("/api/materias/:id", (req, res) => {
const { title, content, editoria, chapeu, publishdate } = req.body;

db.run(`
UPDATE materias
SET title=?,
content=?,
editoria=?,
chapeu=?,
publishdate=?
WHERE id=?
`, [
title,
content,
editoria,
chapeu,
publishdate,
req.params.id
], () => res.json({ ok: true }));
});

// EXCLUIR UMA MATÉRIA
app.delete("/api/materias/:id", (req, res) => {

const id = req.params.id;

db.serialize(() => {

  // 1. remove vínculos N:N primeiro
  db.run("DELETE FROM materia_autores WHERE materia_id=?", [id]);

  // 2. remove matéria
  db.run("DELETE FROM materias WHERE id=?", [id], function (err) {

    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false });
    }

    res.json({ ok: true });
  });

});

});

// EXCLUIR TODAS MATÉRIAS
app.delete("/api/tabela", (req, res) => {
db.run("DELETE FROM materias", () => {
db.run("DELETE FROM sqlite_sequence WHERE name='materias'");
res.json({ ok: true });
});
});

// EXPORT JSON
app.get("/export/json", (req, res) => {

  db.all("SELECT * FROM materias ORDER BY id DESC", (err, materias) => {

    db.all(`
      SELECT ma.materia_id, a.NomeAutor
      FROM materia_autores ma
      JOIN autores a ON a.id = ma.autor_id
    `, (err2, relacoes) => {

      // montar mapa materia_id → autores[]
      const mapa = {};

      relacoes.forEach(r => {
        if (!mapa[r.materia_id]) {
          mapa[r.materia_id] = [];
        }
        mapa[r.materia_id].push(r.NomeAutor);
      });

      // juntar com matérias
      const resultado = materias.map(m => ({
        ...m,
        autores: mapa[m.id] ? mapa[m.id].join(", ") : ""
      }));

      fs.writeFileSync(
        "conteudo.json",
        JSON.stringify({ conteudo: resultado }, null, 2),
        "utf-8"
      );

      res.json({ ok: true });
    });

  });

});

app.get("/export/csv", (req, res) => {

  db.all("SELECT * FROM materias ORDER BY id DESC", (err, materias) => {

    db.all(`
      SELECT ma.materia_id, a.NomeAutor
      FROM materia_autores ma
      JOIN autores a ON a.id = ma.autor_id
    `, (err2, relacoes) => {

      const mapa = {};

      relacoes.forEach(r => {
        if (!mapa[r.materia_id]) {
          mapa[r.materia_id] = [];
        }
        mapa[r.materia_id].push(r.NomeAutor);
      });

      const header = "id,title,autores,editoria,chapeu,url,publishdate\n";

      const body = materias.map(m => {
        const autores = mapa[m.id] ? mapa[m.id].join(", ") : "";

        return `${m.id},"${m.title || ""}","${autores}","${m.editoria || ""}","${m.chapeu || ""}","${m.url || ""}","${m.publishdate}"`;
      }).join("\n");

      fs.writeFileSync("materias.csv", header + body, "utf-8");

      res.json({ ok: true });
    });

  });

});

// ---------------- START ----------------
app.listen(3000, () => {
console.log("http://localhost:3000");
});
