let autoresCache = [];
let sugestBox = null;
let debounce = null;

function mostrarMensagem(texto) {
const div = document.createElement("div");

div.textContent = texto;
div.style.position = "fixed";
div.style.top = "20px";
div.style.right = "20px";
div.style.background = "#4CAF50";
div.style.color = "white";
div.style.padding = "10px 15px";
div.style.borderRadius = "6px";
div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
div.style.zIndex = 9999;
div.style.fontFamily = "Arial";

document.body.appendChild(div);

setTimeout(() => div.remove(), 2000);
}

const SEPARADORES = /[;,]/;

    // ---------------- LISTAR ----------------
async function carregar() {
const res = await fetch("/api/materias");
const data = await res.json();

document.getElementById("lista").innerHTML =
data.map(m => `
<div class="card">
<b>${m.title}</b> - ${m.editoria || ""}<br>
<small>${m.autores || ""}</small>
${(m.content || "").slice(0, 120)}...

<div class="actions">
<button onclick="editar(${m.id})">Alterar </button>
<button onclick="deletar(${m.id})"  tabindex="-1">Excluir </button>
</div>
</div>
`).join("");
}

// ---------------- CRIAR ----------------
async function criar() {
  try {

    // =========================
    // VALIDAÇÃO DE FORMULÁRIO
    // =========================
    const temConteudo =
      content.value.trim() ||
      title.value.trim() ||
      linhafina.value.trim() ||
      author.value.trim() ||
      url.value.trim() ||
      image.value.trim() ||
      chapeu.value.trim() ||
      editoria.value.trim() ||
      path.value.trim();

    if (!temConteudo) {
      mostrarMensagem("Insira os dados da matéria no formulário.");
      focarConteudo();
      return; // 🚫 impede o envio
    }

    // ✅ VALIDAÇÃO MAIS RIGOROSA
    if (!title.value.trim() || !content.value.trim()) {
      mostrarMensagem("Preencha ao menos título e conteúdo.");
      focarConteudo();
      return;
    }

    await carregarAutores();

    // =========================
    // 1. COLETA + SPLIT AUTORES
    // =========================
    let nomes = document.getElementById("author")
      .value
      .split(SEPARADORES)
      .map(a => a.trim())
      .filter(Boolean);
    console.log(nomes);

    let autoresFinal = [];

    // =========================
    // 2. RESOLVE AUTORES
    // =========================
    for (let nome of nomes) {

      let existe = autoresCache.find(a =>
        a.NomeAutor.toLowerCase() === nome.toLowerCase()
      );

      if (!existe) {

        const ok = confirm(`Autor "${nome}" não existe. Deseja adicionar novo autor?`);

        if (ok) {
          const res = await fetch("/api/autores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ NomeAutor: nome })
          });

          const novo = await res.json();

          autoresFinal.push(novo.id);

          autoresCache.push({
            id: novo.id,
            NomeAutor: nome
          });

        } else {
          // aceita como texto mesmo sem cadastro
          autoresFinal.push(nome);
        }

      } else {
        autoresFinal.push(existe.id);
      }
    }

    // =========================
    // 3. ENVIO DA MATÉRIA
    // =========================
    const res = await fetch("/api/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.value,
        title: title.value,
        linhafina: linhafina.value,
        authors: autoresFinal,   // <-- IMPORTANTE (não mais "author")
        url: url.value,
        image: image.value,
        imgrights: imgrights.value,
        chapeu: chapeu.value,
        editoria: editoria.value,
        path: path.value
      })
    });

    const text = await res.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Resposta inválida do servidor:", text);
      alert("Erro no servidor. Veja console.");
      return;
    }

    // =========================
    // 4. FEEDBACK
    // =========================
    if (result.ok) {

      content.value = "";
      title.value = "";
      linhafina.value = "";
      author.value = "";
      url.value = "";
      image.value = "";
      imgrights.value = "";
      chapeu.value = "";
      editoria.value = "";
      path.value = "";

      content.focus();

      mostrarMensagem("Matéria cadastrada com sucesso");
      await carregar();
      focarConteudo();


    } else {
      alert("Erro ao salvar matéria");
    }

  } catch (err) {
    console.error(err);
    alert("Erro de conexão com o servidor");
  }
}

// ---------------- EDITAR ----------------

let editId = null;

async function editar(id) {
const res = await fetch("/api/materias");
const data = await res.json();

const item = data.find(m => m.id === id);

if (!item) return;

editId = id;

// preencher modal
document.getElementById("edit_title").value = item.title || "";
document.getElementById("edit_author").value = item.autores || "";
document.getElementById("edit_publishdate").value = item.publishdate || "";
document.getElementById("edit_content").value = item.content || "";

// mostrar modal
document.getElementById("modal").style.display = "flex";
}

// ---------------- EXCLUIR MATÉRIA ----------------
async function deletar(id) {
  const ok = confirm("Deseja excluir esta matéria?");
  
  if (ok) {
    const res = await fetch("/api/materias/" + id, { method: "DELETE" });
    const result = await res.json();

    if (result.ok) {
      mostrarMensagem("Matéria excluída com sucesso");
      await carregar();
    } else {
      alert("Erro ao excluir");
    }
  }

  focarConteudo(); // 👈 sempre executa
}

