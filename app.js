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

async function criar() {
await fetch("/api/materias", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
title: title.value,
author: author.value,
editoria: editoria.value,
chapeu: chapeu.value,
url: url.value,
content: content.value
})
});

carregar();
}

async function deletar(id) {
await fetch("/api/materias/" + id, { method: "DELETE" });
carregar();
}

async function editar(id) {
const novo = prompt("Novo título:");
if (!novo) return;

await fetch("/api/materias/" + id, {
method: "PUT",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ title: novo })
});

carregar();
}

async function exportar() {
await fetch("/export");
alert("conteudo.json atualizado!");
}

carregar();