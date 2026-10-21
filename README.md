# Zero Lero — STE100 + Linguagem Simples (PT-BR)

Pacote de instruções para transformar documentação técnica, um texto avulso ou a resposta anterior de um assistente em uma versão clara, objetiva e utilizável. O uso principal é **documentação técnica**; o pacote também cobre comunicação ao cidadão e resumos explicativos de textos jurídicos. Combina:

- princípios do **ASD-STE100 Issue 9** (Simplified Technical English), adaptados ao português do Brasil;
- técnicas da **Lei nº 15.263/2025** (Política Nacional de Linguagem Simples);
- critérios de acessibilidade textual da **Lei nº 13.146/2015**;
- um contrato de fidelidade para não alterar fatos, condições, modalidade ou efeito jurídico.

O pacote funciona em **OpenCode**, **Claude Code** e **GitHub Copilot** (VS Code). Também inclui um prompt portátil para qualquer chat.

## O que você recebe

```text
zero-lero/
├── README.md
├── LICENSE
├── build.mjs
├── src/
│   ├── prompt.md                  # fonte canônica
│   ├── frontmatter-skill.txt
│   ├── frontmatter-copilot.txt
│   └── references/
│       ├── ste100-adaptado.md
│       ├── lei-15263-2025.md
│       ├── qa-checklist.md
│       ├── exemplos.md
│       └── termbase.md
├── dist/
│   ├── skill/zero-lero/           # pronto para OpenCode e Claude
│   ├── copilot/                   # pronto para VS Code
│   └── portable/                  # prompt para qualquer chat
├── tools/
│   └── check-ptbr.mjs             # verificador heurístico
└── evals/
    ├── casos.md
    └── rubrica.md
```

## Decisão de arquitetura: por que não "gerar em inglês e traduzir"

A ideia de gerar uma versão intermediária em inglês com STE100 e depois traduzir para o português tem um problema: **o STE100 é uma norma de inglês controlado**. A tradução não herda automaticamente a conformidade. O dicionário oficial tem palavras e sentidos aprovados em inglês; ao traduzir, você pode:

- trocar um termo por um sinônimo que muda o sentido;
- introduzir voz passiva, nominalização ou frase longa;
- perder condições, exceções ou modalidade;
- criar uma versão em português que não cumpre nem o STE100 nem a lei.

Por isso, o fluxo padrão é:

1. montar um **modelo de conteúdo** com fatos, atores, ações, condições, prazos e termos;
2. renderizar **direto em PT-BR**, aplicando as restrições de clareza;
3. verificar fidelidade, STE100 adaptado, lei e acessibilidade;
4. se o usuário pedir inglês, renderizar uma versão **EN-STE100** separada, a partir do mesmo modelo, e comparar as duas.

O modo `bilíngue` existe. Ele não é o padrão. A versão em português é a principal; a inglesa é um rascunho controlado, não uma certificação.

## Instalação

### OpenCode

Global:

```bash
mkdir -p ~/.config/opencode/skills
cp -R dist/skill/zero-lero ~/.config/opencode/skills/
```

No projeto:

```bash
mkdir -p .opencode/skills
cp -R /caminho/para/zero-lero/dist/skill/zero-lero .opencode/skills/
```

O OpenCode também descobre skills em `.claude/skills` e `~/.claude/skills`.

### Claude Code

Global:

```bash
mkdir -p ~/.claude/skills
cp -R dist/skill/zero-lero ~/.claude/skills/
```

No projeto:

```bash
mkdir -p .claude/skills
cp -R /caminho/para/zero-lero/dist/skill/zero-lero .claude/skills/
```

### GitHub Copilot no VS Code

```bash
mkdir -p .github/prompts
cp dist/copilot/zero-lero.prompt.md .github/prompts/
cp -R dist/copilot/references .github/prompts/references
```

No VS Code, selecione o harness **Local** no chat e digite `/zero-lero`.

O Copilot também aceita o arquivo como instrução personalizada. Para isso, copie o conteúdo para `.github/instructions/zero-lero.instructions.md` e adicione `applyTo: "**/*.md"` no frontmatter. Use essa opção apenas se você quiser aplicação automática; o prompt é melhor para invocação sob demanda.

### Qualquer chat

Copie o conteúdo de `dist/portable/zero-lero.md` e cole no sistema, nas instruções do projeto ou na primeira mensagem.

## Como usar

### Reescrever um texto

```text
/zero-lero

Reescreva o texto abaixo para um cidadão não especialista.
Preserve prazos, valores e condições.

<texto>
```

### Reescrever a resposta anterior

```text
/zero-lero Reescreva a resposta anterior em linguagem simples.
```

