import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

pdf_path = "Tabela_Precos_Papa_Bolotas.pdf"
doc = SimpleDocTemplate(
    pdf_path,
    pagesize=A4,
    rightMargin=30,
    leftMargin=30,
    topMargin=20,
    bottomMargin=20,
)

story = []
styles = getSampleStyleSheet()

VERDE_ESCURO = colors.HexColor("#1b3622")
CASTANHO = colors.HexColor("#4a2e16")
CINZA_CLARO = colors.HexColor("#f8f9fa")

# Tenta carregar imagem do logo se existir na pasta (png/jpg)
caminhos_possiveis = ["logo.png", "logo.jpg", "logo.jpeg"]
logo_encontrado = None

for caminho in caminhos_possiveis:
  if os.path.exists(caminho):
    logo_encontrado = caminho
    break

if logo_encontrado:
  try:
    img = Image(logo_encontrado, width=130, height=130)
    story.append(img)
    story.append(Spacer(1, 10))
  except Exception: pass

# Estilos de Texto (Sem "Papa Bolotas" no texto, mantendo apenas o título do menu)
style_subtitulo = ParagraphStyle(
    "SubTituloMenu",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=VERDE_ESCURO,
    alignment=1,
)

style_cat = ParagraphStyle(
    "CategoriaHeader",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=13,
    textColor=colors.white,
    alignment=0,
)

style_item = ParagraphStyle(
    "ItemTexto",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9.5,
    leading=12,
    textColor=colors.black,
)

style_preco = ParagraphStyle(
    "PrecoTexto",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9.5,
    leading=12,
    textColor=VERDE_ESCURO,
    alignment=2,
)

story.append(Paragraph("TABELA DE PREÇOS", style_subtitulo))
story.append(Spacer(1, 15))

# Dados Atualizados do Menu (Sem Vinho a Copo)
dados_menu = [
    # SANDES
    [Paragraph("<b>SANDES</b>", style_cat), ""],
    [Paragraph("Sandes de Presunto", style_item), Paragraph("6.00 €", style_preco)],
    [Paragraph("Sandes Presunto e Queijo", style_item), Paragraph("7.00 €", style_preco)],
    [Paragraph("Sandes Presunto e Ovo", style_item), Paragraph("7.00 €", style_preco)],
    [Paragraph("Sandes Presunto, Queijo e Ovo", style_item), Paragraph("8.00 €", style_preco)],
    
    # TÁBUAS & PETISCOS
    [Paragraph("<b>TÁBUAS & PETISCOS</b>", style_cat), ""],
    [Paragraph("Chouriço Assado", style_item), Paragraph("7.00 €", style_preco)],
    [Paragraph("Tábua Alheira", style_item), Paragraph("7.00 €", style_preco)],
    [Paragraph("Tábua Enchidos", style_item), Paragraph("8.00 €", style_preco)],
    [Paragraph("Tábua Presunto e Queijo", style_item), Paragraph("9.00 €", style_preco)],
    [Paragraph("Tábua Presunto e Enchidos", style_item), Paragraph("9.00 €", style_preco)],
    [Paragraph("Tábua Enchidos e Queijo", style_item), Paragraph("9.00 €", style_preco)],
    [Paragraph("Ovos Rotos", style_item), Paragraph("9.00 €", style_preco)],
    [Paragraph("Tábua Presunto", style_item), Paragraph("12.00 €", style_preco)],
    [Paragraph("Tábua Completa", style_item), Paragraph("12.00 €", style_preco)],
    
    # BEBIDAS (Sem Vinho em Copo)
    [Paragraph("<b>BEBIDAS</b>", style_cat), ""],
    [Paragraph("Café", style_item), Paragraph("1.00 €", style_preco)],
    [Paragraph("Água (Lisa)", style_item), Paragraph("1.00 €", style_preco)],
    [Paragraph("Água com Gás", style_item), Paragraph("1.50 €", style_preco)],
    [Paragraph("Cerveja Mini", style_item), Paragraph("1.50 €", style_preco)],
    [Paragraph("Cerveja", style_item), Paragraph("2.00 €", style_preco)],
    [Paragraph("Refrigerantes em Lata (Sumol, Pepsi Zero, Sprite, Guaraná, Ice Tea)", style_item), Paragraph("2.00 €", style_preco)],
    [Paragraph("Champarrião (1 L)", style_item), Paragraph("8.00 €", style_preco)],
    [Paragraph("Champarrião (2 L)", style_item), Paragraph("13.50 €", style_preco)],
    [Paragraph("Vinhos Garrafa (Castiço / Muralhas)", style_item), Paragraph("10.00 €", style_preco)],
    [Paragraph("HITZ (Maracujá / Frutos Vermelhos)", style_item), Paragraph("10.00 €", style_preco)],
]

tabela = Table(dados_menu, colWidths=[380, 120])
tabela_style = TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ("TOPPADDING", (0, 0), (-1, -1), 2.5),
])

row_idx = 0
for item in dados_menu:
  if "<b>" in str(item[0].text):
    tabela_style.add("SPAN", (0, row_idx), (1, row_idx))
    tabela_style.add("BACKGROUND", (0, row_idx), (1, row_idx), VERDE_ESCURO)
    tabela_style.add("BOTTOMPADDING", (0, row_idx), (1, row_idx), 4)
    tabela_style.add("TOPPADDING", (0, row_idx), (1, row_idx), 4)
  else:
    if row_idx % 2 == 0:
      tabela_style.add("BACKGROUND", (0, row_idx), (1, row_idx), CINZA_CLARO)
  row_idx += 1

tabela.setStyle(tabela_style)
story.append(tabela)

doc.build(story)
print("Ficheiro PDF gerado com sucesso: Tabela_Precos_Papa_Bolotas.pdf")