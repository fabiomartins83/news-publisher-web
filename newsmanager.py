import sqlite3
import json
import csv
from datetime import datetime

# Tenta importar ReportLab, se não existir, apenas avisar
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    REPORTLAB_INSTALLED = True
except ModuleNotFoundError:
    REPORTLAB_INSTALLED = False
    print("⚠️ Biblioteca reportlab não instalada. Execute o comando 'pip install reportlab'.")

DB_FILE = "materias.db"
JSON_FILE = "conteudo.json"

# --- Cores para terminal ---
SUCCESS = ""
WARNING = ""
ERROR = ""
RESET = ""

# --- Conexão ---
def conectar():
    return sqlite3.connect(DB_FILE)

# --- Verificar existência da tabela ---
def tabela_existe():
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='materias'")
        return cursor.fetchone() is not None

# --- Criar tabela ---
def criar_tabela():
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS materias (
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
            destaque BOOL,
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
            maislidas BOOL,
            importante BOOL
        )''')
        conn.commit()

# --- Funções auxiliares ---
def formatar_data(data_str, formato_saida="%Y-%m-%dT%H:%M:%S"):
    """Converte uma string de data para o formato desejado, retornando a string original se falhar."""
    if not data_str:
        return ""
    try:
        dt = datetime.strptime(data_str, "%Y-%m-%dT%H:%M:%S")
        return dt.strftime(formato_saida)
    except ValueError:
        return data_str

def criar_dict_materia(r):
    """Cria um dicionário de matéria a partir de uma linha do banco."""
    return {
        "id": r[0],
        "date": formatar_data(r[1]),
        "name": r[2],
        "type": r[3],
        "publishdate": formatar_data(r[4]),
        "title": r[5],
        "content": r[6],
        "linhafina": r[7],
        "abstract": r[8],
        "path": r[9],
        "url": r[10],
        "image": r[11],
        "chapeu": r[12],
        "category": r[13],
        "editoria": r[14],
        "tema": r[15],
        "destaque": r[16],
        "imgrights": r[17],
        "imgdescript": r[18],
        "author": r[19],
        "location": r[20],
        "cortexto": r[21],
        "corfundo": r[22],
        "fontetexto": r[23],
        "entrelinhas": r[24],
        "margin": r[25],
        "padding": r[26],
        "textalign": r[27],
        "paragrafo": r[28],
        "comentarios": r[29]
    }

# --- Cadastro ---
def cadastrar_materia():
    agora = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")  # Formato ISO
    conteudo = input("Conteúdo: ").strip() or ""
    if not conteudo:
        print(f"\n{WARNING}Cadastro cancelado!{RESET}\n")
        return
    titulo = input("Título: ").strip()
    linhafina = input("Linha fina: ").strip()
    autor = input("Autor: ").strip() or 'Fábio de Almeida Martins'
    link = input("Link para matéria completa: ").strip()
    imagem = input('Caminho para imagem de destaque: ').strip()
    dirimagem = input('Direitos da imagem de destaque: ').strip() or 'Reprodução'
    chapeu = input('Chapeu: ').strip()
    editoria = input('Editoria: ').strip()
    pasta = input('Caminho para pasta da matéria: ').strip() or ''

    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO materias (date, publishdate, content, title, linhafina, author, url, image, imgrights, chapeu, editoria, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (agora, agora, conteudo, titulo, linhafina, autor, link, imagem, dirimagem, chapeu, editoria, pasta)
        )
        conn.commit()
    print(f"\n{SUCCESS}✅ Matéria cadastrada com sucesso!{RESET}\n")

# --- Listagem ---
def listar_materias():
    if not tabela_existe():
        print(f"\n{WARNING}Tabela 'materias' não encontrada. Nenhuma matéria para listar.{RESET}\n")
        return

    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, author, date, publishdate, content, chapeu, editoria, url FROM materias ORDER BY id DESC")
        rows = cursor.fetchall()

    if not rows:
        print(f"\n{WARNING}Nenhuma matéria cadastrada.{RESET}\n")
        return

    print("\nExibindo todos os registros armazenados.\n")
    for row in rows:
        codigo, titulo, autor, data_raw, publish_raw, conteudo, chapeu, editoria, link = row
        data_formatada = formatar_data(data_raw, "%d/%m/%Y %Hh%M")

        print(f"CÓDIGO: {codigo}\n")
        print(f'{editoria.upper()} >> {chapeu.upper()}\n')
        temp = titulo if titulo else ""
        while temp:
            print(temp[:70])
            temp = temp[70:]
        print()
        if data_formatada:
            print(data_formatada)
        if autor:
            print(autor)
        print()
        temp = conteudo if conteudo else ""
        while temp:
            print(temp[:70])
            temp = temp[70:]
        print()
        temp = link if link else ""
        while temp:
            print(temp[:70])
            temp = temp[70:]
        print("\n" + "-" * 70 + "\n")

# --- Edição ---
def editar_materia():
    if not tabela_existe():
        print(f"\n{WARNING}Tabela 'materias' não encontrada. Nenhuma matéria para editar.{RESET}\n")
        return

    id_materia = input("Digite o ID da matéria que deseja editar: ").strip()
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, author, date, publishdate, content FROM materias WHERE id=?", (id_materia,))
        row = cursor.fetchone()

    if not row:
        print("\nMatéria não encontrada.\n")
        return

    codigo, titulo, autor, data_raw, publish_raw, conteudo = row
    data_formatada = formatar_data(data_raw, "%d/%m/%Y %Hh%M")

    print(f"\nCÓDIGO: {codigo}\n")
    temp = titulo if titulo else ""
    while temp:
        print(temp[:70])
        temp = temp[70:]
    print()
    if data_formatada:
        print(data_formatada)
    if autor:
        print(autor)
    print()
    temp = conteudo if conteudo else ""
    while temp:
        print(temp[:70])
        temp = temp[70:]
    print("\n" + "-" * 70 + "\n")

    novo_titulo = input("\nNovo título (pressione Enter para manter): ").strip() or titulo
    novo_autor = input("Novo autor (pressione Enter para manter): ").strip() or autor
    novo_publishdate = input("Nova data de publicação (YYYY-mm-ddThh:mm:ss, Enter para manter): ").strip() or publish_raw
    novo_conteudo = input("Novo conteúdo (pressione Enter para manter): ").strip() or conteudo

    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE materias SET title=?, author=?, publishdate=?, content=? WHERE id=?",
            (novo_titulo, novo_autor, novo_publishdate, novo_conteudo, id_materia)
        )
        conn.commit()
    print("\nMatéria atualizada com sucesso!\n")

# --- Exclusão ---
def excluir_materia():
    if not tabela_existe():
        print(f"\n{WARNING}Tabela 'materias' não encontrada. Nenhuma matéria para excluir.{RESET}\n")
        return

    id_materia = input("Digite o ID da matéria que deseja excluir: ").strip()
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, author, publishdate, content FROM materias WHERE id=?", (id_materia,))
        row = cursor.fetchone()

    if not row:
        print("\nMatéria não encontrada.\n")
        return

    codigo, titulo, autor, data_raw, conteudo = row
    data_formatada = formatar_data(data_raw, "%d/%m/%Y %Hh%M")

    print(f"\nCÓDIGO: {codigo}\n")
    temp = titulo if titulo else ""
    while temp:
        print(temp[:70])
        temp = temp[70:]
    print()
    if data_formatada:
        print(data_formatada)
    if autor:
        print(autor)
    print()
    temp = conteudo if conteudo else ""
    while temp:
        print(temp[:70])
        temp = temp[70:]
    print("\n" + "-" * 70 + "\n")

    confirmacao = input("\nDeseja realmente excluir esta matéria? (s/n): ").strip().lower()
    if confirmacao == 's':
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM materias WHERE id=?", (id_materia,))
            conn.commit()
        print("\nMatéria excluída com sucesso!\n")
    else:
        print("\nExclusão cancelada.\n")

# --- Reiniciar contagem ---
def reiniciar_contagem():
    confirm = input(f"\n{WARNING}Tem certeza que deseja reiniciar a contagem e esvaziar a tabela? (s/n): {RESET}").strip().lower()
    if confirm != 's':
        print(f"\n{WARNING}Ação cancelada.{RESET}\n")
        return
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM materias")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='materias'")
        conn.commit()
    print(f"\n{SUCCESS}✅ Contagem reiniciada e tabela esvaziada!{RESET}\n")

# --- Excluir tabela ---
def excluir_tabela():
    confirm = input(f"\n{WARNING}Tem certeza que deseja excluir a tabela 'materias'? (s/n): {RESET}").strip().lower()
    if confirm != 's':
        print(f"\n{WARNING}Ação cancelada.{RESET}\n")
        return
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS materias")
        conn.commit()
    print(f"\n{SUCCESS}🗑️ Tabela 'materias' excluída!{RESET}\n")

# --- Exportar JSON ---
def exportar_json():
    if not tabela_existe():
        print(f"\n{WARNING}Tabela 'materias' não encontrada. Nenhum dado para exportar.{RESET}\n")
        return

    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM materias ORDER BY id DESC")
        rows = cursor.fetchall()

    if not rows:
        print(f"\n{WARNING}Nenhuma matéria cadastrada. Arquivo conteudo.json não foi criado.{RESET}\n")
        return

    materias = [criar_dict_materia(r) for r in rows]
    json_final = {"conteudo": materias}

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(json_final, f, ensure_ascii=False, indent=4)
    print(f"{SUCCESS}💾 Exportado para {JSON_FILE} com sucesso!{RESET}")

# --- Exportar PDF/CSV ---
def exportar_lista():
    if not tabela_existe():
        print(f"\n{WARNING}Tabela 'materias' não encontrada. Nenhuma matéria para exportar.{RESET}\n")
        return

    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, author, publishdate, content FROM materias ORDER BY id DESC")
        rows = cursor.fetchall()

    if not rows:
        print(f"\n{WARNING}Nenhuma matéria cadastrada.{RESET}\n")
        return

    formato = input("\nEscolha o formato: PDF ou CSV: ").strip().lower()
    if formato not in ['pdf', 'csv']:
        print(f"{ERROR}Formato inválido!{RESET}")
        return

    if formato == 'csv':
        arquivo_csv = "lista_materias.csv"
        with open(arquivo_csv, "w", newline='', encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["ID", "Título", "Autor", "Data"])
            for r in rows:
                writer.writerow(r)
        print(f"\n{SUCCESS}Arquivo {arquivo_csv} criado com sucesso!{RESET}\n")

    elif formato == 'pdf':
        if not REPORTLAB_INSTALLED:
            print(f"\n{WARNING}ReportLab não disponível, não é possível gerar PDF.{RESET}\n")
            return
        arquivo_pdf = "lista_materias.pdf"
        c = canvas.Canvas(arquivo_pdf, pagesize=A4)
        largura, altura = A4
        y = altura - 50
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "Lista de Matérias Cadastradas")
        y -= 30
        c.setFont("Helvetica", 12)
        c.drawString(50, y, "ID")
        c.drawString(100, y, "Título")
        c.drawString(300, y, "Autor")
        c.drawString(450, y, "Data")
        y -= 20
        c.line(50, y, 550, y)
        y -= 20
        for r in rows:
            if y < 50:
                c.showPage()
                y = altura - 50
            c.drawString(50, y, str(r[0]))
            c.drawString(100, y, r[1][:25])
            c.drawString(300, y, r[2][:20] if r[2] else "")
            c.drawString(450, y, r[3])
            y -= 20
        c.save()
        print(f"\n{SUCCESS}Arquivo {arquivo_pdf} criado com sucesso!{RESET}\n")

# --- Menu ---
def menu():
    criar_tabela()
    while True:
        print("\n=== GERENCIADOR DE MATÉRIAS ===")
        print("1. Cadastrar nova matéria")
        print("2. Listar matérias")
        print("3. Editar matéria")
        print("4. Excluir matéria")
        print("5. Reiniciar contagem")
        print("6. Excluir tabela materias")
        print("7. Exportar lista de matérias (PDF/CSV)")
        print("8. Exportar para JSON")
        print("0. Sair")

        opcao = input("\nEscolha uma opção: ").strip()
        if opcao == "1":
            cadastrar_materia()
        elif opcao == "2":
            listar_materias()
        elif opcao == "3":
            editar_materia()
        elif opcao == "4":
            excluir_materia()
        elif opcao == "5":
            reiniciar_contagem()
        elif opcao == "6":
            excluir_tabela()
        elif opcao == "7":
            exportar_lista()
        elif opcao == "8":
            exportar_json()
        elif opcao == "0":
            print(f"\n{SUCCESS}Obrigado por usar News Manager! \nAté a próxima!{RESET}\n")
            break
        else:
            print(f"\n{ERROR}Opção inválida. Tente novamente.{RESET}\n")

if __name__ == "__main__":
    menu()
