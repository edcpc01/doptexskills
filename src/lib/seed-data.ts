import type { Colaborador, Competencia, CargoType, GrupoCompetencia, NivelCompetencia } from "./types";

export const COLABORADORES_SEED: Omit<Colaborador, "id">[] = [
  { nome: "Brenda Cristina Antunes Netto", email: "brenda@doptex.com", cargo: "TECELAO", dataAdmissao: "2022-11-08", ativo: true },
  { nome: "Gustavo Celestino dos Santos", email: "gustavo@doptex.com", cargo: "EXPEDIDOR", dataAdmissao: "2021-07-20", ativo: true },
  { nome: "Julia Stephanie Henken", email: "julia@doptex.com", cargo: "TECELAO", dataAdmissao: "2022-10-25", ativo: true },
  { nome: "Karen Cristine Mesquita Inocencio", email: "karen@doptex.com", cargo: "TECELAO", dataAdmissao: "2023-09-26", ativo: true },
  { nome: "Mayra Candido da Silva", email: "mayra@doptex.com", cargo: "TECELAO", dataAdmissao: "2019-01-08", ativo: true },
  { nome: "Roney Gomes Ribeiro", email: "roney@doptex.com", cargo: "TECELAO", dataAdmissao: "2024-03-05", ativo: true },
  { nome: "Marciana Mendes Alves", email: "marciana@doptex.com", cargo: "AJUDANTE_PRODUCAO", dataAdmissao: "2024-05-22", ativo: true },
  { nome: "Sara Caroline de Souza Castilho", email: "sara@doptex.com", cargo: "AJUDANTE_PRODUCAO", dataAdmissao: "2024-06-25", ativo: true },
  { nome: "Renaldo Gomes da Silva", email: "renaldo@doptex.com", cargo: "AUX_MANUT_MECANICA", dataAdmissao: "2022-08-09", ativo: true },
  { nome: "Leonaldo Pereira da Silva", email: "leonaldo@doptex.com", cargo: "AJUDANTE_PRODUCAO", dataAdmissao: "2021-08-03", ativo: true },
  { nome: "Roberto Nascimento Lima", email: "roberto@doptex.com", cargo: "TECELAO", dataAdmissao: "2015-07-20", ativo: true },
  { nome: "Lucas Rodrigo Soares Gonzaga", email: "lucas.gonzaga@doptex.com", cargo: "TECELAO", dataAdmissao: "2021-09-20", ativo: true },
  { nome: "Tamara Damazio da Silva", email: "tamara@doptex.com", cargo: "TECELAO", dataAdmissao: "2024-03-05", ativo: true },
  { nome: "Edimar Rocha de Jesus", email: "edimar@doptex.com", cargo: "TECELAO", dataAdmissao: "2023-07-24", ativo: true },
  { nome: "Iandra Fernanda Ribeiro Moura", email: "iandra@doptex.com", cargo: "AJUDANTE_PRODUCAO", dataAdmissao: "2023-09-19", ativo: true },
  { nome: "Jose Nilton de Jesus Barros", email: "jose.nilton@doptex.com", cargo: "TECELAO", dataAdmissao: "2022-03-08", ativo: true },
  { nome: "Nicolas Marcal", email: "nicolas@doptex.com", cargo: "EXPEDIDOR", dataAdmissao: "2022-07-05", ativo: true },
  { nome: "Kelly Leite Rosaboni Mariano", email: "kelly@doptex.com", cargo: "TECELAO", dataAdmissao: "2022-12-21", ativo: true },
];

type CompSeed = { nome: string; grupo: GrupoCompetencia; cargos: CargoType[] };

const OPERACAO_CARGOS: CargoType[] = ["TECELAO", "AJUDANTE_PRODUCAO", "EXPEDIDOR", "AUX_MANUT_MECANICA"];