Se houver mais de uma resposta anterior possível, o agente pergunta qual usar.

### Auditar sem reescrever

```text
/zero-lero Audite o texto abaixo. Não reescreva ainda.
```

### Texto jurídico

```text
/zero-lero Prepare um resumo explicativo do artigo abaixo.
Não altere o texto normativo. Rotule o resumo como sem valor normativo.
```

### Comparar

```text
/zero-lero Compare o original e a versão revisada, com o motivo de cada mudança.
```

### Bilíngue

```text
/zero-lero Produza uma versão EN-STE100 e uma versão PT-BR a partir do mesmo conteúdo.
Não traduza literalmente. Compare fatos, números, condições e termos.
```

## Modos

| Modo | O que faz |
|---|---|
| `reescrever` | Padrão. Reescreve e entrega texto + notas. |
| `auditar` | Diagnóstico e achados, sem reescrever primeiro. |
| `comparar` | Original, revisado e motivo. |
| `resumo explicativo` | Resumo de norma, sem alterar o texto legal. |
| `bilíngue` | EN-STE100 + PT-BR + checagem de equivalência. |
| `termbase` | Cria ou atualiza o glossário do projeto. |

## Verificador heurístico

O script `tools/check-ptbr.mjs` destaca:

- frases longas;
- parágrafos longos;
- possível voz passiva;
- nominalizações;
- "oficialês";
- redundâncias;
- palavras imprecisas;
- estrangeirismos;
- siglas para conferir;
- ponto e vírgula, "e/ou", abreviações latinas, parênteses.

Uso:

```bash
node tools/check-ptbr.mjs texto.md
node tools/check-ptbr.mjs texto.md --json
node tools/check-ptbr.mjs texto.md --strict
```

O `--strict` retorna código 1 se houver achados de severidade média ou alta. Use em CI com cautela: o verificador é heurístico e produz falsos positivos.

Ele **não** verifica fidelidade, efeito jurídico, precisão técnica, teste com o público-alvo ou acessibilidade completa do formato. Esses itens continuam sendo humanos.

## Como personalizar

### Termbase

Copie `src/references/termbase.md` para o seu projeto e preencha os termos. O termbase é a fonte de verdade para consistência. Um termo por conceito, uma definição por termo, uma fonte por definição.

### Limites de frase

O padrão usa 20 palavras para instruções e 25 para descrições, como adaptação do STE100. Se o seu órgão tiver um guia próprio, ajuste os números em `src/prompt.md` e em `tools/check-ptbr.mjs`.

### Voz

O padrão usa "você" em comunicação ao cidadão. Se o gênero exigir voz institucional, acrescente uma instrução no pedido:

```text
Use voz institucional, sem "você". Prefira "o cidadão", "a pessoa" ou "o órgão".
```

### Presets

Os presets de gênero estão na seção 10 de `src/prompt.md`: comunicação ao cidadão, instrução técnica, documento jurídico, resposta de chat e FAQ. Edite ou acrescente os seus.

## Limites

Este pacote **não**:

- certifica conformidade com o ASD-STE100;
- certifica conformidade com a Lei nº 15.263/2025;
- substitui teste com o público-alvo (art. 5º, XVIII);
- substitui revisão jurídica, médica, técnica ou de segurança;
- garante acessibilidade completa do formato;
- decide interpretação de norma;
- corrige dados falsos ou desatualizados do texto-fonte.

Ele **produz** uma versão revisada, um registro de mudanças e uma lista de pontos para validação humana.

## Desenvolvimento

```bash
node build.mjs
```

O build gera:

- `dist/skill/zero-lero/SKILL.md` + `references/`;
- `dist/copilot/zero-lero.prompt.md` + `references/`;
- `dist/portable/zero-lero.md`.

A fonte canônica é `src/prompt.md`. Não edite os arquivos em `dist/` à mão: eles são regenerados.

## Fontes

- **ASD-STE100 Simplified Technical English**, Issue 9, 15 jan. 2025: <https://www.asd-ste100.org/>.
- **Lei nº 15.263/2025**, Política Nacional de Linguagem Simples: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15263.htm>.
- **Lei nº 13.146/2015**, Estatuto da Pessoa com Deficiência.
- **Decreto nº 6.583/2008**, Acordo Ortográfico da Língua Portuguesa.
- **VOLP**, Vocabulário Ortográfico da Língua Portuguesa.

## Uso e direitos

O texto original deste pacote pode ser usado e adaptado livremente. O **ASD-STE100** é marca e obra da ASD; este pacote não reproduz o dicionário oficial. Para usar o STE100 em inglês, obtenha a cópia oficial gratuita no site da ASD.
