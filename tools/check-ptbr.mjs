#!/usr/bin/env node
/**
 * Verificador heurístico de clareza em PT-BR.
 *
 * Não é um certificador. Ele apenas destaca pontos para revisão humana.
 *
 * Uso:
 *   node tools/check-ptbr.mjs texto.md
 *   node tools/check-ptbr.mjs texto.md --json
 *   cat texto.md | node tools/check-ptbr.mjs -
 *   node tools/check-ptbr.mjs texto.md --strict
 */

import { readFileSync } from "node:fs";

const HELP = `Verificador heurístico de clareza em PT-BR

Uso:
  node tools/check-ptbr.mjs <arquivo> [--json] [--strict]
  cat texto.md | node tools/check-ptbr.mjs - [--json] [--strict]

Opções:
  --json    Saída em JSON.
  --strict  Retorna código 1 se houver achados de severidade média ou alta.
  --help    Mostra esta ajuda.

O verificador não certifica conformidade com o ASD-STE100 nem com a Lei nº 15.263/2025.
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

const json = args.includes("--json");
const strict = args.includes("--strict");
const files = args.filter((arg) => !arg.startsWith("--"));
if (files.length === 0) {
  console.error("Informe um arquivo ou use '-' para ler da entrada padrão.");
  console.error("Use --help para ver as opções.");
  process.exit(2);
}

const ABBREVIATIONS = [
  "art.", "arts.", "inc.", "al.", "par.", "nº", "no.", "nºs.",
  "sr.", "sra.", "dr.", "dra.", "prof.", "profa.", "ex.", "pág.", "tel.",
  "av.", "r.", "km.", "obs.", "vs.", "cf.", "i.e.", "e.g.", "etc.", "et al.",
  "a.C.", "d.C.",
];

const OFFICIALESE = [
  "no âmbito de", "com vistas a", "em virtude de", "por intermédio de",
  "faz-se necessário", "cumpre destacar", "no que se refere a",
  "com relação a", "a respeito de", "devido ao fato de que",
  "pelo fato de que", "em razão de que", "de forma que", "de modo a",
  "a fim de", "com o objetivo de", "no que tange a", "por conseguinte",
  "destarte", "outrossim", "porquanto", "consoante", "mediante",
  "supracitado", "doravante",
];

const REDUNDANCIES = [
  "elo de ligação", "acabamento final", "planejar antecipadamente",
  "há anos atrás", "entrar para dentro", "sair para fora",
  "subir para cima", "descer para baixo", "repetir de novo",
  "gratuito e sem custo", "monopólio exclusivo", "certeza absoluta",
  "verdadeiro fato", "todos os dias diariamente", "no meu ponto de vista pessoal",
  "fazer uma breve síntese", "pequeno detalhe",
];

const IMPRECISE = [
  "alguns", "algumas", "vários", "várias", "diversos", "diversas",
  "em breve", "oportunamente", "eventualmente", "adequado", "adequada",
  "pertinente", "cabível", "devido", "competente", "razoável",
  "tempestivamente", "no momento oportuno", "a qualquer momento",
];

const FOREIGN = [
  "deadline", "upload", "download", "feedback", "meeting", "budget",
  "target", "insight", "input", "output", "briefing", "workshop",
  "delivery", "sprint", "backlog", "stakeholder", "compliance",
  "accountability", "login", "logout", "online", "offline", "app",
  "email", "e-mail", "site", "link", "print", "report",
];

const NOMINALIZATIONS = [
  "realização", "efetivação", "execução", "verificação", "análise",
  "avaliação", "solicitação", "autorização",
  "utilização", "preenchimento", "encaminhamento", "fornecimento",
  "pagamento", "recebimento", "envio", "concessão",
  "manutenção", "substituição", "despressurização", "providência",
  "providências", "cumprimento", "descumprimento", "revisão", "aprovação",
  "conclusão", "inclusão", "exclusão", "emissão", "transmissão",
  "apresentação", "regulamentação", "implementação",
  "operacionalização", "disponibilização", "atualização", "cadastramento",
];

const PASSIVE_RE = /\b(é|são|foi|foram|será|serão|seria|seriam|seja|sejam|está|estão|estava|estavam|ficou|ficaram)\s+([\p{L}]+(?:ado|ada|ados|adas|ido|ida|idos|idas|to|ta|tos|tas|so|sa|sos|sas|go|ga|gos|gas))\b/giu;

function protect(text) {
  const map = [];
  let protectedText = text;

  const replace = (regex, label) => {
    protectedText = protectedText.replace(regex, (match) => {
      const token = `§§${label}${map.length}§§`;
      map.push([token, match]);
      return token;
    });
  };

  replace(/https?:\/\/[^\s)>\]]+/giu, "URL");
  replace(/[\w.+-]+@[\w-]+\.[\w.-]+/giu, "EMAIL");
  replace(/\b\d+(?:[.,]\d+)+\b/gu, "NUM");
  for (const abbr of ABBREVIATIONS) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), "ABBR");
  }

  return { protectedText, map };
}

function restore(text, map) {
  let restored = text;
  for (const [token, original] of map) {
    restored = restored.split(token).join(original);
  }
  return restored;
}

function splitSentences(text) {
  const { protectedText, map } = protect(text);
  const parts = protectedText
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9"“'(])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.map((part) => restore(part, map));
}

function countWords(text) {
  const matches = text.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function stripMarkdown(text) {
  return text
    .replace(/^>\s?/gu, "")
    .replace(/^#{1,6}\s+/gu, "")
    .replace(/^[-*+]\s+/gu, "")
    .replace(/^\d+[.)]\s+/gu, "")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/`([^`]+)`/gu, "$1")
    .trim();
}