export const COMPETENCIAS_SEED: CompSeed[] = [
  // Operacionais
  { nome: "Atividades de Ajudante de Produção", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  { nome: "Tear 32 Polegadas", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  { nome: "Tear 42 Polegadas", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  { nome: "Tear Interlock", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  { nome: "Tear Ribana", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  { nome: "Tear com Elastano", grupo: "Competências Operacionais", cargos: OPERACAO_CARGOS },
  // Controle de Processo e Qualidade
  { nome: "Controle de Fios na Gaiola", grupo: "Competências de Controle de Processo e Qualidade", cargos: OPERACAO_CARGOS },
  { nome: "Realização Adequada de Controle Visual", grupo: "Competências de Controle de Processo e Qualidade", cargos: OPERACAO_CARGOS },
  { nome: "POP de Limpeza de Peças", grupo: "Competências de Controle de Processo e Qualidade", cargos: OPERACAO_CARGOS },
  { nome: "Revisão de Peças", grupo: "Competências de Controle de Processo e Qualidade", cargos: OPERACAO_CARGOS },
  { nome: "Organização e Limpeza do Setor", grupo: "Competências de Controle de Processo e Qualidade", cargos: OPERACAO_CARGOS },
  // Atividades Logísticas
  { nome: "Lançamento de Peças no Sistema", grupo: "Competências de Atividades Logísticas", cargos: OPERACAO_CARGOS },
  { nome: "Montagem e Fechamento de PLTM", grupo: "Competências de Atividades Logísticas", cargos: OPERACAO_CARGOS },
  { nome: "Transferências de PLTM no Sistema", grupo: "Competências de Atividades Logísticas", cargos: OPERACAO_CARGOS },
  // Comportamentais (Operação)
  { nome: "Atendimento de Objetivos de Produção e Qualidade", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Entendimento das Normas Organizacionais", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Normas de Segurança e Saúde", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Pró-atividade", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Capacidade e Facilidade de Comunicação", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Postura para o Aprendizado", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  { nome: "Postura para Ensinamento", grupo: "Competências Comportamentais", cargos: OPERACAO_CARGOS },
  // Líder - Técnicas
  { nome: "Manutenção Corretiva", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Troca de Artigo Básica", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Análise e Entendimento de Relatórios", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Programação e Logística", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Processos de Qualidade", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Organização e Limpeza do Setor (Líder)", grupo: "Competências Técnicas", cargos: ["LIDER_PRODUCAO"] },
  // Líder - Comportamentais
  { nome: "Avaliar e Administrar Desempenho", grupo: "Competências Comportamentais", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Comunicação (Líder)", grupo: "Competências Comportamentais", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Postura Empreendedora", grupo: "Competências Comportamentais", cargos: ["LIDER_PRODUCAO"] },
  // Líder - Gestão
  { nome: "Resolução de Conflitos", grupo: "Competências de Gestão", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Definição de Objetivos Diários", grupo: "Competências de Gestão", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Controle de Indicadores de Produção", grupo: "Competências de Gestão", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Normas de Segurança e Saúde (Líder)", grupo: "Competências de Gestão", cargos: ["LIDER_PRODUCAO"] },
  { nome: "Gestão de Custos e Processos (Líder)", grupo: "Competências de Gestão", cargos: ["LIDER_PRODUCAO"] },
  // Supervisor - Técnicas
  { nome: "Desenvolvimento de Produtos Básicos", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Princípios de Formação e Produção de Malhas", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Domínio em Sistemas ERPs", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Ferramentas de Gestão (Office, Power BI)", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Desenvolvimento de Processos Produtivos", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Acompanhamento de Projetos e Plano de Ações", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Negociação e Compras", grupo: "Competências Técnicas", cargos: ["SUPERVISOR_PRODUCAO"] },
  // Supervisor - Comportamentais
  { nome: "Capacidade Analítica de Processos", grupo: "Competências Comportamentais", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Comunicação (Supervisor)", grupo: "Competências Comportamentais", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Postura Criativa e Empreendedora", grupo: "Competências Comportamentais", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Relacionamento e Condução Interdisciplinar", grupo: "Competências Comportamentais", cargos: ["SUPERVISOR_PRODUCAO"] },
  // Supervisor - Gestão
  { nome: "Criação de Metas de Médio Prazo", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Criação de Cronogramas Preventivos", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Desenvolvimento e Acompanhamento de Indicadores", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Gestão da Segurança no Trabalho", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Desenvolvimento de Liderança", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
  { nome: "Gestão de Custos e Processos (Supervisor)", grupo: "Competências de Gestão", cargos: ["SUPERVISOR_PRODUCAO"] },
];

// Notas iniciais por colaborador (aba Março-2026), na mesma ordem das competências operacionais
// Ordem: [op1..op6, ctrl1..ctrl5, log1..log3, comp1..comp7] = 21 competências
export const NOTAS_INICIAIS: Record<string, NivelCompetencia[]> = {
  "Brenda Cristina Antunes Netto":   [3,2,2,1,1,1, 2,2,2,2,3, 3,0,0, 2,3,3,2,2,2,2],
  "Gustavo Celestino dos Santos":    [4,0,0,0,0,0, 4,3,0,4,2, 4,4,4, 3,3,3,3,4,3,4],
  "Julia Stephanie Henken":          [4,3,3,3,2,2, 3,3,4,3,4, 4,0,0, 3,3,3,4,3,4,4],
  "Karen Cristine Mesquita Inocencio":[4,3,3,2,2,2, 3,3,3,2,4, 4,0,0, 3,3,3,4,3,4,3],
  "Mayra Candido da Silva":          [3,3,3,3,3,3, 3,3,3,2,3, 3,0,0, 3,3,3,3,3,3,2],
  "Roney Gomes Ribeiro":             [4,4,4,4,3,3, 3,4,4,2,4, 4,2,2, 4,4,3,4,3,4,3],
  "Marciana Mendes Alves":           [3,2,2,0,0,0, 3,3,2,2,3, 2,0,0, 3,3,3,3,3,3,3],
  "Sara Caroline de Souza Castilho": [2,1,1,1,1,1, 2,3,1,1,2, 2,0,0, 2,2,3,3,3,3,2],
  "Renaldo Gomes da Silva":         [3,3,3,3,3,3, 3,3,3,3,3, 3,3,3, 3,3,3,3,3,3,3],
  "Leonaldo Pereira da Silva":      [2,0,0,0,0,0, 1,1,2,2,2, 2,2,2, 2,2,2,1,2,2,2],
  "Roberto Nascimento Lima":         [3,4,4,3,3,3, 4,3,3,3,3, 3,0,0, 3,2,2,2,2,2,3],
  "Lucas Rodrigo Soares Gonzaga":    [4,3,3,3,3,2, 3,2,3,3,3, 3,1,1, 3,3,2,4,2,3,3],
  "Tamara Damazio da Silva":         [3,2,2,2,1,1, 2,2,2,2,3, 2,0,0, 2,2,3,3,2,2,2],
  "Edimar Rocha de Jesus":           [2,1,1,1,1,1, 0,2,2,2,2, 3,2,2, 2,2,2,3,2,2,2],
  "Iandra Fernanda Ribeiro Moura":   [3,1,1,0,0,0, 1,2,1,2,3, 1,0,0, 2,2,3,3,2,3,2],
  "Jose Nilton de Jesus Barros":     [4,4,4,3,4,3, 4,4,4,2,4, 4,4,2, 4,3,4,4,4,4,4],
  "Nicolas Marcal":                  [3,3,3,3,3,2, 3,3,4,2,3, 4,3,3, 3,3,4,3,4,4,4],
  "Kelly Leite Rosaboni Mariano":    [4,4,4,3,3,2, 4,4,4,2,4, 4,3,0, 4,3,4,4,4,4,4],
};
