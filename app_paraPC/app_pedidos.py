from collections import Counter
from datetime import datetime
import json
import os
import subprocess
import time
import tkinter as tk
from tkinter import messagebox, simpledialog, ttk

# --- Verificação e Carregamento do Pillow para Ícones Gráficos ---
try:
  from PIL import Image, ImageDraw, ImageTk

  PIL_DISPONIVEL = True
except ImportError:
  PIL_DISPONIVEL = False


class PapaBolotasPOS:

  def __init__(self, root):
    self.root = root
    self.root.title("Papa Bolotas - POS Pedidos & Stock")
    self.root.geometry("1024x720")

    # Tornar a janela principal totalmente responsiva
    self.root.rowconfigure(0, weight=1)
    self.root.columnconfigure(0, weight=1)

    # Ficheiros de persistência de dados
    self.ficheiro_dados = "dados_sessao.json"
    self.ficheiro_stock = "stock_artigos.json"
    self.ficheiro_menu = "menu_artigos.json"

    # Estilização das Abas
    self.estilar_interface()

    # Valores por omissão da sessão
    self.inicio_sessao = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    self.pedido_num = 1
    self.carrinho = []
    self.historico_pedidos = []

    self.imagens_tkinter = {}
    self.stock = {}

    # --- MENU PADRÃO ---
    self.menu_padrao = {
        "Sandes": {
            "Sandes de Presunto": 5.00,
            "Sandes Presunto e Queijo": 6.00,
            "Sandes Presunto e Ovo": 6.00,
            "Sandes Presunto, Queijo e Ovo": 7.00,
        },
        "Tábuas": {
            "Chouriço Assado": 5.00,
            "Tábua Alheira": 7.00,
            "Tábua Enchidos": 8.00,
            "Tábua Presunto e Queijo": 9.00,
            "Tábua Presunto e Enchidos": 9.00,
            "Tábua Enchidos e Queijo": 9.00,
            "Tábua Presunto": 12.00,
            "Tábua Completa": 12.00,
        },
        "Batatas": {
            "Batatas Simples": 3.00,
            "Nachos c/ Cheddar": 4.00,
            "Batatas c/ Cheddar": 4.50,
            "Batatas Presunto e Cheddar": 7.00,
            "Ovos Rotos": 8.00,
            "Ovos Rotos c/ Cheddar": 9.00,
        },
        "Doces": {"Fatia de Bolo": 1.00},
        "Bebidas": {
            "Água (Lisa)": 1.00,
            "Água com Gás": 1.50,
            "Cerveja Mini": 1.50,
            "Coca Cola": 2.00,
            "Coca Cola Zero": 2.00,
            "Ice Tea Limão": 2.00,
            "Ice Tea Pêssego": 2.00,
            "Sumol Ananás": 2.00,
            "Sumol Laranja": 2.00,
            "Pepsi Zero": 2.00,
            "Sprite": 2.00,
            "Guaraná": 2.00,
            "HITZ Maracujá": 7.00,
            "HITZ Frutos Vermelhos": 7.00,
            "Castiço": 7.00,
            "Muralhas": 7.00,
            "Pegões": 7.00,
            "Café": 1.00,
            "Champarrião 1 L": 8.00,
            "Champarrião 2 L": 13.50,
        },
    }

    # --- DICIONÁRIO DE ABREVIATURAS ---
    self.abreviaturas = {
        "Sandes de Presunto": "Sandes Presunto",
        "Sandes Presunto e Queijo": "S. Presunto/Queijo",
        "Sandes Presunto, Queijo e Ovo": "S. Pres/Quei/Ovo",
        "Sandes Presunto e Ovo": "S. Presunto/Ovo",
        "Chouriço Assado": "Chouriço Assado",
        "Tábua Completa": "Tábua Completa",
        "Tábua Presunto": "Tábua Presunto",
        "Tábua Presunto e Queijo": "Tábua Pres/Queijo",
        "Tábua Enchidos": "Tábua Enchidos",
        "Tábua Presunto e Enchidos": "Tábua Pres/Enchid",
        "Tábua Enchidos e Queijo": "Tábua Enchi/Queij",
        "Tábua Alheira": "Tábua Alheira",
        "Batatas Simples": "Batata Simples",
        "Nachos c/ Cheddar": "Nachos Cheddar",
        "Batatas c/ Cheddar": "Batata Cheddar",
        "Batatas Presunto e Cheddar": "Bat Pres/Cheddar",
        "Ovos Rotos": "Ovos Rotos",
        "Ovos Rotos c/ Cheddar": "Ovos R. Cheddar",
        "Fatia de Bolo": "Fatia de Bolo",
        "Água (Lisa)": "Água",
        "Água com Gás": "Água com Gás",
        "Cerveja Mini": "Cerveja Mini",
        "Coca Cola": "Coca Cola",
        "Coca Cola Zero": "Coca Cola Zero",
        "HITZ Maracujá": "HITZ Maracujá",
        "HITZ Frutos Vermelhos": "HITZ F.Vermel",
        "Ice Tea Limão": "Ice Tea Limão",
        "Ice Tea Pêssego": "Ice Tea Pêssego",
        "Sumol Ananás": "Sumol Ananás",
        "Sumol Laranja": "Sumol Laranja",
        "Pepsi Zero": "Pepsi Zero",
        "Sprite": "Sprite",
        "Guaraná": "Guaraná",
        "Castiço": "Castiço",
        "Muralhas": "Muralhas",
        "Pegões": "Pegões",
        "Café": "Café",
        "Champarrião 1 L": "Champarrião 1L",
        "Champarrião 2 L": "Champarrião 2L",
    }

    self.carregar_menu()
    self.carregar_dados_guardados()
    self.carregar_stock()
    self.garantir_pasta_icones()
    self.criar_interface()

  # --- GESTÃO DE MENU E PERSISTÊNCIA DE PREÇOS ---
  def carregar_menu(self):
    if os.path.exists(self.ficheiro_menu):
      try:
        with open(self.ficheiro_menu, "r", encoding="utf-8") as f:
          self.menu = json.load(f)
          return
      except Exception:
        pass
    self.menu = self.menu_padrao
    self.guardar_menu()

  def guardar_menu(self):
    try:
      with open(self.ficheiro_menu, "w", encoding="utf-8") as f:
        json.dump(self.menu, f, ensure_ascii=False, indent=2)
    except Exception as e:
      print(f"Erro ao guardar menu: {e}")

  # --- FUNÇÕES DE STOCK ---
  def carregar_stock(self):
    if os.path.exists(self.ficheiro_stock):
      try:
        with open(self.ficheiro_stock, "r", encoding="utf-8") as f:
          self.stock = json.load(f)
      except Exception:
        pass

    guardar = False
    for categoria, produtos in self.menu.items():
      for artigo in produtos.keys():
        if artigo not in self.stock:
          self.stock[artigo] = 1000
          guardar = True
    if guardar:
      self.guardar_stock()

  def guardar_stock(self):
    try:
      with open(self.ficheiro_stock, "w", encoding="utf-8") as f:
        json.dump(self.stock, f, ensure_ascii=False, indent=2)
    except Exception as e:
      print(f"Erro ao guardar stock: {e}")

  def gerir_stock(self):
    janela_stock = tk.Toplevel(self.root)
    janela_stock.title("Gestão de Stock de Artigos")
    janela_stock.geometry("550x650")

    tk.Label(
        janela_stock,
        text="CONTROLO DE INVENTÁRIO",
        font=("Arial", 12, "bold"),
    ).pack(pady=10)

    colunas = ("Categoria", "Artigo", "Stock")
    tree = ttk.Treeview(
        janela_stock, columns=colunas, show="headings", height=20
    )
    tree.heading("Categoria", text="Categoria")
    tree.heading("Artigo", text="Artigo")
    tree.heading("Stock", text="Qtd. em Stock")

    tree.column("Categoria", width=120)
    tree.column("Artigo", width=250)
    tree.column("Stock", width=100, anchor="center")
    tree.pack(padx=15, pady=5, fill="both", expand=True)

    def preencher_tabela():
      for item in tree.get_children():
        tree.delete(item)
      for cat, prods in self.menu.items():
        for p in prods.keys():
          tree.insert("", "end", values=(cat, p, self.stock.get(p, 0)))

    preencher_tabela()

    frame_alterar = tk.Frame(janela_stock)
    frame_alterar.pack(pady=15)

    tk.Label(frame_alterar, text="Nova Quantidade Real:").grid(
        row=0, column=0, padx=5
    )
    ent_qtd = tk.Entry(frame_alterar, width=10, font=("Arial", 11))
    ent_qtd.grid(row=0, column=1, padx=5)

    def gravar_nova_quantidade():
      selecao = tree.selection()
      if not selecao:
        messagebox.showwarning(
            "Aviso", "Tem de selecionar um artigo na lista acima primeiro."
        )
        return

      try:
        nova_qtd = int(ent_qtd.get())
        item_selecionado = tree.item(selecao[0])["values"][1]

        self.stock[item_selecionado] = nova_qtd
        self.guardar_stock()
        preencher_tabela()

        ent_qtd.delete(0, tk.END)
        messagebox.showinfo(
            "Sucesso",
            f"O stock de '{item_selecionado}' foi atualizado para {nova_qtd}.",
        )
      except ValueError:
        messagebox.showerror(
            "Erro",
            "Tem de introduzir um número inteiro válido (ex: 50, 10, 0).",
        )

    tk.Button(
        frame_alterar,
        text="Gravar Stock",
        bg="#4CAF50",
        fg="white",
        font=("Arial", 10, "bold"),
        command=gravar_nova_quantidade,
    ).grid(row=0, column=2, padx=15)

  # --- ADICIONAR NOVO ARTIGO AO MENU ---
  def adicionar_novo_artigo(self):
    janela_novo = tk.Toplevel(self.root)
    janela_novo.title("Adicionar Novo Artigo")
    janela_novo.geometry("400x320")

    tk.Label(
        janela_novo,
        text="ADICIONAR NOVO ARTIGO AO MENU",
        font=("Arial", 11, "bold"),
        fg="#2E7D32",
    ).pack(pady=10)

    frame_form = tk.Frame(janela_novo)
    frame_form.pack(pady=5)

    tk.Label(frame_form, text="Categoria:", font=("Arial", 10)).grid(
        row=0, column=0, sticky="w", padx=5, pady=5
    )
    categorias_disponiveis = list(self.menu.keys())
    combo_cat = ttk.Combobox(
        frame_form,
        values=categorias_disponiveis,
        width=22,
        state="readonly",
        font=("Arial", 10),
    )
    combo_cat.grid(row=0, column=1, padx=5, pady=5)
    if categorias_disponiveis:
      combo_cat.current(0)

    tk.Label(frame_form, text="Nome do Artigo:", font=("Arial", 10)).grid(
        row=1, column=0, sticky="w", padx=5, pady=5
    )
    ent_nome = tk.Entry(frame_form, width=24, font=("Arial", 10))
    ent_nome.grid(row=1, column=1, padx=5, pady=5)

    tk.Label(frame_form, text="Preço (€):", font=("Arial", 10)).grid(
        row=2, column=0, sticky="w", padx=5, pady=5
    )
    ent_preco = tk.Entry(frame_form, width=24, font=("Arial", 10))
    ent_preco.grid(row=2, column=1, padx=5, pady=5)

    def confirmar_criacao():
      categoria = combo_cat.get()
      nome = ent_nome.get().strip()

      if not nome:
        messagebox.showerror(
            "Erro", "O nome do artigo não pode estar vazio.", parent=janela_novo
        )
        return

      try:
        preco = float(ent_preco.get().replace(",", "."))
        if preco < 0:
          raise ValueError()
      except ValueError:
        messagebox.showerror(
            "Erro", "Introduza um preço válido (ex: 2.50).", parent=janela_novo
        )
        return

      # Remover o artigo de qualquer outra categoria caso já exista (para evitar duplicados ou conflitos)
      for cat in self.menu:
        if nome in self.menu[cat]:
          del self.menu[cat][nome]

      # Adicionar na categoria selecionada
      self.menu[categoria][nome] = preco

      if nome not in self.stock:
        self.stock[nome] = 100

      self.guardar_stock()
      self.guardar_menu()
      self.abreviaturas[nome] = nome[:16] if len(nome) > 16 else nome

      messagebox.showinfo(
          "Sucesso",
          f"Artigo '{nome}' atualizado/adicionado com sucesso!",
          parent=janela_novo,
      )
      janela_novo.destroy()

      for widget in self.root.winfo_children():
        widget.destroy()
      self.imagens_tkinter = {}
      self.garantir_pasta_icones()
      self.criar_interface()

    tk.Button(
        janela_novo,
        text="Guardar Artigo",
        bg="#4CAF50",
        fg="white",
        font=("Arial", 10, "bold"),
        width=20,
        height=2,
        command=confirmar_criacao,
    ).pack(pady=20)

  # --- ALTERAR PREÇO DE UM ARTIGO EXISTENTE ---
  def alterar_preco_artigo(self):
    janela_preco = tk.Toplevel(self.root)
    janela_preco.title("Alterar Preço de Artigo")
    janela_preco.geometry("450x380")

    tk.Label(
        janela_preco,
        text="ALTERAR PREÇO DE ARTIGO",
        font=("Arial", 11, "bold"),
        fg="#1565C0",
    ).pack(pady=10)

    lista_artigos = []
    artigos_info = {}
    for cat, prods in self.menu.items():
      for art, prc in prods.items():
        texto_item = f"{art} ({cat} - {prc:.2f}€)"
        lista_artigos.append(texto_item)
        artigos_info[texto_item] = (cat, art)

    frame_form = tk.Frame(janela_preco)
    frame_form.pack(pady=5)

    tk.Label(frame_form, text="Selecionar Artigo:", font=("Arial", 10)).grid(
        row=0, column=0, sticky="w", padx=5, pady=5
    )
    combo_artigos = ttk.Combobox(
        frame_form,
        values=lista_artigos,
        width=32,
        state="readonly",
        font=("Arial", 9),
    )
    combo_artigos.grid(row=0, column=1, padx=5, pady=5)
    if lista_artigos:
      combo_artigos.current(0)

    tk.Label(frame_form, text="Novo Preço (€):", font=("Arial", 10)).grid(
        row=1, column=0, sticky="w", padx=5, pady=5
    )
    ent_novo_preco = tk.Entry(frame_form, width=15, font=("Arial", 10))
    ent_novo_preco.grid(row=1, column=1, sticky="w", padx=5, pady=5)

    def confirmar_alteracao_preco():
      selecao = combo_artigos.get()
      if not selecao:
        messagebox.showwarning("Aviso", "Selecione um artigo.", parent=janela_preco)
        return

      cat, art = artigos_info[selecao]
      try:
        novo_p = float(ent_novo_preco.get().replace(",", "."))
        if novo_p < 0:
          raise ValueError()
      except ValueError:
        messagebox.showerror(
            "Erro", "Introduza um preço válido (ex: 5.50).", parent=janela_preco
        )
        return

      self.menu[cat][art] = novo_p
      self.guardar_menu()
      messagebox.showinfo(
          "Sucesso",
          f"O preço de '{art}' foi alterado para {novo_p:.2f}€!",
          parent=janela_preco,
      )
      janela_preco.destroy()

      for widget in self.root.winfo_children():
        widget.destroy()
      self.imagens_tkinter = {}
      self.criar_interface()

    tk.Button(
        janela_preco,
        text="Atualizar Preço",
        bg="#1565C0",
        fg="white",
        font=("Arial", 10, "bold"),
        width=20,
        height=2,
        command=confirmar_alteracao_preco,
    ).pack(pady=20)

  def registar_perda(self):
    janela_perda = tk.Toplevel(self.root)
    janela_perda.title("Registar Perda / Quebra de Stock")
    janela_perda.geometry("400x320")

    tk.Label(
        janela_perda,
        text="REGISTAR PERDA / QUEBRA",
        font=("Arial", 11, "bold"),
        fg="#D32F2F",
    ).pack(pady=10)
    tk.Label(
        janela_perda,
        text="Selecione o artigo e a quantidade perdida:",
        font=("Arial", 9),
    ).pack(pady=2)

    lista_artigos = []
    for prods in self.menu.values():
      lista_artigos.extend(list(prods.keys()))

    frame_selecao = tk.Frame(janela_perda)
    frame_selecao.pack(pady=10)

    tk.Label(frame_selecao, text="Artigo:").grid(
        row=0, column=0, sticky="w", padx=5, pady=5
    )
    combo_artigos = ttk.Combobox(
        frame_selecao,
        values=lista_artigos,
        width=28,
        state="readonly",
        font=("Arial", 10),
    )
    combo_artigos.grid(row=0, column=1, padx=5, pady=5)
    if lista_artigos:
      combo_artigos.current(0)

    tk.Label(frame_selecao, text="Quantidade:").grid(
        row=1, column=0, sticky="w", padx=5, pady=5
    )
    ent_qtd_perda = tk.Entry(frame_selecao, width=10, font=("Arial", 10))
    ent_qtd_perda.insert(0, "1")
    ent_qtd_perda.grid(row=1, column=1, sticky="w", padx=5, pady=5)

    def confirmar_perda():
      artigo = combo_artigos.get()
      try:
        qtd = int(ent_qtd_perda.get())
        if qtd <= 0:
          raise ValueError()
      except ValueError:
        messagebox.showerror(
            "Erro",
            "Introduza uma quantidade válida superior a 0.",
            parent=janela_perda,
        )
        return

      stock_atual = self.stock.get(artigo, 0)
      if qtd > stock_atual:
        continuar = messagebox.askyesno(
            "Aviso",
            f"A quantidade a abater ({qtd}) é superior ao stock atual"
            f" ({stock_atual}). Deseja continuar mesmo assim?",
            parent=janela_perda,
        )
        if not continuar:
          return

      self.stock[artigo] = stock_atual - qtd
      self.guardar_stock()

      messagebox.showinfo(
          "Sucesso",
          f"Registada a perda de {qtd}x '{artigo}'.\nStock atualizado.",
          parent=janela_perda,
      )
      janela_perda.destroy()

    tk.Button(
        janela_perda,
        text="Confirmar Perda",
        bg="#D32F2F",
        fg="white",
        font=("Arial", 10, "bold"),
        width=20,
        height=2,
        command=confirmar_perda,
    ).pack(pady=20)

  def anular_pedido(self):
    if not self.historico_pedidos:
      messagebox.showinfo(
          "Informação", "Não existem pedidos registados para anular."
      )
      return

    codigo = simpledialog.askstring(
        "Segurança", "Insira o código de segurança para anular:", show="*"
    )
    if codigo is None:
      return
    if codigo != "120606":
      messagebox.showerror("Acesso Negado", "Código de segurança incorreto!")
      return

    janela_anular = tk.Toplevel(self.root)
    janela_anular.title("Anular Pedido")
    janela_anular.geometry("450x400")

    tk.Label(
        janela_anular,
        text="SELECIONE O PEDIDO A ANULAR",
        font=("Arial", 11, "bold"),
        fg="#C62828",
    ).pack(pady=10)

    frame_lista = tk.Frame(janela_anular)
    frame_lista.pack(padx=10, pady=5, fill="both", expand=True)

    scrollbar = tk.Scrollbar(frame_lista)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    listbox = tk.Listbox(
        frame_lista,
        font=("Courier", 10),
        height=12,
        width=50,
        yscrollcommand=scrollbar.set,
    )
    listbox.pack(side=tk.LEFT, fill="both", expand=True)
    scrollbar.config(command=listbox.yview)

    for p in self.historico_pedidos:
      tipo = "[OFE]" if p["eh_oferta"] else "[VEN]"
      texto_linha = (
          f"Pedido #{p['num']:03d} | Hora: {p['hora']} | Total:"
          f" {p['total_cobrado']:.2f}€ {tipo}"
      )
      listbox.insert(tk.END, texto_linha)

    def confirmar_anulacao():
      selecao = listbox.curselection()
      if not selecao:
        messagebox.showwarning(
            "Aviso", "Selecione um pedido da lista.", parent=janela_anular
        )
        return

      idx = selecao[0]
      pedido_selecionado = self.historico_pedidos[idx]

      confirmar = messagebox.askyesno(
          "Confirmar Anulação",
          f"Tem a certeza que deseja ANULAR o Pedido"
          f" #{pedido_selecionado['num']:03d}?\n\nEsta ação repõe o stock e"
          " retira o valor das vendas do dia.",
          parent=janela_anular,
      )
      if not confirmar:
        return

      for item, preco in pedido_selecionado["itens"]:
        if item in self.stock:
          self.stock[item] += 1
      self.guardar_stock()

      pedido_selecionado["eh_anulado"] = True
      pedido_selecionado["total_cobrado"] = 0.00
      pedido_selecionado["total_real"] = 0.00

      self.guardar_dados_sessao()

      try:
        talao_anulacao = self.gerar_texto_talao_anulacao(pedido_selecionado)
        with open(
            "talao_anulado_temp.txt", "w", encoding="cp850", errors="ignore"
        ) as f:
          f.write(talao_anulacao)
        subprocess.run(["notepad.exe", "/p", "talao_anulado_temp.txt"], check=True)
      except Exception:
        pass

      messagebox.showinfo(
          "Sucesso",
          f"O Pedido #{pedido_selecionado['num']:03d} foi anulado com"
          " sucesso.\nStock reposto.",
          parent=janela_anular,
      )
      janela_anular.destroy()

    tk.Button(
        janela_anular,
        text="Anular Pedido Selecionado",
        bg="#C62828",
        fg="white",
        font=("Arial", 10, "bold"),
        height=2,
        command=confirmar_anulacao,
    ).pack(pady=15)

  def gerar_texto_talao_anulacao(self, pedido):
    agora = datetime.now().strftime("%d/%m/%y %H:%M")
    texto = "================================\n"
    texto += f"{'*** ANULACAO DE PEDIDO ***':^32}\n"
    texto += f"{'Papa Bolotas':^32}\n"
    texto += "================================\n\n"
    texto += f"Pedido Original: #{pedido['num']:03d}\n"
    texto += f"Data Anulacao:   {agora}\n"
    texto += "--------------------------------\n"
    texto += "ITENS ANULADOS E STOCK REPOSTO:\n\n"

    for item, preco in pedido["itens"]:
      nome_curto = self.abreviaturas.get(item, item)
      texto += f"1x {nome_curto}\n"

    texto += "--------------------------------\n"
    texto += f"VALOR DEVOLVIDO: {pedido['total_cobrado']:.2f}EUR\n"
    texto += "================================\n\n\n\n\n\n\n"
    return texto

  def carregar_dados_guardados(self):
    if os.path.exists(self.ficheiro_dados):
      try:
        with open(self.ficheiro_dados, "r", encoding="utf-8") as f:
          dados = json.load(f)
          self.inicio_sessao = dados.get("inicio_sessao", self.inicio_sessao)
          self.pedido_num = dados.get("pedido_num", 1)
          self.historico_pedidos = dados.get("historico_pedidos", [])
      except Exception:
        pass

  def guardar_dados_sessao(self):
    dados = {
        "inicio_sessao": self.inicio_sessao,
        "pedido_num": self.pedido_num,
        "historico_pedidos": self.historico_pedidos,
    }
    try:
      with open(self.ficheiro_dados, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    except Exception as e:
      print(f"Erro ao guardar dados: {e}")

  def estilar_interface(self):
    style = ttk.Style()
    style.theme_use("default")
    style.configure("TNotebook.Tab", font=("Arial", 11, "bold"), padding=[10, 8])
    style.map(
        "TNotebook.Tab",
        background=[("selected", "#4CAF50")],
        foreground=[("selected", "#ffffff")],
    )

  def gerar_nome_icone(self, nome_item):
    nome_limpo = (
        nome_item.lower()
        .replace(" ", "_")
        .replace(",", "")
        .replace("/", "")
        .replace("á", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("(", "")
        .replace(")", "")
        .replace("ú", "u")
        .replace("ç", "c")
        .replace(".", "")
    )
    return f"{nome_limpo}.png"

  def garantir_pasta_icones(self):
    if not os.path.exists("icones"):
      os.makedirs("icones")

    if not PIL_DISPONIVEL:
      return

    cores_categoria = {
        "Sandes": "#E57373",
        "Tábuas": "#8D6E63",
        "Batatas": "#FFB74D",
        "Doces": "#BA68C8",
        "Bebidas": "#64B5F6",
    }

    for categoria, produtos in self.menu.items():
      cor_fundo = cores_categoria.get(categoria, "#78909C")
      for item in produtos.keys():
        img_nome = self.gerar_nome_icone(item)
        caminho = os.path.join("icones", img_nome)

        if not os.path.exists(caminho):
          img = Image.new("RGB", (120, 60), color=cor_fundo)
          d = ImageDraw.Draw(img)
          texto_formatado = item.replace(" ", "\n", 2)
          d.text((5, 5), texto_formatado, fill=(255, 255, 255))
          img.save(caminho)

  def carregar_e_converter_icone(self, nome_item):
    if not PIL_DISPONIVEL:
      return None

    img_nome = self.gerar_nome_icone(nome_item)
    caminho = os.path.join("icones", img_nome)

    if os.path.exists(caminho):
      try:
        pil_image = Image.open(caminho)
        return ImageTk.PhotoImage(pil_image)
      except Exception:
        return None
    return None

  def criar_interface(self):
    main_container = tk.Frame(self.root)
    main_container.pack(fill="both", expand=True, padx=10, pady=10)
    main_container.rowconfigure(0, weight=1)
    main_container.columnconfigure(0, weight=3)
    main_container.columnconfigure(1, weight=1)

    # --- LADO ESQUERDO: MENU ---
    frame_esquerdo = tk.Frame(main_container)
    frame_esquerdo.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
    frame_esquerdo.rowconfigure(1, weight=1)
    frame_esquerdo.columnconfigure(0, weight=1)

    tk.Label(
        frame_esquerdo, text="Papa Bolotas - MENU", font=("Arial", 14, "bold")
    ).grid(row=0, column=0, sticky="w", pady=(0, 5))

    notebook = ttk.Notebook(frame_esquerdo)
    notebook.grid(row=1, column=0, sticky="nsew")

    for categoria, produtos in self.menu.items():
      container_aba = tk.Frame(notebook, bg="#f9f9f9")
      notebook.add(container_aba, text=f" {categoria.upper()} ")
      container_aba.rowconfigure(0, weight=1)
      container_aba.columnconfigure(0, weight=1)

      canvas = tk.Canvas(container_aba, bg="#f9f9f9", highlightthickness=0)
      scrollbar_aba = ttk.Scrollbar(
          container_aba, orient="vertical", command=canvas.yview
      )
      frame_aba = tk.Frame(canvas, bg="#f9f9f9")

      # Grelha fluida dinâmica: 4 colunas expansíveis que preenchem o espaço todo
      for col_idx in range(4):
        frame_aba.columnconfigure(col_idx, weight=1)

      frame_aba.bind(
          "<Configure>",
          lambda e, c=canvas: c.configure(scrollregion=c.bbox("all")),
      )
      canvas.create_window((0, 0), window=frame_aba, anchor="nw")
      canvas.configure(yscrollcommand=scrollbar_aba.set)

      canvas.grid(row=0, column=0, sticky="nsew")
      scrollbar_aba.grid(row=0, column=1, sticky="ns")

      max_cols = 4
      row = 0
      col = 0

      for item, preco in produtos.items():
        texto_botao = f"{item}\n({preco:.2f}€)"
        tk_image = self.carregar_e_converter_icone(item)
        cmd_click = lambda i=item, p=preco: self.selecionar_e_adicionar_item(
            i, p
        )

        if tk_image:
          self.imagens_tkinter[item] = tk_image
          btn = tk.Button(
              frame_aba,
              text=texto_botao,
              image=tk_image,
              compound="top",
              font=("Arial", 9, "bold"),
              height=85,
              bg="#ffffff",
              command=cmd_click,
          )
        else:
          btn = tk.Button(
              frame_aba,
              text=texto_botao,
              font=("Arial", 9, "bold"),
              height=4,
              bg="#f0f0f0",
              command=cmd_click,
          )

        btn.grid(row=row, column=col, padx=4, pady=4, sticky="nsew")
        col += 1
        if col >= max_cols:
          col = 0
          row += 1

    # --- LADO DIREITO: PEDIDO E AÇÕES ---
    frame_direito = tk.Frame(
        main_container, bg="#f0f0f0", bd=2, relief="groove"
    )
    frame_direito.grid(row=0, column=1, sticky="nsew", padx=(10, 0))
    frame_direito.rowconfigure(2, weight=1)
    frame_direito.columnconfigure(0, weight=1)

    tk.Label(
        frame_direito, text="PEDIDO ATUAL", font=("Arial", 13, "bold"), bg="#f0f0f0"
    ).grid(row=0, column=0, pady=8)

    frame_obs = tk.Frame(frame_direito, bg="#f0f0f0")
    frame_obs.grid(row=1, column=0, sticky="ew", padx=10, pady=2)
    tk.Label(
        frame_obs, text="Observações:", font=("Arial", 9, "bold"), bg="#f0f0f0"
    ).pack(anchor="w")
    self.ent_obs = tk.Entry(frame_obs, font=("Arial", 10))
    self.ent_obs.pack(fill="x", pady=2)

    frame_lista = tk.Frame(frame_direito)
    frame_lista.grid(row=2, column=0, sticky="nsew", padx=10, pady=5)
    frame_lista.rowconfigure(0, weight=1)
    frame_lista.columnconfigure(0, weight=1)

    scrollbar = tk.Scrollbar(frame_lista)
    scrollbar.grid(row=0, column=1, sticky="ns")

    self.txt_resumo = tk.Text(
        frame_lista,
        height=6,
        width=38,
        font=("Courier", 9, "bold"),
        yscrollcommand=scrollbar.set,
    )
    self.txt_resumo.grid(row=0, column=0, sticky="nsew")
    scrollbar.config(command=self.txt_resumo.yview)

    self.lbl_total = tk.Label(
        frame_direito,
        text="Total: 0.00 €",
        font=("Arial", 14, "bold"),
        fg="green",
        bg="#f0f0f0",
    )
    self.lbl_total.grid(row=3, column=0, pady=4)

    # --- FRAME DE AÇÕES DO LADO DIREITO (ESTRITAMENTE 2 POR LINHA) ---
    frame_acoes = tk.Frame(frame_direito, bg="#f0f0f0")
    frame_acoes.grid(row=4, column=0, sticky="ew", pady=5, padx=10)
    frame_acoes.columnconfigure(0, weight=1)
    frame_acoes.columnconfigure(1, weight=1)

    def criar_botao_acao(parent, texto, cor_bg, comando, linha, coluna=0, span=1):
      btn = tk.Button(
          parent,
          text=texto,
          bg=cor_bg,
          fg="white",
          font=("Arial", 8, "bold"),
          height=2,
          command=comando,
      )
      btn.grid(
          row=linha,
          column=coluna,
          columnspan=span,
          sticky="nsew",
          padx=2,
          pady=2,
      )
      return btn

    # Linha 0: Registar e Oferta
    criar_botao_acao(
        frame_acoes,
        "Registar Pedido",
        "#4CAF50",
        lambda: self.imprimir_pedido(eh_oferta=False),
        0,
        0,
    )
    criar_botao_acao(
        frame_acoes,
        "Oferta (0€)",
        "#2196F3",
        lambda: self.imprimir_pedido(eh_oferta=True),
        0,
        1,
    )

    # Linha 1: Remover e Limpar
    criar_botao_acao(
        frame_acoes,
        "Remover Último",
        "#FF9800",
        self.remover_ultimo_item,
        1,
        0,
    )
    criar_botao_acao(
        frame_acoes, "Limpar Tudo", "#f44336", self.limpar_carrinho, 1, 1
    )

    # Linha 2: Vendas e Fechar Dia
    criar_botao_acao(
        frame_acoes, "Vendas (Rel. X)", "#00897B", self.ver_vendas_atuais, 2, 0
    )
    criar_botao_acao(
        frame_acoes, "FECHAR DIA (Rel. Z)", "#673AB7", self.fechar_sessao, 2, 1
    )

    # Linhas seguintes: Organizadas estritamente em pares (2 botões por linha) para poupar espaço vertical
    botoes_pares = [
        ("Reimprimir Talão", "#607D8B", self.reimprimir_ultimo_talao),
        ("📦 Gestão Stock", "#FF5722", self.gerir_stock),
        ("➕ Novo Artigo", "#009688", self.adicionar_novo_artigo),
        ("✏️ Alterar Preço", "#1565C0", self.alterar_preco_artigo),
        ("⚠ Registar Perda", "#E91E63", self.registar_perda),
        ("🚫 Anular Pedido", "#C62828", self.anular_pedido),
    ]

    for i, (texto, cor, cmd) in enumerate(botoes_pares):
      linha = 3 + (i // 2)
      coluna = i % 2
      criar_botao_acao(frame_acoes, texto, cor, cmd, linha, coluna=coluna, span=1)

  def selecionar_e_adicionar_item(self, item, preco_padrao):
    qtd_no_carrinho = sum(1 for i, p in self.carrinho if i == item)
    stock_atual = self.stock.get(item, 0)

    if qtd_no_carrinho >= stock_atual:
      messagebox.showwarning(
          "⚠️ Stock Esgotado",
          f"O stock de '{item}' está a zero ou não é suficiente.\n\nVá a"
          " 'Gestão de Stock' para dar entrada de mais quantidade.",
      )
      return

    novo_preco = simpledialog.askfloat(
        "Preço do Artigo",
        f"Confirme ou altere o preço para:\n{item}",
        initialvalue=preco_padrao,
        minvalue=0.0,
    )
    if novo_preco is not None:
      self.carrinho.append((item, novo_preco))
      self.atualizar_resumo()

  def remover_ultimo_item(self):
    if self.carrinho:
      self.carrinho.pop()
      self.atualizar_resumo()

  def limpar_carrinho(self):
    self.carrinho = []
    self.ent_obs.delete(0, tk.END)
    self.atualizar_resumo()

  def obter_itens_agrupados(self):
    agrupados = {}
    for item, preco in self.carrinho:
      chave = (item, preco)
      if chave in agrupados:
        agrupados[chave]["qtd"] += 1
        agrupados[chave]["total"] += preco
      else:
        agrupados[chave] = {"qtd": 1, "preco_unit": preco, "total": preco}
    return agrupados

  def atualizar_resumo(self):
    self.txt_resumo.delete("1.0", tk.END)
    total = sum(preco for _, preco in self.carrinho)
    agrupados = self.obter_itens_agrupados()

    for (item, preco), dados in agrupados.items():
      qtd = dados["qtd"]
      subtotal = dados["total"]
      nome_curto = self.abreviaturas.get(item, item)
      texto_item = f"{qtd}x {nome_curto}"
      if len(texto_item) > 25:
        texto_item = texto_item[:25]
      self.txt_resumo.insert(tk.END, f"{texto_item:<25} {subtotal:>6.2f}€\n")

    self.txt_resumo.see(tk.END)
    self.lbl_total.config(text=f"Total: {total:.2f} €")

  def gerar_texto_talao(self, via, eh_oferta=False):
    agora = datetime.now().strftime("%d/%m/%y %H:%M")
    obs = self.ent_obs.get().strip()

    cabecalho = f"Papa Bolotas - {via}"
    texto = "================================\n"
    texto += f"{cabecalho:^32}\n"
    if eh_oferta:
      texto += f"{'*** OFERTA / INTERNO ***':^32}\n"
    texto += "================================\n\n"

    texto += f"{'PEDIDO N.o':^32}\n\n"
    num_str = f">>> # {self.pedido_num:03d} <<<"
    texto += f"{num_str:^32}\n\n"
    texto += "================================\n"
    texto += f"Data/Hora: {agora}\n"
    texto += "--------------------------------\n"

    agrupados = self.obter_itens_agrupados()
    for (item_original, preco), dados in agrupados.items():
      qtd = dados["qtd"]
      subtotal = 0.00 if eh_oferta else dados["total"]
      nome_curto = self.abreviaturas.get(item_original, item_original)

      item_str = f"{qtd}x {nome_curto}"
      preco_str = f"{subtotal:>6.2f}EUR"

      espacos = 32 - len(item_str) - len(preco_str)

      if espacos >= 1:
        texto += f"{item_str}{' ' * espacos}{preco_str}\n"
      else:
        texto += f"{item_str}\n"
        texto += f"{preco_str:>32}\n"

    if obs:
      texto += "--------------------------------\n"
      obs_formatado = f"OBS: {obs.upper()}"
      if len(obs_formatado) > 32:
        obs_formatado = obs_formatado[:32]
      texto += f"{obs_formatado}\n"

    total_final = (
        0.00 if eh_oferta else sum(preco for _, preco in self.carrinho)
    )
    texto += "--------------------------------\n"
    label_total = "TOTAL:"
    val_total = f"{total_final:>6.2f}EUR"
    espacos_tot = 32 - len(label_total) - len(val_total)
    texto += f"{label_total}{' ' * espacos_tot}{val_total}\n"
    if eh_oferta:
      texto += f"{'(DESCONTO 100% - 0.00EUR)':^32}\n"

    texto += "================================\n\n\n\n\n\n\n\n"
    return texto

  def gerar_texto_talao_historico(self, via, pedido):
    obs = pedido.get("obs", "")
    eh_oferta = pedido["eh_oferta"]

    cabecalho = f"Papa Bolotas - {via}"
    texto = "================================\n"
    texto += f"{cabecalho:^32}\n"
    texto += f"{'*** REIMPRESSAO ***':^32}\n"
    if eh_oferta:
      texto += f"{'*** OFERTA / INTERNO ***':^32}\n"
    texto += "================================\n\n"

    texto += f"{'PEDIDO N.o':^32}\n\n"
    num_str = f">>> # {pedido['num']:03d} <<<"
    texto += f"{num_str:^32}\n\n"
    texto += "================================\n"
    texto += f"Hora Original: {pedido['hora']}\n"
    texto += "--------------------------------\n"

    agrupados = {}
    for item, preco in pedido["itens"]:
      chave = (item, preco)
      if chave in agrupados:
        agrupados[chave]["qtd"] += 1
        agrupados[chave]["total"] += preco
      else:
        agrupados[chave] = {"qtd": 1, "preco_unit": preco, "total": preco}

    for (item_original, preco), dados in agrupados.items():
      qtd = dados["qtd"]
      subtotal = 0.00 if eh_oferta else dados["total"]
      nome_curto = self.abreviaturas.get(item_original, item_original)

      item_str = f"{qtd}x {nome_curto}"
      preco_str = f"{subtotal:>6.2f}EUR"

      espacos = 32 - len(item_str) - len(preco_str)
      if espacos >= 1:
        texto += f"{item_str}{' ' * espacos}{preco_str}\n"
      else:
        texto += f"{item_str}\n"
        texto += f"{preco_str:>32}\n"

    if obs:
      texto += "--------------------------------\n"
      obs_formatado = f"OBS: {obs.upper()}"
      if len(obs_formatado) > 32:
        obs_formatado = obs_formatado[:32]
      texto += f"{obs_formatado}\n"

    total_final = pedido["total_cobrado"]
    texto += "--------------------------------\n"
    label_total = "TOTAL:"
    val_total = f"{total_final:>6.2f}EUR"
    espacos_tot = 32 - len(label_total) - len(val_total)
    texto += f"{label_total}{' ' * espacos_tot}{val_total}\n"
    if eh_oferta:
      texto += f"{'(DESCONTO 100% - 0.00EUR)':^32}\n"

    texto += "================================\n\n\n\n\n\n\n\n"
    return texto

  def imprimir_pedido(self, eh_oferta=False):
    if not self.carrinho:
      messagebox.showwarning("Aviso", "O pedido está vazio!")
      return

    deseja_imprimir = messagebox.askyesno(
        "Imprimir Talão",
        f"Pedido #{self.pedido_num:03d} registado com sucesso.\n\nDeseja"
        " IMPRIMIR os talões em papel?",
    )

    try:
      agora = datetime.now().strftime("%H:%M:%S")
      total_real = sum(preco for _, preco in self.carrinho)
      total_cobrado = 0.00 if eh_oferta else total_real

      self.historico_pedidos.append({
          "num": self.pedido_num,
          "hora": agora,
          "itens": list(self.carrinho),
          "total_real": total_real,
          "total_cobrado": total_cobrado,
          "eh_oferta": eh_oferta,
          "obs": self.ent_obs.get().strip(),
          "eh_anulado": False,
      })

      for item, preco in self.carrinho:
        if item in self.stock:
          self.stock[item] -= 1
      self.guardar_stock()

      if deseja_imprimir:
        talao_cozinha = self.gerar_texto_talao("VIA COZINHA", eh_oferta=eh_oferta)
        with open("talao_temp1.txt", "w", encoding="cp850", errors="ignore") as f:
          f.write(talao_cozinha)
        subprocess.run(["notepad.exe", "/p", "talao_temp1.txt"], check=True)

        time.sleep(1.5)

        talao_cliente = self.gerar_texto_talao("VIA CLIENTE", eh_oferta=eh_oferta)
        with open("talao_temp2.txt", "w", encoding="cp850", errors="ignore") as f:
          f.write(talao_cliente)
        subprocess.run(["notepad.exe", "/p", "talao_temp2.txt"], check=True)

      self.pedido_num += 1
      self.limpar_carrinho()
      self.guardar_dados_sessao()

    except Exception as e:
      messagebox.showerror(
          "Erro de Impressão",
          f"O pedido foi gravado, mas ocorreu um erro ao imprimir: {e}",
      )

  def reimprimir_ultimo_talao(self):
    if not self.historico_pedidos:
      messagebox.showwarning(
          "Aviso", "Não há pedidos no histórico para reimprimir!"
      )
      return

    ultimo_pedido = self.historico_pedidos[-1]
    confirmar = messagebox.askyesno(
        "Reimprimir",
        f"Deseja reimprimir o último pedido (Pedido #{ultimo_pedido['num']:03d})?",
    )

    if confirmar:
      try:
        talao_cozinha = self.gerar_texto_talao_historico(
            "VIA COZINHA", ultimo_pedido
        )
        with open("talao_temp1.txt", "w", encoding="cp850", errors="ignore") as f:
          f.write(talao_cozinha)
        subprocess.run(["notepad.exe", "/p", "talao_temp1.txt"], check=True)

        time.sleep(1.5)

        talao_cliente = self.gerar_texto_talao_historico(
            "VIA CLIENTE", ultimo_pedido
        )
        with open("talao_temp2.txt", "w", encoding="cp850", errors="ignore") as f:
          f.write(talao_cliente)
        subprocess.run(["notepad.exe", "/p", "talao_temp2.txt"], check=True)

        messagebox.showinfo(
            "Sucesso",
            f"O pedido #{ultimo_pedido['num']:03d} foi enviado para a impressora.",
        )
      except Exception as e:
        messagebox.showerror(
            "Erro de Impressão", f"Ocorreu um erro ao tentar reimprimir: {e}"
        )

  def gerar_relatorio_texto(self, titulo="RELATÓRIO DE SESSÃO"):
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")

    pedidos_validos = [
        p for p in self.historico_pedidos if not p.get("eh_anulado", False)
    ]

    total_faturado = sum(p["total_cobrado"] for p in pedidos_validos)
    total_ofertas = sum(
        p["total_real"] for p in pedidos_validos if p["eh_oferta"]
    )
    qtd_pedidos = len(pedidos_validos)

    todos_itens = []
    for p in pedidos_validos:
      for item, _ in p["itens"]:
        todos_itens.append(self.abreviaturas.get(item, item))
    contagem_artigos = Counter(todos_itens)

    texto = "================================\n"
    texto += f"{titulo:^32}\n"
    texto += f"{'Papa Bolotas POS':^32}\n"
    texto += "================================\n"
    texto += f"Abertura: {self.inicio_sessao}\n"
    texto += f"Consulta: {agora}\n"
    texto += "--------------------------------\n"
    texto += "ARTIGOS VENDIDOS:\n\n"
    for artigo, qtd in contagem_artigos.most_common():
      texto += f"{qtd:>2}x  {artigo}\n"
    texto += "--------------------------------\n"
    texto += "RESUMO PEDIDOS:\n"
    for p in self.historico_pedidos:
      if p.get("eh_anulado", False):
        ped_str = f"#{p['num']:03d} [ANULADO]"
        val_str = f"0.00EUR"
      else:
        tipo = "[OFE]" if p["eh_oferta"] else "[VEN]"
        ped_str = f"#{p['num']:03d} ({p['hora']}) {tipo}"
        val_str = f"{p['total_cobrado']:>6.2f}EUR"

      espacos = 32 - len(ped_str) - len(val_str)
      if espacos >= 1:
        texto += f"{ped_str}{' ' * espacos}{val_str}\n"
      else:
        texto += f"{ped_str}\n{val_str:>32}\n"

    texto += "--------------------------------\n"
    texto += f"Pedidos: {qtd_pedidos:>23}\n"
    texto += f"Ofertas: {total_ofertas:>20.2f}EUR\n"
    texto += f"TOTAL:   {total_faturado:>20.2f}EUR\n"
    texto += "================================\n\n\n\n\n"
    return texto

  def ver_vendas_atuais(self):
    if not self.historico_pedidos:
      messagebox.showinfo("Informação", "Ainda não existem pedidos registados.")
      return
    texto_relatorio = self.gerar_relatorio_texto(titulo="CONSULTA PARCIAL (X)")
    janela_x = tk.Toplevel(self.root)
    janela_x.title("Vendas Atuais (X)")
    janela_x.geometry("480x580")
    tk.Label(
        janela_x,
        text="VENDAS ATUAIS (SEM FECHAR SESSÃO)",
        font=("Arial", 11, "bold"),
    ).pack(pady=8)
    txt = tk.Text(janela_x, font=("Courier", 9), height=22, width=50)
    txt.insert(tk.END, texto_relatorio)
    txt.config(state="disabled")
    txt.pack(padx=10, pady=5)

    def imprimir_x():
      try:
        with open(
            "relatorio_x_temp.txt", "w", encoding="cp850", errors="ignore"
        ) as f:
          f.write(texto_relatorio)
        subprocess.run(["notepad.exe", "/p", "relatorio_x_temp.txt"], check=True)
        messagebox.showinfo("Sucesso", "Relatório impresso!")
      except Exception as e:
        messagebox.showerror("Erro", f"Erro: {e}")

    tk.Button(
        janela_x,
        text="Imprimir Cópia em Papel",
        font=("Arial", 10, "bold"),
        bg="#00897B",
        fg="white",
        command=imprimir_x,
    ).pack(pady=8)

  def fechar_sessao(self):
    if not self.historico_pedidos:
      messagebox.showinfo("Informação", "Ainda não existem pedidos registados.")
      return
    confirmar = messagebox.askyesno(
        "Fechar Dia", "Encerrar o dia, gravar o relatório (Z) e imprimir?"
    )
    if not confirmar:
      return

    agora_dt = datetime.now()
    texto_fecho = self.gerar_relatorio_texto(titulo="RELATÓRIO DE FECHO (Z)")
    pedidos_validos = [
        p for p in self.historico_pedidos if not p.get("eh_anulado", False)
    ]
    total_faturado = sum(p["total_cobrado"] for p in pedidos_validos)

    pasta_relatorios = "Relatorios_Fecho"
    if not os.path.exists(pasta_relatorios):
      os.makedirs(pasta_relatorios)
    nome_ficheiro_fecho = agora_dt.strftime("Fecho_%Y-%m-%d_%H-%M.txt")
    caminho_fecho = os.path.join(pasta_relatorios, nome_ficheiro_fecho)

    with open(caminho_fecho, "w", encoding="utf-8") as f:
      f.write(texto_fecho)

    try:
      subprocess.run(["notepad.exe", "/p", caminho_fecho], check=True)
      messagebox.showinfo(
          "Dia Encerrado",
          f"✓ Relatório (Z) gravado e impresso!\n\nTOTAL FATURADO:"
          f" {total_faturado:.2f} €",
      )

      reiniciar = messagebox.askyesno(
          "Reiniciar Pedidos",
          "Reiniciar o número de pedidos para #001 para a próxima sessão?",
      )
      if reiniciar:
        self.pedido_num = 1
        self.historico_pedidos = []
        self.inicio_sessao = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        if os.path.exists(self.ficheiro_dados):
          os.remove(self.ficheiro_dados)

    except Exception as e:
      messagebox.showerror(
          "Erro de Impressão",
          f"O relatório foi guardado, mas ocorreu um erro ao imprimir: {e}",
      )


if __name__ == "__main__":
  root = tk.Tk()
  app = PapaBolotasPOS(root)
  root.mainloop()