// ---------------- EXPORTS ----------------
async function exportarJSON() {
await fetch("/export/json");
focarConteudo();
alert("conteudo.json atualizado!");
}

async function exportarCSV() {
await fetch("/export/csv");
focarConteudo();

alert("materias.csv atualizado!");
}

// ---------------- EXCLUIR TABELA ----------------
async function excluirTabela() {
  const ok = confirm("Deseja excluir TODAS as matérias?");
  
  if (ok) {
    await fetch("/api/tabela", { method: "DELETE" });
    await carregar();
  }

  focarConteudo(); // 👈 sempre executa
}

// ---------------- FECHAR MODAL ----------------
function fecharModal() {
  document.getElementById("modal").style.display = "none";
  focarConteudo(); // 👈 garante foco ao cancelar
}

// ---------------- SALVAR EDIÇÃO ----------------
async function salvarEdicao() {
  await fetch("/api/materias/" + editId, {
    method: "PUT",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      title: edit_title.value,
      publishdate: edit_publishdate.value,
      content: edit_content.value
    })
  });

  fecharModal();
  await carregar();
  mostrarMensagem("Matéria atualizada com sucesso");

  focarConteudo(); // 👈 mantém padrão (sempre no final)
}

// ---------------- LIMPAR FORMULÁRIO ----------------
function limparFormulario() {
  const ok = confirm("Deseja limpar o formulário?");
  
  if (ok) {
    content.value = "";
    title.value = "";
    linhafina.value = "";
    author.value = "";
    url.value = "";
    image.value = "";
    imgrights.value = "";
    chapeu.value = "";
    editoria.value = "";
    path.value = "";
  }

  focarConteudo(); // 👈 sempre executa
}

// ---------------- CARREGAR VALORES DE "EDITORIAS" ----------------
async function carregarEditorias() {
  const res = await fetch("/api/editorias");
  let editorias = await res.json();

  const select = document.getElementById("editoria");

  // limpa completamente
  select.replaceChildren();

  // opção padrão
  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "Não definido";
  select.appendChild(optDefault);

  // ✅ ORDENAÇÃO ALFABÉTICA (com acentos)
  editorias.sort((a, b) =>
    a.NomeEditoria.localeCompare(b.NomeEditoria, "pt-BR", {
      sensitivity: "base"
    })
  );

  // evitar duplicatas
  const nomesInseridos = new Set();

  editorias.forEach(e => {
    if (nomesInseridos.has(e.NomeEditoria)) return;

    nomesInseridos.add(e.NomeEditoria);

    const opt = document.createElement("option");
    opt.value = e.NomeEditoria.toLowerCase();
    opt.textContent = e.NomeEditoria;

    select.appendChild(opt);
  });
}

// ---------------- ATIVAR CAIXA DE SELEÇÃO "EDITORIAS" ----------------
const contentField = document.getElementById("content");
const editoriaField = document.getElementById("editoria");

function atualizarEditorias() {
  const temTexto = contentField.value.trim().length > 0;
  editoriaField.disabled = !temTexto;
}

contentField.addEventListener("input", atualizarEditorias);

// garante estado correto ao abrir a página
atualizarEditorias();

// ---------------- GERAR ID VISUAL (SIMULAÇÃO) ----------------
function atualizarIdPreview() {
  const lista = document.querySelectorAll("#lista .card");
  const novoId = lista.length + 1;

  document.getElementById("materia_id").value = novoId;
}

// chama ao carregar e após mudanças
const originalCarregar = carregar;

carregar = async function () {
  await originalCarregar();
  atualizarIdPreview();
};

// foco no campo Conteúdo
function focarConteudo() {
  const campo = document.getElementById("content");
  if (campo) {
    campo.focus();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  focarConteudo();
  carregarEditorias(); // 👈 ESSENCIAL
  carregar();
});

// carregar autores
async function carregarAutores() {
  const res = await fetch("/api/autores");
  autoresCache = await res.json();
}

// autocompletar
function initAutocomplete() {
  const input = document.getElementById("author");

  sugestBox = document.createElement("div");
  sugestBox.style.position = "absolute";
  sugestBox.style.background = "#fff";
  sugestBox.style.border = "1px solid #ccc";
  sugestBox.style.width = input.offsetWidth + "px";
  sugestBox.style.zIndex = 9999;
  sugestBox.style.display = "none";

  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(sugestBox);

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => sugerirAutores(input), 150);
  });
}

// sugerir autores
function sugerirAutores(input) {
  const partes = input.value.split(SEPARADORES);
  const termo = partes[partes.length - 1].trim().toLowerCase();

  if (!termo) {
    sugestBox.style.display = "none";
    return;
  }

  const encontrados = autoresCache.filter(a =>
    a.NomeAutor.toLowerCase().includes(termo)
  );

  sugestBox.innerHTML = "";

  if (!encontrados.length) {
    sugestBox.style.display = "none";
    return;
  }

  encontrados.forEach(a => {
    const div = document.createElement("div");
    div.textContent = a.NomeAutor;
    div.style.padding = "6px";
    div.style.cursor = "pointer";

    div.onclick = () => {
      partes[partes.length - 1] = " " + a.NomeAutor;
      input.value = partes.join(";").replace(/^;/, "").trim();
      sugestBox.style.display = "none";
    };

    sugestBox.appendChild(div);
  });

  sugestBox.style.display = "block";
}

// inicial
carregar();