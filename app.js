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

// ---------------- LISTAR ----------------
async function carregar() {
const res = await fetch("/api/materias");
const data = await res.json();

document.getElementById("lista").innerHTML =
data.map(m => `
<div class="card">
<b>${m.title}</b> - ${m.editoria || ""}<br>
<small>${m.author || ""}</small><br><br>
${(m.content || "").slice(0, 120)}...

<div class="actions">
<button onclick="deletar(${m.id})">Excluir</button>
<button onclick="editar(${m.id})">Editar matéria</button>
</div>
</div>
`).join("");
}

// ---------------- CRIAR ----------------
async function criar() {
try {
const res = await fetch("/api/materias", {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
content: content.value,
title: title.value,
linhafina: linhafina.value,
author: author.value,
url: url.value,
image: image.value,
imgrights: imgrights.value,
chapeu: chapeu.value,
editoria: editoria.value,
path: path.value
})
});

const result = await res.json();

if (result.ok) {

// limpar campos
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

// feedback
mostrarMensagem("Matéria cadastrada com sucesso");

carregar();
} else {
alert("Erro ao salvar matéria");
}

} catch (err) {
alert("Erro de conexão com o servidor");
console.error(err);
}
}
// ---------------- DELETAR ----------------
async function deletar(id) {
await fetch("/api/materias/" + id, { method: "DELETE" });
carregar();
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
document.getElementById("edit_author").value = item.author || "";
document.getElementById("edit_publishdate").value = item.publishdate || "";
document.getElementById("edit_content").value = item.content || "";

// mostrar modal
document.getElementById("modal").style.display = "flex";
}

// ---------------- EXPORTS ----------------
async function exportarJSON() {
await fetch("/export/json");
alert("conteudo.json atualizado!");
}

async function exportarCSV() {
await fetch("/export/csv");
alert("materias.csv atualizado!");
}

// ---------------- EXCLUIR TABELA ----------------
async function excluirTabela() {
const ok = confirm("Tem certeza que deseja apagar TODAS as matérias?");
if (!ok) return;

await fetch("/api/tabela", { method: "DELETE" });
carregar();
}

// ---------------- FECHAR MODAL ----------------
function fecharModal() {
document.getElementById("modal").style.display = "none";
}

// ---------------- SALVAR EDIÇÃO ----------------
async function salvarEdicao() {
await fetch("/api/materias/" + editId, {
method: "PUT",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
title: edit_title.value,
author: edit_author.value,
publishdate: edit_publishdate.value,
content: edit_content.value
})
});

fecharModal();
carregar();
mostrarMensagem("Matéria atualizada com sucesso");
}

// ---------------- LIMPAR FORMULÁRIO ----------------
function limparFormulario() {
const ok = confirm("Deseja limpar o formulário?");
if (!ok) return;

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

// inicial
carregar();