export type UserRole = "admin" | "gestor" | "colaborador";

export type NivelCompetencia = 0 | 1 | 2 | 3 | 4;

export type StatusAvaliacao =
  | "pendente_prova"
  | "aprovado"
  | "reprovado"
  | "confirmado";

export type CargoType =
  | "AJUDANTE_PRODUCAO"
  | "TECELAO"
  | "EXPEDIDOR"
  | "AUX_MANUT_MECANICA"
  | "LIDER_PRODUCAO"
  | "SUPERVISOR_PRODUCAO";

export type GrupoCompetencia =
  | "Competências Operacionais"
  | "Competências de Controle de Processo e Qualidade"
  | "Competências de Atividades Logísticas"
  | "Competências Comportamentais"
  | "Competências Técnicas"
  | "Competências de Gestão";

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  cargo: CargoType;
  dataAdmissao: string;
  ativo: boolean;
  fotoUrl?: string;
  userId?: string;
}

export interface Competencia {
  id: string;
  nome: string;
  grupo: GrupoCompetencia;
  cargosAplicaveis: CargoType[];
  ordem: number;
}

export interface AvaliacaoCompetencia {
  id: string;
  colaboradorId: string;
  competenciaId: string;
  nivelAtual: NivelCompetencia;
  nivelProposto: NivelCompetencia;
  avaliadorId: string;
  dataAvaliacao: string;
  periodoReferencia: string;
  status: StatusAvaliacao;
  provaEnviada: boolean;
  provaUrl?: string;
  notaProva?: number;
  provaAprovada?: boolean;
  justificativa?: string;
}

export interface Prova {
  id: string;
  avaliacaoId: string;
  colaboradorId: string;
  competenciaId: string;
  nivelAlvo: NivelCompetencia;
  googleFormUrl: string;
  dataEnvio: string;
  dataResposta?: string;
  nota?: number;
  aprovado?: boolean;
}

export interface ProvaTemplate {
  id: string;
  competenciaId: string;
  nivelDe: NivelCompetencia;
  nivelPara: NivelCompetencia;
  titulo: string;
  formId: string;
  formBaseUrl: string;
  entryEmailId: string;
  totalQuestoes: number;
  ativo: boolean;
  criadoEm: string;
}

export interface AvaliacaoDesempenho {
  id: string;
  colaboradorId: string;
  mes: string;
  nota: number;
  observacoes?: string;
  avaliadorId: string;
}

export interface Assiduidade {
  id: string;
  colaboradorId: string;
  mes: string;
  diasTrabalhados: number;
  diasUteis: number;
  faltas: number;
  atrasos: number;
  percentualPresenca: number;
}

export interface PesosIDC {
  competencias: number;
  eficiencia: number;
  desempenho: number;
  assiduidade: number;
}

export interface IndiceDesenvolvimento {
  id: string;
  colaboradorId: string;
  periodoReferencia: string;
  mediaCompetencias: number;
  eficiencia: number;
  avaliacaoDesempenho: number;
  assiduidade: number;
  indiceGeral: number;
  pesos: PesosIDC;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  colaboradorId?: string;
  nome: string;
}

export const NIVEL_LABELS: Record<NivelCompetencia, string> = {
  0: "Não conhece / Não tem formação",
  1: "Recém-admitido / Em formação",
  2: "Conhece parcialmente / Em desenvolvimento",
  3: "Conhece a operação / Bom desempenho",
  4: "Conhece e ensina / Lidera",
};

export const NIVEL_COLORS: Record<NivelCompetencia, string> = {
  0: "#EF4444",
  1: "#F97316",
  2: "#EAB308",
  3: "#22C55E",
  4: "#15803D",
};

export const NIVEL_BG_CLASSES: Record<NivelCompetencia, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-yellow-500",
  3: "bg-green-400",
  4: "bg-green-700",
};

export const CARGO_LABELS: Record<CargoType, string> = {
  AJUDANTE_PRODUCAO: "Ajudante de Produção",
  TECELAO: "Tecelão",
  EXPEDIDOR: "Expedidor",
  AUX_MANUT_MECANICA: "Aux. Manutenção Mecânica",
  LIDER_PRODUCAO: "Líder de Produção",
  SUPERVISOR_PRODUCAO: "Supervisor de Produção",
};

export const PESOS_DEFAULT: PesosIDC = {
  competencias: 0.35,
  eficiencia: 0.25,
  desempenho: 0.25,
  assiduidade: 0.15,
};
