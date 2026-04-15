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
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA busy_timeout = 5000;");

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
  NomeEditoria TEXT UNIQUE
)`, () => {

  const editoriasPadrao = [
    "Política",
    "Economia",
    "Cotidiano",
    "Esportes",
    "Cultura",
    "Ciência",
    "Educação"
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO editorias (NomeEditoria)
    VALUES (?)
  `);

  editoriasPadrao.forEach(e => stmt.run(e));

  stmt.finalize();
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
INSERT OR IGNORE INTO autores (NomeAutor, Email, Biografia, Editoria)
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

// ---------------- CRIAR MATÉRIA (CORRIGIDO 🔥) ----------------
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

  db.serialize(() => {

    db.run("BEGIN TRANSACTION");

    db.run(`
      INSERT INTO materias (
        date, publishdate, content, title, linhafina,
        url, image, imgrights, chapeu, editoria, path
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      now, now, content, title, linhafina,
      url, image, imgrights || "Reprodução",
      chapeu, editoria, path
    ], function (err) {

      if (err) {
        db.run("ROLLBACK");
        return res.json({ ok: false });
      }

      const materiaId = this.lastID;

      const lista = Array.isArray(authors) ? authors : [];

      const stmtRel = db.prepare(`
        INSERT OR IGNORE INTO materia_autores (materia_id, autor_id)
        VALUES (?, ?)
      `);

      const stmtBusca = db.prepare(`
        SELECT id FROM autores WHERE NomeAutor = ?
      `);

      const stmtInsert = db.prepare(`
        INSERT INTO autores (NomeAutor) VALUES (?)
      `);

      let pendentes = lista.length;

      if (pendentes === 0) finalizar();

      lista.forEach(nome => {

        if (typeof nome === "number") {
          stmtRel.run(materiaId, nome, done);
        } else {

          stmtBusca.get(nome, (err, row) => {

            if (row) {
              stmtRel.run(materiaId, row.id, done);
            } else {
              stmtInsert.run(nome, function () {
                stmtRel.run(materiaId, this.lastID, done);
              });
            }

          });

        }

      });

      function done() {
        pendentes--;
        if (pendentes === 0) finalizar();
      }

      function finalizar() {
        stmtRel.finalize();
        stmtBusca.finalize();
        stmtInsert.finalize();

        db.run("COMMIT");
        res.json({ ok: true });
      }

    });

  });

});


// ---------------- EDITAR ----------------
app.put("/api/materias/:id", (req, res) => {

  const { title, content, editoria, chapeu, publishdate } = req.body;

  db.run(`
    UPDATE materias
    SET title=?, content=?, editoria=?, chapeu=?, publishdate=?
    WHERE id=?
  `, [
    title,
    content,
    editoria,
    chapeu,
    publishdate,
    req.params.id
  ], (err) => {
    if (err) return res.json({ ok: false });
    res.json({ ok: true });
  });
});


// ---------------- DELETE ----------------
app.delete("/api/materias/:id", (req, res) => {

  const id = req.params.id;

  db.serialize(() => {

    db.run("BEGIN TRANSACTION");

    db.run("DELETE FROM materia_autores WHERE materia_id=?", [id]);
    db.run("DELETE FROM materias WHERE id=?", [id], (err) => {

      if (err) {
        db.run("ROLLBACK");
        return res.json({ ok: false });
      }

      db.run("COMMIT");
      res.json({ ok: true });
    });

  });

});


// ---------------- EXCLUIR TABELA ----------------
app.delete("/api/tabela", (req, res) => {

  db.serialize(() => {
    db.run("DELETE FROM materias");
    db.run("DELETE FROM materia_autores");
    db.run("DELETE FROM sqlite_sequence WHERE name='materias'");
    res.json({ ok: true });
  });

});


// ---------------- EXPORT JSON ----------------
app.get("/export/json", (req, res) => {

  db.all("SELECT * FROM materias ORDER BY id DESC", (err, materias) => {

    db.all(`
      SELECT ma.materia_id, a.NomeAutor
      FROM materia_autores ma
      JOIN autores a ON a.id = ma.autor_id
    `, (err2, relacoes) => {

      const mapa = {};

      relacoes.forEach(r => {
        if (!mapa[r.materia_id]) mapa[r.materia_id] = [];
        mapa[r.materia_id].push(r.NomeAutor);
      });

      const resultado = materias.map(m => ({
        ...m,
        author: mapa[m.id]?.join(", ") || ""
      }));

      fs.writeFileSync(
        "conteudo.json",
        JSON.stringify({ conteudo: resultado }, null, 2)
      );

      res.json({ ok: true });
    });

  });

});


// ---------------- EXPORT CSV ----------------
app.get("/export/csv", (req, res) => {

  db.all("SELECT * FROM materias ORDER BY id DESC", (err, materias) => {

    db.all(`
      SELECT ma.materia_id, a.NomeAutor
      FROM materia_autores ma
      JOIN autores a ON a.id = ma.autor_id
    `, (err2, relacoes) => {

      const mapa = {};

      relacoes.forEach(r => {
        if (!mapa[r.materia_id]) mapa[r.materia_id] = [];
        mapa[r.materia_id].push(r.NomeAutor);
      });

      const header = "id,title,autores,editoria,url,publishdate\n";

      const body = materias.map(m => {
        const autores = mapa[m.id]?.join(", ") || "";
        return `${m.id},"${m.title}","${autores}","${m.editoria}","${m.url}","${m.publishdate}"`;
      }).join("\n");

      fs.writeFileSync("materias.csv", header + body);

      res.json({ ok: true });
    });

  });

});

// ---------------- START ----------------
app.listen(3000, () => {
console.log("http://localhost:3000");
});
