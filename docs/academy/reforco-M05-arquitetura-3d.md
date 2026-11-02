---
title: "Módulo 5 · Arquitetura 3D — scaffolds, porosidade e TPMS"
subtitle: "Reforço de aprendizagem · BIA Academy · Quantis Biotechnology"
---

# A geometria interna é um sinal biológico

> **Leitura: 12 min · Nível: intermediário · Ferramenta BIA: Fase 1 · Modelo de tecido / Studio**

## 5 ideias-chave

1. **Porosidade total ≠ tamanho de poro ≠ interconectividade.** Um scaffold pode ter 80 % de vazio e ainda ser inútil se os poros forem fechados. O que a célula "sente" é: tamanho do poro (migração e vascularização), interconexão (nutrição), área de superfície (adesão) e curvatura (sinal mecânico).

2. **Faixas que funcionam:** osso 300–500 µm (vascularização + osteocondução); cartilagem 100–300 µm; pele/derme 50–150 µm; neural 20–100 µm. Abaixo de ~100 µm o oxigênio não chega ao centro; acima de ~600 µm a célula "não vê" as paredes e não forma tecido.

3. **TPMS (gyroid, Schwarz P, Diamond) imitam o trabecular.** Superfícies mínimas triplamente periódicas têm curvatura média zero, interconexão total, grande área superficial e transição suave de tensões — melhor permeabilidade e osteogênese que grades 0/90 para a mesma porosidade (Zadpoor 2015; Castro 2019).

4. **Gradientes são o que o corpo faz.** Osso cortical → esponjoso; cartilagem articular zonal; interface osso-cartilagem. Scaffolds com gradiente de poro/densidade (30 % na base → 60 % no topo) reproduzem isso — e a BIA gera por "sanduíche por camada".

5. **Resolução da bioimpressão limita a arquitetura.** Com agulha 22G (cordão ≈ 0,47 mm) o menor poro honesto é ~0,3 mm (espaçamento 0,8 − largura 0,47). Querer poros de 100 µm com 22G é querer o que a física não dá — use 27G ou mude de técnica (DLP).

## Tabela de bolso — infills da BIA e para que servem

| Infill | Poro | Interconexão | Mecânica | Indicação |
|---|---|---|---|---|
| Rectilinear 0/90 | quadrado, previsível | alta (canais retos) | anisotrópica | osso, cartilagem, testes de printabilidade |
| Grid (0+90 mesma camada) | quadrado | alta | mais rígido | scaffolds que precisam de compressão |
| Gyroid / TPMS | curvo, uniforme | total | isotrópica, boa fadiga | osso trabecular, perfusão |
| Honeycomb | hexagonal | média | alta rigidez/peso | cartilagem, suporte |
| Concêntrico | anéis | baixa em XY | boa em compressão | vasos, córnea, anéis |
| Voronoi / Perlin | irregular, biomimético | alta | variável | trabecular "orgânico", pesquisa |
| Gradiente | variável | alta | graduada | interfaces osteocondrais, pele |

## Faça agora na BIA
- **Fase 1 → Modelo de tecido**: escolha *osso trabecular* → **Studio** gera gyroid 30 % em cubo 10 mm; exporte STL.
- **Fase 3 → BioSlicer** com esse STL: compare o *poro estimado* do rectilinear 35 % vs gyroid 35 %. Troque a agulha para 27G e veja o poro mínimo mudar.
- **Desenhar & Imprimir** → preset *osteocondral*: veja a pilha de camadas com densidade diferente (gradiente).

## Para saber mais
- Zadpoor 2015, *Biomater. Sci.* — bone tissue regeneration: the role of scaffold geometry.
- Karageorgiou & Kaplan 2005, *Biomaterials* — porosity of 3D scaffolds and osteogenesis.
- Castro et al. 2019, *Mater. Des.* — TPMS scaffolds: permeability and mechanics.

---

# Teste de aprendizagem · Módulo 5

*8 questões · nota mínima 70 %*

**1. Um scaffold com 85 % de porosidade mas poros fechados (não interconectados) é:**
- a) Ideal para osso
- b) Inadequado — células do interior não recebem nutrientes ✔
- c) Melhor que um gyroid
- d) Indicado para cartilagem

*Explicação:* interconectividade é o que permite difusão, migração e vascularização; porosidade total sozinha não diz nada.

**2. A faixa de tamanho de poro mais citada para regeneração óssea vascularizada é:**
- a) 5–20 µm
- b) 50–100 µm
- c) 300–500 µm ✔
- d) 1–2 mm

*Explicação:* Karageorgiou & Kaplan 2005: > 300 µm favorece vascularização e osteogênese direta.

**3. A principal vantagem geométrica das superfícies TPMS (gyroid) sobre grades 0/90 é:**
- a) Serem mais fáceis de imprimir
- b) Curvatura suave com interconexão total e distribuição isotrópica de tensões ✔
- c) Poros maiores
- d) Não precisarem de suporte

*Explicação:* curvatura média zero → sem concentradores de tensão; permeabilidade e área superficial altas para a mesma porosidade.

**4. Com agulha 22G (cordão ≈ 0,47 mm) e espaçamento de 0,8 mm, o poro resultante num woodpile 0/90 é aproximadamente:**
- a) 0,8 mm
- b) 0,47 mm
- c) 0,33 mm ✔
- d) 1,27 mm

*Explicação:* poro ≈ espaçamento − largura do cordão = 0,80 − 0,47 = 0,33 mm.

**5. Scaffolds com gradiente de porosidade são indicados para:**
- a) Peças homogêneas de teste
- b) Interfaces entre tecidos (osteocondral, derme-epiderme) ✔
- c) Reduzir tempo de impressão
- d) Evitar reticulação

*Explicação:* reproduzem a transição natural (osso cortical→esponjoso, cartilagem zonal); a BIA gera por faixas de camadas.

**6. Querer poros de 80 µm com agulha 22G por extrusão é:**
- a) Possível aumentando a velocidade
- b) Fisicamente inviável — o cordão é 5× maior que o poro desejado ✔
- c) Possível com fator de extrusão 0,5×
- d) Recomendado para cartilagem

*Explicação:* resolução da extrusão ≈ diâmetro da agulha; para < 100 µm, use agulha ≤ 30G ou técnica por luz (DLP/2-fóton).

**7. Infill concêntrico é mais indicado para:**
- a) Osso trabecular
- b) Geometrias anelares/tubulares (vasos, córnea) ✔
- c) Pele
- d) Esferoides

*Explicação:* anéis seguem o contorno e dão boa compressão radial, mas têm baixa interconexão em XY — ruim para blocos maciços.

**8. "Curvatura" de uma superfície de scaffold influencia a célula porque:**
- a) Muda a cor do material
- b) Altera a tensão do citoesqueleto e a deposição de matriz (mecanotransdução) ✔
- c) Acelera a degradação
- d) Não influencia

*Explicação:* células em superfícies côncavas depositam matriz mais rápido (Rumpler 2008); TPMS exploram isso.
