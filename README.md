# Calculadora de Performance — MindSight

Simulador de funil (Investimento → Leads → MQLs → Agendamentos → Comparecimentos → Vendas) com
KPIs de Faturamento, CAC e ROAS, funil 3D interativo e comparação de cenários. 100% client-side.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build estático (dist/)
npm test         # testes das fórmulas
```

## Deploy (VPS com Docker)

O `Dockerfile` faz o build em Node 22 e serve o site estático com nginx (porta **80**, ~75 MB).
No painel da VPS: fonte **Github** → repositório `CalculadoraDePerfomance`, ramo `main`, caminho de build `/`,
construção **Dockerfile**, porta do domínio **80**. Teste local:

```bash
docker build -t mindsight-calc .
docker run --rm -p 8080:80 mindsight-calc   # http://localhost:8080
```

`nginx.conf`: gzip, cache imutável em `/assets/`, `index.html` sem cache, fallback de SPA e `/healthz`
(usado pelo `HEALTHCHECK`).

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/lib/calculations.ts` | Fórmulas puras (funil, KPIs, dica de performance) — testadas em `calculations.test.ts` |
| `src/store/` | Zustand: inputs, taxas, último resultado válido, cenário otimizado, tema |
| `src/components/funnel-3d/` | Cena react-three-fiber isolada (geometria, tween, partículas, cena, canvas) |
| `src/components/funnel-2d/` | Fallback 2D (sem WebGL / `prefers-reduced-motion`) |
| `src/components/ui/` | Input, slider, KPI card, toggle de tema, painel/accordion, barras do logo |
| `src/index.css` | Tokens do design system MindSight (light/dark) como CSS vars + tema Tailwind |

## Decisões de implementação

- **Taxas** são percentuais 0–100. **Contagens do funil são sempre inteiras**: cada etapa trunca
  (não arredonda) o resultado da etapa anterior × taxa antes de alimentar a próxima — nunca existe
  "4,1 comparecimentos" ou "0,4 vendas", mesmo com taxas fracionárias. **Sem pelo menos 1 venda
  completa, o Faturamento (e a receita de consultas) é R$ 0**, em vez de um valor fracionário; com
  1+ venda, o Faturamento já sai proporcional a elas (vendas inteiro × ticket). `breakEvenCpl` é a
  exceção: é uma aproximação algébrica contínua, usada só como referência teórica no gráfico de
  ROAS — em baixo volume o ROAS real nesse CPL fica um pouco abaixo de 1x por causa do truncamento.
- **Entrada inválida** (CPL = 0, campo vazio etc.): o store mantém o último resultado válido, então
  KPIs e funil congelam e o input mostra erro inline.
- **Raio do segmento** ∝ √contagem, com raio mínimo para a etapa Vendas continuar visível.
- **Cenário otimizado** começa nas taxas atuais + 5 p.p. ao abrir o modal. No desktop o diálogo fica
  à direita e o card do funil sobe acima do backdrop, para o wireframe continuar visível.
- **Chips de variação** dos KPIs comparam o retorno com o break-even (ROAS = 1x), já que a
  calculadora não tem série histórica.
- As labels de etapa seguem a câmera e ficam sempre ao lado da silhueta.
- **Layout** segue o mockup de referência (header leve com logo, callouts por etapa, toggle Quantidade / Conversão %, faixa de Insights). Taxas padrão 50/44/40/24 reproduzem R$ 26.400,00 e ROAS 2,64x.
- **Gráficos dos KPIs** (`ui/AreaChart.tsx`, SVG próprio) mostram a *sensibilidade ao CPL* (−50% a +50% do valor atual), não histórico — o app não tem série temporal. Faturamento e ROAS formam curvas (∝ 1/CPL); CAC e Custo por Consulta são retas.
- **CPL de equilíbrio** = conversão total × ticket médio (onde o ROAS vale 1x); aparece como linha tracejada no gráfico de ROAS, que estica o eixo até ele.
- **KPIs reordenáveis**: arraste pela alça (⋮⋮) de cada card, ou foque a alça e use ↑/↓. A ordem fica salva no navegador (`localStorage`, chave `ms-kpi-order`) e há um link "Restaurar ordem padrão". Usa o `Reorder` do framer-motion, sem dependência extra.
- **Funil: um lado para cada dado.** Quantidades nos cards da direita; conversões à esquerda, com uma seta que sai da etapa de cima e aponta para a de baixo (`funnel-3d/ConversionOverlay.tsx`, SVG sobre o canvas, reposicionado a cada frame pela projeção da cena). O toggle Quantidade / Conversão % altera só o número dentro de cada etapa.
- **Controles do funil 3D**: arrastar gira; botão direito (ou Shift + arrastar, ou dois dedos no toque) move; scroll dá zoom em direção ao cursor; botão **Centralizar** ou duplo clique voltam ao enquadramento original. Sem inércia, para o reset ser exato. O movimento é limitado a 5 unidades do centro.
- **Preço da Consulta** (opcional, padrão R$ 0): receita por consulta realizada. `Faturamento = Vendas × Ticket + Comparecimentos × Preço da consulta`; entra no ROAS, nos gráficos, no cenário otimizado e no CPL de equilíbrio. CAC e Custo por Consulta continuam sendo só custo (investimento ÷ vendas / comparecimentos). Com preço > 0, o card Custo por Consulta mostra a margem (preço − custo) por consulta.
- **Custo por Consulta** = Investimento ÷ Comparecimentos (consulta = comparecimento realizado).
- Logos em `src/assets/` (versões recortadas); os arquivos originais estão em `src/assets/originais/`.
- Three.js é carregado sob demanda (`React.lazy`), então o fallback 2D não baixa o bundle 3D.