function parseBlocks(text) {
  const lines = text.split(/\r?\n/u);
  const blocks = [];
  let paragraph = null;
  let inCode = false;

  const flush = () => {
    if (paragraph && paragraph.text.trim()) {
      blocks.push(paragraph);
    }
    paragraph = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (/^\s*```/u.test(line)) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^\s*\|/u.test(line)) {
      flush();
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/u.test(line)) {
      flush();
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/u);
    if (heading) {
      flush();
      blocks.push({ type: "heading", text: stripMarkdown(heading[1]), line: lineNumber });
      continue;
    }

    const list = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/u);
    if (list) {
      flush();
      blocks.push({ type: "list", text: stripMarkdown(list[1]), line: lineNumber });
      continue;
    }

    if (!paragraph) {
      paragraph = { type: "paragraph", text: stripMarkdown(line), line: lineNumber };
    } else {
      paragraph.text += ` ${stripMarkdown(line)}`;
    }
  }

  flush();
  return blocks;
}

function excerpt(text, max = 90) {
  const clean = text.replace(/\s+/gu, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function findAll(text, regex, id, category, severity, message, suggestion, blockRanges = []) {
  const findings = [];
  const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = globalRegex.exec(text)) !== null) {
    const line = blockRanges.find((range) => match.index >= range.start && match.index < range.end)?.line ?? null;
    findings.push({
      id,
      category,
      severity,
      line,
      excerpt: excerpt(match[0]),
      message,
      suggestion,
    });
    if (match.index === globalRegex.lastIndex) {
      globalRegex.lastIndex += 1;
    }
  }
  return findings;
}

function analyze(text) {
  const blocks = parseBlocks(text);
  const sentences = [];
  const paragraphs = [];
  const headings = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      headings.push(block);
      continue;
    }
    const parts = splitSentences(block.text);
    if (block.type === "paragraph") {
      paragraphs.push({ ...block, sentences: parts });
    }
    for (const sentence of parts) {
      sentences.push({ ...block, text: sentence });
    }
  }

  const findings = [];

  for (const sentence of sentences) {
    const words = countWords(sentence.text);
    if (words > 25) {
      findings.push({
        id: "FRASE-LONGA",
        category: "comprimento",
        severity: "media",
        line: sentence.line,
        excerpt: excerpt(sentence.text),
        message: `Frase com ${words} palavras.`,
        suggestion: "Divida em frases menores. Use 20 palavras para instruções e 25 para descrições.",
      });
    } else if (words > 20) {
      findings.push({
        id: "FRASE-MEDIA",
        category: "comprimento",
        severity: "baixa",
        line: sentence.line,
        excerpt: excerpt(sentence.text),
        message: `Frase com ${words} palavras.`,
        suggestion: "Se for instrução, divida. Se for descrição, confirme se a frase continua clara.",
      });
    }
  }

  for (const paragraph of paragraphs) {
    if (paragraph.sentences.length > 6) {
      findings.push({
        id: "PARAGRAFO-LONGO",
        category: "estrutura",
        severity: "baixa",
        line: paragraph.line,
        excerpt: excerpt(paragraph.text),
        message: `Parágrafo com ${paragraph.sentences.length} frases.`,
        suggestion: "Divida em parágrafos de até 6 frases, com um tema por parágrafo.",
      });
    }
  }

  for (const heading of headings) {
    const words = countWords(heading.text);
    if (words > 12) {
      findings.push({
        id: "TITULO-LONGO",
        category: "estrutura",
        severity: "baixa",
        line: heading.line,
        excerpt: excerpt(heading.text),
        message: `Título com ${words} palavras.`,
        suggestion: "Encurte o título e deixe os detalhes para o corpo.",
      });
    }
  }

  const blockRanges = [];
  let fullText = "";
  for (const block of blocks) {
    const start = fullText.length;
    fullText += block.text;
    blockRanges.push({ start, end: fullText.length, line: block.line });
    fullText += "\n";
  }

  const find = (text, regex, id, category, severity, message, suggestion) =>
    findAll(text, regex, id, category, severity, message, suggestion, blockRanges);

  findings.push(
    ...find(fullText, /\b(?:e\s*\/\s*ou)\b/giu, "E-OU", "estrutura", "media",
      "Uso de 'e/ou'.",
      "Diga quais são as possibilidades: 'ou', 'e', ou liste os casos."),
    ...find(fullText, /;/gu, "PONTO-VIRGULA", "estrutura", "baixa",
      "Ponto e vírgula.",
      "Separe em duas frases."),
    ...find(fullText, /\b(?:etc|i\.e|e\.g|cf|vs)\./giu, "ABREVIACAO-LATINA", "estilo", "baixa",
      "Abreviação latina.",
      "Use 'por exemplo', 'ou seja', 'conforme' ou complete a lista."),
    ...find(fullText, /\brespectivamente\b/giu, "RESPECTIVAMENTE", "estilo", "baixa",
      "Uso de 'respectivamente'.",
      "Reescreva a associação de forma explícita."),
    ...find(fullText, /\b(?:o|a|os|as)\s+(?:mesmo|mesma|mesmos|mesmas)\b/giu, "O-MESMO", "estilo", "media",
      "Uso de 'o mesmo' como pronome.",
      "Repita o substantivo."),
    ...find(fullText, /\([^)]{1,80}\)/gu, "PARENTESES", "estrutura", "baixa",
      "Parênteses no meio do texto.",
      "Verifique se a explicação pode virar uma frase separada. Expansão de sigla é exceção."),
    ...find(fullText, PASSIVE_RE, "VOZ-PASSIVA", "estilo", "media",
      "Possível voz passiva.",
      "Se o agente importa, use a voz ativa. Se não importa, confirme se a passiva é necessária."),
  );

  for (const phrase of OFFICIALESE) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "giu");
    findings.push(
      ...find(fullText, regex, "OFICIALES", "estilo", "baixa",
        `Expressão de oficialês: "${phrase}".`,
        "Troque por uma expressão comum."),
    );
  }

  for (const phrase of REDUNDANCIES) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "giu");
    findings.push(
      ...find(fullText, regex, "REDUNDANCIA", "estilo", "baixa",
        `Possível redundância: "${phrase}".`,
        "Corte a palavra desnecessária."),
    );
  }

  for (const word of IMPRECISE) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "giu");
    findings.push(
      ...find(fullText, regex, "IMPRECISO", "estilo", "baixa",
        `Palavra imprecisa: "${word}".`,
        "Quantifique, date ou defina o critério. Se o original for impreciso, sinalize."),
    );
  }

  for (const word of FOREIGN) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "giu");
    findings.push(
      ...find(fullText, regex, "ESTRANGEIRISMO", "terminologia", "baixa",
        `Estrangeirismo: "${word}".`,
        "Verifique se há equivalente em português. Mantenha nomes próprios e termos técnicos consagrados."),
    );
  }

  for (const word of NOMINALIZATIONS) {
    const regex = new RegExp(`\\b${word}\\b`, "giu");
    findings.push(
      ...find(fullText, regex, "NOMINALIZACAO", "estilo", "baixa",
        `Possível nominalização: "${word}".`,
        "Verifique se um verbo direto deixa a frase mais clara."),
    );
  }

  const acronymMatches = fullText.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}\b/gu) || [];
  const acronyms = [...new Set(acronymMatches)].filter((item) => item.length >= 2);
  if (acronyms.length > 0) {
    findings.push({
      id: "SIGLAS",
      category: "terminologia",
      severity: "baixa",
      line: null,
      excerpt: acronyms.join(", "),
      message: "Siglas encontradas.",
      suggestion: "Confira se cada sigla foi expandida na primeira ocorrência.",
    });
  }

  if (/!{1,}/u.test(fullText)) {
    findings.push({
      id: "EXCLAMACAO",
      category: "estilo",
      severity: "baixa",
      line: null,
      excerpt: "!",
      message: "Ponto de exclamação.",
      suggestion: "Em comunicação oficial, use com moderação.",
    });
  }

  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.id}|${finding.line}|${finding.excerpt}`;
    if (!unique.has(key)) {
      unique.set(key, finding);
    }
  }

  const finalFindings = [...unique.values()];
  const severityRank = { bloqueante: 0, alta: 1, media: 2, baixa: 3 };
  finalFindings.sort((a, b) => {
    const bySeverity = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (bySeverity !== 0) return bySeverity;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  const wordCount = countWords(fullText);
  const avgSentenceWords = sentences.length > 0 ? wordCount / sentences.length : 0;

  return {
    stats: {
      blocks: blocks.length,
      sentences: sentences.length,
      words: wordCount,
      paragraphs: paragraphs.length,
      headings: headings.length,
      averageSentenceWords: Number(avgSentenceWords.toFixed(1)),
      findings: finalFindings.length,
    },
    findings: finalFindings,
  };
}

function printMarkdown(file, result) {
  const { stats, findings } = result;
  console.log(`# Verificação: ${file}\n`);
  console.log(`- Frases: ${stats.sentences}`);
  console.log(`- Palavras: ${stats.words}`);
  console.log(`- Média de palavras por frase: ${stats.averageSentenceWords}`);
  console.log(`- Parágrafos: ${stats.paragraphs}`);
  console.log(`- Achados: ${stats.findings}\n`);

  if (findings.length === 0) {
    console.log("Nenhum achado heurístico. Ainda assim, faça a revisão humana de fidelidade, efeito jurídico e acessibilidade.\n");
    return;
  }

  console.log("| # | Linha | Severidade | Achado | Trecho | Sugestão |");
  console.log("|---|---|---|---|---|---|");
  findings.forEach((finding, index) => {
    const line = finding.line ?? "—";
    const excerptText = finding.excerpt.replace(/\|/gu, "\\|");
    const suggestion = finding.suggestion.replace(/\|/gu, "\\|");
    console.log(`| ${index + 1} | ${line} | ${finding.severity} | ${finding.message} | ${excerptText} | ${suggestion} |`);
  });
  console.log("\n> Verificação heurística. Não certifica conformidade com o ASD-STE100 nem com a Lei nº 15.263/2025.\n");
}

const results = [];
for (const file of files) {
  const text = file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const result = analyze(text);
  results.push({ file, ...result });
}

if (json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const result of results) {
    printMarkdown(result.file, result);
  }
}

if (strict && results.some((result) => result.findings.some((finding) => ["bloqueante", "alta", "media"].includes(finding.severity)))) {
  process.exit(1);
}
