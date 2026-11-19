export type TabKey =
  | 'dashboard'
  | 'vendas'
  | 'comissoes'
  | 'produtos'
  | 'visitas'
  | 'leads'
  | 'blog'
  | 'configuracoes';

export type PermissoesAbas = Record<TabKey, boolean>;

export interface RomaProduto {
  id: string;
  nome: string;
  slug: string;
  categoria: 'Gravatas Slim' | 'Gravatas Tradicionais' | 'Camisas Sociais' | 'Acessórios' | 'Kits Noivo & Padrinhos';
  preco: number;
  preco_pix: number;
  preco_original?: number;
  estoque: number;
  cores: string[];
  tamanhos: string[];
  imagem_url: string;
  destaque?: boolean;
  mais_vendido?: boolean;
  descricao: string;
  ativo: boolean;
}

export interface RomaItemPedido {
  produto_id: string;
  nome: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: number;
}

export interface RomaPedido {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  cliente_email?: string;
  cliente_whatsapp: string;
  cep?: string;
  endereco?: string;
  itens: RomaItemPedido[];
  subtotal: number;
  frete: number;
  desconto_pix: number;
  total: number;
  forma_pagamento: 'Pix' | 'Cartão de Crédito (até 6x)' | 'Boleto';
  status: 'Pendente' | 'Pago' | 'Em Separação' | 'Enviado' | 'Entregue' | 'Cancelado';
  comissao_percentual: number;
  comissao_valor: number;
  comissao_paga: boolean;
  created_at: string;
}

export interface RomaVisita {
  id: string;
  pagina: string;
  origem_utm: string;
  dispositivo: 'Desktop' | 'Mobile';
  session_id: string;
  created_at: string;
}

export interface RomaLead {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  interesse: string;
  origem: 'Bot Especialista' | 'Newsletter' | 'Checkout' | 'Blog';
  status: 'Novo' | 'Em Atendimento' | 'Convertido' | 'Perdido';
  notas?: string;
  created_at: string;
}

export interface RomaBlogPost {
  id: string;
  titulo: string;
  slug: string;
  categoria: string;
  resumo: string;
  conteudo: string;
  imagem_url: string;
  tempo_leitura: string;
  publicado: boolean;
  created_at: string;
}

export interface RomaUsuario {
  id: string;
  nome: string;
  email: string;
  senha_provisoria?: string;
  precisa_trocar_senha?: boolean;
  nivel_acesso: 'Master' | 'Gerente' | 'Vendedor' | 'Editor';
  permissoes_abas: PermissoesAbas;
  ativo: boolean;
  created_at: string;
}
