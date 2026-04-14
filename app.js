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
<button onclick="editar(${m.id})">Editar título</button>
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
async function editar(id) {
const novo = prompt("Novo título:");
if (!novo) return;

await fetch("/api/materias/" + id, {
method: "PUT",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ title: novo })
});

carregar();
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

// inicial
carregar();