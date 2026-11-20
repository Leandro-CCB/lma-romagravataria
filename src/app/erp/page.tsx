'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Percent,
  Package,
  Eye,
  Users,
  BookOpen,
  Settings,
  ArrowLeft,
  UserCheck,
  LogOut,
  Plus,
  CheckCircle2,
  ExternalLink,
  Lock,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Phone,
  Mail,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { useRomaStore } from '@/lib/romaStore';
import { TabKey, RomaUsuario, PermissoesAbas, RomaProduto } from '@/types/roma';
import { compressAndUploadImage } from '@/lib/imageUpload';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'vendas', label: 'Vendas & Pedidos', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'comissoes', label: 'Minhas Comissões', icon: <Percent className="h-4 w-4" /> },
  { key: 'produtos', label: 'Produtos & Estoque', icon: <Package className="h-4 w-4" /> },
  { key: 'visitas', label: 'Controle de Visitas', icon: <Eye className="h-4 w-4" /> },
  { key: 'leads', label: 'Leads (Bot & Site)', icon: <Users className="h-4 w-4" /> },
  { key: 'blog', label: 'Blog Moda', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'configuracoes', label: 'Configurações & Usuários', icon: <Settings className="h-4 w-4" /> },
];

export default function RomaErpPage() {
  const {
    produtos,
    pedidos,
    visitas,
    leads,
    blogPosts,
    usuarios,
    config,
    salvarConfiguracao,
    atualizarPedidoStatus,
    toggleComissaoPaga,
    atualizarLeadStatus,
    salvarProduto,
    salvarBlogPost,
    salvarUsuario,
    excluirUsuario,
  } = useRomaStore();

  const masterUser = usuarios[0];
  const [impersonatedUser, setImpersonatedUser] = useState<RomaUsuario | null>(null);
  const activeUser = impersonatedUser || masterUser;

  // Autenticação da Área Administrativa
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('roma_erp_auth') === 'true';
    }
    return false;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErro('');

    try {
      // 1. Tenta autenticação real via Supabase Auth
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginSenha,
        });

        if (!error && data.session) {
          setIsAuthenticated(true);
          sessionStorage.setItem('roma_erp_auth', 'true');
          sessionStorage.setItem('roma_erp_user_email', data.user?.email || loginEmail);
          setLoginErro('');
          return;
        }
      }

      // 2. Validação por usuário cadastrado no sistema
      const targetUser = usuarios.find((u) => u.email.toLowerCase() === loginEmail.toLowerCase().trim());
      const isMasterDefault = loginEmail === 'admin@roma.com.br' && loginSenha === 'roma2026';
      const isUserPasswordMatch = targetUser && (
        (targetUser.senha_provisoria && targetUser.senha_provisoria === loginSenha) ||
        (!targetUser.senha_provisoria && loginSenha === 'roma2026')
      );

      if (isMasterDefault || isUserPasswordMatch) {
        setIsAuthenticated(true);
        sessionStorage.setItem('roma_erp_auth', 'true');
        sessionStorage.setItem('roma_erp_user_email', loginEmail);
        setLoginErro('');

        if (targetUser && targetUser.precisa_trocar_senha) {
          setModalTrocaSenha(true);
        }
      } else {
        setLoginErro('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch {
      setLoginErro('Falha na comunicação de autenticação.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    sessionStorage.removeItem('roma_erp_auth');
    sessionStorage.removeItem('roma_erp_user_email');
    setImpersonatedUser(null);
  };

  const allowedTabs = useMemo(
    () => TAB_CONFIG.filter((t) => activeUser?.permissoes_abas?.[t.key]),
    [activeUser]
  );

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  // Ensure activeTab is always allowed when switching to Modo Usuário
  const currentTab: TabKey = activeUser?.permissoes_abas?.[activeTab]
    ? activeTab
    : allowedTabs[0]?.key || 'dashboard';

  // New Product Form
  const [newProdNome, setNewProdNome] = useState('');
  const [newProdPreco, setNewProdPreco] = useState('69.90');
  const [newProdCat, setNewProdCat] = useState<'Gravatas Slim' | 'Camisas Sociais' | 'Kits Noivo & Padrinhos'>('Gravatas Slim');
  const [editingProd, setEditingProd] = useState<RomaProduto | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // New Blog Form
  const [newBlogTitulo, setNewBlogTitulo] = useState('');
  const [newBlogResumo, setNewBlogResumo] = useState('');
  const [newBlogConteudo, setNewBlogConteudo] = useState('');

  // New User Form & Edit User Modal
  const [newUsrNome, setNewUsrNome] = useState('');
  const [newUsrEmail, setNewUsrEmail] = useState('');
  const [newUsrSenhaProv, setNewUsrSenhaProv] = useState('Roma@2026');
  const [newUsrNivel, setNewUsrNivel] = useState<RomaUsuario['nivel_acesso']>('Vendedor');
  const [newUsrPerms, setNewUsrPerms] = useState<PermissoesAbas>({
    dashboard: true,
    vendas: true,
    comissoes: false,
    produtos: false,
    visitas: false,
    leads: true,
    blog: false,
    configuracoes: false,
  });
  const [editingUsr, setEditingUsr] = useState<RomaUsuario | null>(null);

  // Modal para troca de senha obrigatória no primeiro login
  const [modalTrocaSenha, setModalTrocaSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('');
  const [erroTrocaSenha, setErroTrocaSenha] = useState('');

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Estados de Filtros e Formulários para os módulos enriquecidos
  const [mesComissao, setMesComissao] = useState('todos');
  const [filtroStatusPedido, setFiltroStatusPedido] = useState('todos');
  const [buscaPedido, setBuscaPedido] = useState('');
  const [filtroStatusLead, setFiltroStatusLead] = useState('todos');
  const [buscaLead, setBuscaLead] = useState('');
  const [filtroMesVisitas, setFiltroMesVisitas] = useState('todos');
  const [filtroOrigemVisitas, setFiltroOrigemVisitas] = useState('todos');
  const [leadModal, setLeadModal] = useState<{ id: string; nome: string; zap: string; nota: string } | null>(null);

  // Estados para Configuração de WhatsApp e Comissão Geral
  const [formZapNumero, setFormZapNumero] = useState(config?.whatsapp_numero || '5511999998888');
  const [formZapDisplay, setFormZapDisplay] = useState(config?.whatsapp_display || '(11) 99999-8888');
  const [formZapMsg, setFormZapMsg] = useState(
    config?.mensagem_padrao_atendente || 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:'
  );
  const [formComissaoPerc, setFormComissaoPerc] = useState(String(config?.comissao_padrao_percentual || 12));
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Atualiza estados caso o config carregue depois
  React.useEffect(() => {
    if (config) {
      setFormZapNumero(config.whatsapp_numero);
      setFormZapDisplay(config.whatsapp_display);
      setFormZapMsg(config.mensagem_padrao_atendente);
      setFormComissaoPerc(String(config.comissao_padrao_percentual));
    }
  }, [config]);

  const handleSalvarConfiguracoes = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoConfig(true);
    salvarConfiguracao({
      whatsapp_numero: formZapNumero.replace(/\D/g, ''),
      whatsapp_display: formZapDisplay.trim(),
      mensagem_padrao_atendente: formZapMsg.trim(),
      comissao_padrao_percentual: Number(formComissaoPerc) || 12,
    });
    setTimeout(() => {
      setSalvandoConfig(false);
      alert('Configurações de WhatsApp e Comissões salvas com sucesso!');
    }, 300);
  };

  const totalVendas = pedidos.reduce((s, p) => (p.status !== 'Cancelado' ? s + p.total : s), 0);
  const totalComissoes = pedidos.reduce((s, p) => (p.status !== 'Cancelado' ? s + p.comissao_valor : s), 0);
  const comissoesPendentes = pedidos.reduce(
    (s, p) => (p.status !== 'Cancelado' && !p.comissao_paga ? s + p.comissao_valor : s),
    0
  );

  // Cálculos para o Módulo de Comissões com Filtro de Mês e Evolução
  const mesesComissoesDisponiveis = useMemo(() => {
    const setM = new Set<string>();
    pedidos.forEach((p) => {
      const dt = new Date(p.created_at);
      const chave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      setM.add(chave);
    });
    return Array.from(setM).sort().reverse();
  }, [pedidos]);

  const pedidosComissaoFiltrados = useMemo(() => {
    if (mesComissao === 'todos') return pedidos;
    return pedidos.filter((p) => {
      const dt = new Date(p.created_at);
      const chave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      return chave === mesComissao;
    });
  }, [pedidos, mesComissao]);

  const metricasComissao = useMemo(() => {
    let faturamento = 0;
    let totalComissao = 0;
    let paga = 0;
    let pendente = 0;

    pedidosComissaoFiltrados.forEach((p) => {
      if (p.status !== 'Cancelado') {
        faturamento += p.total;
        totalComissao += p.comissao_valor;
        if (p.comissao_paga) {
          paga += p.comissao_valor;
        } else {
          pendente += p.comissao_valor;
        }
      }
    });

    return { faturamento, totalComissao, paga, pendente, qtdPedidos: pedidosComissaoFiltrados.length };
  }, [pedidosComissaoFiltrados]);

  // Evolução mensal das comissões para gráfico
  const evolucaoComissoes = useMemo(() => {
    const mapa: Record<string, { faturamento: number; comissao: number }> = {};
    pedidos.forEach((p) => {
      if (p.status !== 'Cancelado') {
        const dt = new Date(p.created_at);
        const mesLabel = dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (!mapa[mesLabel]) {
          mapa[mesLabel] = { faturamento: 0, comissao: 0 };
        }
        mapa[mesLabel].faturamento += p.total;
        mapa[mesLabel].comissao += p.comissao_valor;
      }
    });
    return Object.entries(mapa).map(([mes, vals]) => ({ mes, ...vals }));
  }, [pedidos]);

  // Cálculos do Módulo de Visitas (estilo Flamar Colchões)
  const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const mapaCalorHoras = useMemo(() => {
    const contagem = Array.from({ length: 24 }, () => 0);
    visitas.forEach((v) => {
      const h = new Date(v.created_at).getHours();
      contagem[h] = (contagem[h] || 0) + 1;
    });
    const max = Math.max(...contagem, 1);
    let topHora = 0;
    let topQtd = 0;
    contagem.forEach((qtd, h) => {
      if (qtd > topQtd) {
        topQtd = qtd;
        topHora = h;
      }
    });
    return { contagem, max, topHora, topQtd };
  }, [visitas]);

  const mapaDiasSemana = useMemo(() => {
    const contagem = [0, 0, 0, 0, 0, 0, 0];
    visitas.forEach((v) => {
      const d = new Date(v.created_at).getDay();
      contagem[d] = (contagem[d] || 0) + 1;
    });
    let topDia = 0;
    let topQtd = 0;
    contagem.forEach((qtd, idx) => {
      if (qtd > topQtd) {
        topQtd = qtd;
        topDia = idx;
      }
    });
    return { contagem, topDiaNome: DIAS_SEMANA[topDia], topQtd };
  }, [visitas]);

  const rankingProdutosVisitas = useMemo(() => {
    const mapa: Record<string, { id: string; nome: string; views: number; carrinho: number; zap: number; total: number }> = {};
    visitas.forEach((v) => {
      if (v.produto_nome) {
        const key = v.produto_nome;
        if (!mapa[key]) {
          mapa[key] = { id: v.produto_id || key, nome: key, views: 0, carrinho: 0, zap: 0, total: 0 };
        }
        if (v.acao === 'view_produto') mapa[key].views += 1;
        else if (v.acao === 'add_carrinho') mapa[key].carrinho += 1;
        else if (v.acao === 'click_whatsapp') mapa[key].zap += 1;
        else mapa[key].views += 1;
        mapa[key].total += 1;
      }
    });
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [visitas]);

  // Filtros de Pedidos Profissionais
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchStatus = filtroStatusPedido === 'todos' || p.status === filtroStatusPedido;
      const matchBusca =
        !buscaPedido ||
        p.numero_pedido.toLowerCase().includes(buscaPedido.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(buscaPedido.toLowerCase()) ||
        p.cliente_whatsapp.includes(buscaPedido);
      return matchStatus && matchBusca;
    });
  }, [pedidos, filtroStatusPedido, buscaPedido]);

  // Filtros de Leads Profissional estilo Google / Leadster
  const leadsFiltrados = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = filtroStatusLead === 'todos' || l.status === filtroStatusLead;
      const matchBusca =
        !buscaLead ||
        l.nome.toLowerCase().includes(buscaLead.toLowerCase()) ||
        l.whatsapp.includes(buscaLead) ||
        (l.email && l.email.toLowerCase().includes(buscaLead.toLowerCase())) ||
        l.interesse.toLowerCase().includes(buscaLead.toLowerCase());
      return matchStatus && matchBusca;
    });
  }, [leads, filtroStatusLead, buscaLead]);

  const handleAddProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdNome.trim()) return;
    const preco = Number(newProdPreco) || 69.9;
    salvarProduto({
      id: `prod-${Date.now()}`,
      nome: newProdNome.trim(),
      slug: newProdNome.toLowerCase().replace(/\s+/g, '-'),
      categoria: newProdCat,
      preco,
      preco_pix: Number((preco * 0.96).toFixed(2)),
      estoque: 30,
      cores: ['Preto', 'Azul Marinho', 'Marsala'],
      tamanhos: ['Único'],
      imagem_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
      descricao: 'Produto cadastrado pelo ERP Roma.',
      ativo: true,
    });
    setNewProdNome('');
  };

  const handleAddBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlogTitulo.trim()) return;
    salvarBlogPost({
      id: `blog-${Date.now()}`,
      titulo: newBlogTitulo.trim(),
      slug: newBlogTitulo.toLowerCase().replace(/\s+/g, '-'),
      categoria: 'Estilo Masculino',
      resumo: newBlogResumo.trim() || 'Dica exclusiva de moda social masculina Roma.',
      conteudo: newBlogConteudo.trim() || newBlogResumo.trim(),
      imagem_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
      tempo_leitura: '3 min',
      publicado: true,
      created_at: new Date().toISOString(),
    });
    setNewBlogTitulo('');
    setNewBlogResumo('');
    setNewBlogConteudo('');
  };

  const handleAddUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsrNome.trim() || !newUsrEmail.trim()) return;
    const senhaInicial = newUsrSenhaProv.trim() || 'Roma@2026';
    salvarUsuario({
      id: `usr-${Date.now()}`,
      nome: newUsrNome.trim(),
      email: newUsrEmail.trim().toLowerCase(),
      senha_provisoria: senhaInicial,
      precisa_trocar_senha: true,
      nivel_acesso: newUsrNivel,
      permissoes_abas: newUsrPerms,
      ativo: true,
      created_at: new Date().toISOString(),
    });
    setNewUsrNome('');
    setNewUsrEmail('');
    setNewUsrSenhaProv('Roma@2026');
    alert(`Usuário cadastrado com sucesso!\n\nE-mail: ${newUsrEmail.trim().toLowerCase()}\nSenha provisória: ${senhaInicial}\n\nO usuário deverá alterar a senha no primeiro acesso.`);
  };

  const handleUpdateUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsr) return;
    salvarUsuario(editingUsr);
    setEditingUsr(null);
    alert(`Usuário ${editingUsr.nome} atualizado com sucesso!`);
  };

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      setErroTrocaSenha('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmaNovaSenha) {
      setErroTrocaSenha('As senhas digitadas não coincidem.');
      return;
    }

    const currentEmail = sessionStorage.getItem('roma_erp_user_email') || loginEmail;
    const target = usuarios.find((u) => u.email.toLowerCase() === currentEmail.toLowerCase());

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: novaSenha });
      } catch (err) {
        console.error('Erro ao atualizar senha no Supabase:', err);
      }
    }

    if (target) {
      salvarUsuario({
        ...target,
        senha_provisoria: novaSenha,
        precisa_trocar_senha: false,
      });
    }

    setModalTrocaSenha(false);
    setNovaSenha('');
    setConfirmaNovaSenha('');
    setErroTrocaSenha('');
    alert('Senha alterada com sucesso! Você já pode utilizar o sistema com total segurança.');
  };

  const handleDeleteUsuario = (usr: RomaUsuario) => {
    if (usuarios.length <= 1) {
      alert('Não é possível excluir o único usuário administrador.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário "${usr.nome}" (${usr.email})?`)) {
      excluirUsuario(usr.id);
      if (impersonatedUser?.id === usr.id) {
        setImpersonatedUser(null);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-[#D4AF37]/30 bg-[#0F0F0F] p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)]">
          <div className="mb-6 text-center">
            <img
              src="/logo-roma.jpg"
              alt="Roma Moda Social Masculina"
              className="mx-auto h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]"
            />
            <h1 className="mt-4 text-xl font-bold tracking-tight text-white">Área do Administrador</h1>
            <p className="mt-1 text-xs text-zinc-400">Acesso restrito ao ERP e Gestão Roma</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-300">E-mail</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@roma.com.br"
                className="w-full rounded-xl border border-zinc-800 bg-[#161616] px-4 py-3 text-xs text-white outline-none transition focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-300">Senha</label>
              <input
                type="password"
                required
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-[#161616] px-4 py-3 text-xs text-white outline-none transition focus:border-[#D4AF37]"
              />
            </div>

            {loginErro && (
              <p className="rounded-lg bg-red-950/50 p-2.5 text-center text-xs font-medium text-red-400 border border-red-800/50">
                {loginErro}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C5A028] via-[#D4AF37] to-[#E5C158] py-3 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{loginLoading ? 'Verificando...' : 'Entrar no Painel'}</span>
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4AF37]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar para a Loja</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      {/* Modo Usuário Banner */}
      {impersonatedUser && (
        <div className="flex items-center justify-between bg-[#D4AF37] px-6 py-2.5 text-xs font-bold text-black">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            <span>
              MODO USUÁRIO ATIVO: Visualizando exatamente o que{' '}
              <u>{impersonatedUser.nome}</u> ({impersonatedUser.nivel_acesso}) vê.
            </span>
          </div>
          <button
            onClick={() => setImpersonatedUser(null)}
            className="flex items-center gap-1.5 rounded-full bg-black px-4 py-1 text-xs font-bold text-[#D4AF37] hover:bg-zinc-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Voltar para Visão Master</span>
          </button>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 bg-[#0D0D0D] p-5">
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/logo-roma.jpg"
              alt="Roma ERP"
              className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Roma ERP</p>
              <p className="text-[11px] text-zinc-400">{activeUser?.nome}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {allowedTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  currentTab === tab.key
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-zinc-800 pt-4 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ir para a Loja</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Sessão</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {/* ABA DASHBOARD REFORMULADA COM FLUXOS, GRÁFICOS E INDICADORES COMPLETOS */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span>Painel Executivo & Fluxos</span>
                    <span className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 px-2.5 py-0.5 text-[11px] font-bold text-[#D4AF37]">
                      Em Tempo Real
                    </span>
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Visão geral de faturamento, fluxo de pedidos, conversão de visitas e comissões.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('vendas')}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <span>Ver Pedidos</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#D4AF37]" />
                  </button>
                  <button
                    onClick={() => setActiveTab('visitas')}
                    className="flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#b8952b] transition-colors"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Ver Mapa de Calor</span>
                  </button>
                </div>
              </div>

              {/* 4 Cards de Destaque */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-400">Faturamento Bruto</p>
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-[#D4AF37]">{fmt(totalVendas)}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Baseado em {pedidos.filter((p) => p.status !== 'Cancelado').length} pedidos ativos
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-400">Comissões Calculadas</p>
                    <div className="rounded-lg bg-[#D4AF37]/10 p-2 text-[#D4AF37]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-white">{fmt(totalComissoes)}</p>
                  <p className="mt-1 text-[11px] text-amber-400">
                    {fmt(comissoesPendentes)} aguardando repasse
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-400">Visitas & Sessões</p>
                    <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-white">{visitas.length}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Pico às <strong className="text-white">{mapaCalorHoras.topHora}h</strong> ({mapaCalorHoras.topQtd} acessos)
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-400">Leads & Oportunidades</p>
                    <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-400">{leads.length}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {leads.filter((l) => l.status === 'Convertido').length} convertidos em vendas
                  </p>
                </div>
              </div>

              {/* Fluxos de Funil & Status dos Pedidos */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Funil Visual de Vendas */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                      <span>Funil de Conversão do E-commerce</span>
                    </h3>
                    <span className="text-[11px] text-zinc-400">Total: {visitas.length} acessos</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Etapa 1: Visitas */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-300">1. Visitantes do Site</span>
                        <span className="text-white">{visitas.length} (100%)</span>
                      </div>
                      <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div className="h-full bg-blue-500 rounded-full w-full" />
                      </div>
                    </div>

                    {/* Etapa 2: Visualizaram Produtos ou Adicionaram ao Carrinho */}
                    {(() => {
                      const totalProdViews = visitas.filter((v) => v.produto_nome || v.acao === 'view_produto').length || Math.round(visitas.length * 0.7);
                      const percProd = Math.min(100, Math.round((totalProdViews / Math.max(1, visitas.length)) * 100));
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-zinc-300">2. Interesse em Produto / Catálogo</span>
                            <span className="text-white">{totalProdViews} ({percProd}%)</span>
                          </div>
                          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-500" style={{ width: `${percProd}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Etapa 3: Leads ou Contato WhatsApp */}
                    {(() => {
                      const totalInteracoes = leads.length + visitas.filter((v) => v.acao === 'click_whatsapp').length;
                      const percLeads = Math.min(100, Math.round((totalInteracoes / Math.max(1, visitas.length)) * 100));
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-zinc-300">3. Contato via WhatsApp / Leads</span>
                            <span className="text-white">{totalInteracoes} ({percLeads}%)</span>
                          </div>
                          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${percLeads}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Etapa 4: Pedidos Concluídos */}
                    {(() => {
                      const pedidosValidos = pedidos.filter((p) => p.status !== 'Cancelado').length;
                      const percPedidos = Math.min(100, Math.round((pedidosValidos / Math.max(1, visitas.length)) * 100));
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-zinc-300">4. Pedidos Concluídos / Faturados</span>
                            <span className="text-emerald-400 font-bold">{pedidosValidos} ({percPedidos}%)</span>
                          </div>
                          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(8, percPedidos)}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Fluxo de Status Operacional dos Pedidos */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-[#D4AF37]" />
                      <span>Pipeline Operacional de Pedidos</span>
                    </h3>
                    <span className="text-[11px] text-[#D4AF37] font-semibold">{pedidos.length} pedidos no total</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      { status: 'Pendente', cor: 'text-zinc-400 border-zinc-700 bg-zinc-900/50' },
                      { status: 'Pago', cor: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
                      { status: 'Em Separação', cor: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                      { status: 'Enviado', cor: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
                      { status: 'Entregue', cor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                      { status: 'Cancelado', cor: 'text-red-400 border-red-500/30 bg-red-500/10' },
                    ].map((st) => {
                      const count = pedidos.filter((p) => p.status === st.status).length;
                      const subtotal = pedidos
                        .filter((p) => p.status === st.status)
                        .reduce((s, p) => s + p.total, 0);
                      return (
                        <div
                          key={st.status}
                          onClick={() => {
                            setFiltroStatusPedido(st.status);
                            setActiveTab('vendas');
                          }}
                          className={`cursor-pointer rounded-xl border p-3 transition-transform hover:scale-[1.02] ${st.cor}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{st.status}</span>
                            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-extrabold">
                              {count}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold">{fmt(subtotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gráfico de Evolução Mensal e Top Produtos */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Gráfico de Barras Simplificado de Faturamento e Comissões */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                        <span>Evolução do Faturamento & Comissões</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">Comparativo mês a mês gerado a partir dos pedidos</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {evolucaoComissoes.length === 0 ? (
                      <p className="text-center py-8 text-xs text-zinc-500">Nenhum dado mensal registrado ainda.</p>
                    ) : (
                      evolucaoComissoes.map((item) => {
                        const maxFat = Math.max(...evolucaoComissoes.map((e) => e.faturamento), 100);
                        const percFat = Math.min(100, Math.round((item.faturamento / maxFat) * 100));
                        return (
                          <div key={item.mes} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold uppercase text-[#D4AF37]">{item.mes}</span>
                              <div className="flex gap-4">
                                <span className="text-zinc-400">
                                  Vendas: <strong className="text-white">{fmt(item.faturamento)}</strong>
                                </span>
                                <span className="text-emerald-400">
                                  Comissões: <strong>{fmt(item.comissao)}</strong>
                                </span>
                              </div>
                            </div>
                            <div className="h-4 w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative flex">
                              <div
                                className="h-full bg-gradient-to-r from-[#8C6D1F] to-[#D4AF37] rounded-lg transition-all duration-500"
                                style={{ width: `${percFat}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top 3 Produtos Mais Desejados */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                      <span>Produtos em Alta</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('visitas')}
                      className="text-[10px] text-[#D4AF37] hover:underline"
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rankingProdutosVisitas.slice(0, 4).map((p, idx) => (
                      <div
                        key={p.nome}
                        className="rounded-xl border border-zinc-800/80 bg-[#141414] p-3 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate text-[11px]">
                            #{idx + 1} {p.nome}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400">
                            <span>{p.views} views</span>
                            <span>•</span>
                            <span className="text-[#D4AF37]">{p.carrinho} carrinhos</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            {p.zap} chats
                          </span>
                        </div>
                      </div>
                    ))}
                    {rankingProdutosVisitas.length === 0 && (
                      <p className="text-zinc-500 text-xs py-4 text-center">Nenhuma interação registrada ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA VENDAS & PEDIDOS PROFISSIONAL */}
          {currentTab === 'vendas' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 text-[#D4AF37]" />
                    <span>Gestão Profissional de Pedidos</span>
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Acompanhe status em tempo real, despachos, dados de entrega e detalhes de cada venda.
                  </p>
                </div>

                {/* Filtros Rápidos */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Buscar por #pedido, cliente, zap..."
                      value={buscaPedido}
                      onChange={(e) => setBuscaPedido(e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-black pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
                    {['todos', 'Pendente', 'Pago', 'Em Separação', 'Enviado', 'Entregue', 'Cancelado'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFiltroStatusPedido(st)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          filtroStatusPedido === st
                            ? 'bg-[#D4AF37] text-black shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st === 'todos' ? 'Todos' : st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabela Rica de Pedidos */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111111] shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                    <tr>
                      <th className="p-4">Pedido / Data</th>
                      <th className="p-4">Cliente & Contato</th>
                      <th className="p-4">Itens Comprados</th>
                      <th className="p-4">Entrega / CEP</th>
                      <th className="p-4">Total / Pagto</th>
                      <th className="p-4">Status & Despacho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {pedidosFiltrados.map((p) => {
                      const dt = new Date(p.created_at);
                      const dataFormatada = dt.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-4 align-top">
                            <span className="font-bold text-[#D4AF37] text-sm block">
                              {p.numero_pedido}
                            </span>
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {dataFormatada}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <p className="font-bold text-white text-sm">{p.cliente_nome}</p>
                            <p className="text-zinc-400 text-[11px]">{p.cliente_email}</p>
                            <a
                              href={`https://wa.me/55${p.cliente_whatsapp.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(
                                p.cliente_nome
                              )},%20sou%20da%20Roma%20Gravataria%20sobre%20o%20seu%20pedido%20${p.numero_pedido}!`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline mt-1"
                            >
                              <Phone className="h-3 w-3" />
                              {p.cliente_whatsapp}
                            </a>
                          </td>
                          <td className="p-4 align-top max-w-xs">
                            <div className="space-y-1">
                              {p.itens?.map((it, idx) => (
                                <div key={idx} className="text-zinc-300 text-[11px] flex justify-between gap-2 border-b border-zinc-800/60 pb-1">
                                  <span className="truncate">
                                    <strong className="text-white">{it.quantidade}x</strong> {it.nome}
                                    {it.tamanho ? ` (${it.tamanho})` : ''}
                                  </span>
                                  <span className="text-zinc-400 whitespace-nowrap">{fmt(it.preco_unitario * it.quantidade)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 align-top text-zinc-300 max-w-xs">
                            <p className="font-medium text-white text-[11px]">{p.endereco || 'Retirada / A combinar'}</p>
                            {p.cep && <p className="text-[10px] text-zinc-500 font-mono mt-0.5">CEP: {p.cep}</p>}
                            <span className="inline-block mt-1.5 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300">
                              Frete: {p.frete === 0 ? 'Grátis' : fmt(p.frete)}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <span className="text-sm font-extrabold text-[#D4AF37] block">
                              {fmt(p.total)}
                            </span>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">
                              {p.forma_pagamento}
                            </span>
                            <span className="text-[10px] text-emerald-400/90 block mt-1">
                              Comissão: {fmt(p.comissao_valor)} ({p.comissao_percentual}%)
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <select
                              value={p.status}
                              onChange={(e) =>
                                atualizarPedidoStatus(p.id, e.target.value as typeof p.status)
                              }
                              className={`rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none ${
                                p.status === 'Pago'
                                  ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                                  : p.status === 'Em Separação'
                                  ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                                  : p.status === 'Enviado'
                                  ? 'border-purple-500/40 bg-purple-950/40 text-purple-300'
                                  : p.status === 'Entregue'
                                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                                  : p.status === 'Cancelado'
                                  ? 'border-red-500/40 bg-red-950/40 text-red-300'
                                  : 'border-zinc-700 bg-black text-zinc-300'
                              }`}
                            >
                              <option value="Pendente">🟡 Pendente</option>
                              <option value="Pago">🔵 Pago</option>
                              <option value="Em Separação">🟠 Em Separação</option>
                              <option value="Enviado">🟣 Enviado / Em Trânsito</option>
                              <option value="Entregue">🟢 Entregue</option>
                              <option value="Cancelado">🔴 Cancelado</option>
                            </select>

                            <button
                              onClick={() => toggleComissaoPaga(p.id)}
                              className={`mt-2 block w-full rounded-lg border px-2 py-1 text-[10px] font-bold text-center transition-colors ${
                                p.comissao_paga
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                              }`}
                            >
                              {p.comissao_paga ? 'Comissão Repassada ✓' : 'Repassar Comissão'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pedidosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          Nenhum pedido encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA MINHAS COMISSÕES REFORMULADA COM FILTRO DE MÊS, CARDS E EVOLUÇÃO */}
          {currentTab === 'comissoes' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-[#D4AF37]" />
                    <span>Minhas Comissões & Repasses</span>
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Acompanhe valores calculados, percentuais por pedido e evolução mensal dos repasses.
                  </p>
                </div>

                {/* Filtro por Mês */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs">
                    <Calendar className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-zinc-400">Filtrar por Mês:</span>
                    <select
                      value={mesComissao}
                      onChange={(e) => setMesComissao(e.target.value)}
                      className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="todos">Todos os Meses</option>
                      {mesesComissoesDisponiveis.map((m) => (
                        <option key={m} value={m} className="bg-black text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-[#D4AF37]/40 bg-[#161616] px-4 py-2 text-xs text-zinc-300">
                    % Padrão Ativa:{' '}
                    <strong className="text-[#D4AF37] font-bold">
                      {config?.comissao_padrao_percentual || 12}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4 Cards de Totais da Comissão Selecionada */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5">
                  <p className="text-xs text-zinc-400">Faturamento no Período</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {fmt(metricasComissao.faturamento)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {metricasComissao.qtdPedidos} pedidos contabilizados
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#141414] p-5">
                  <p className="text-xs text-[#E5C158] font-semibold">Total de Comissão Gerada</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#D4AF37]">
                    {fmt(metricasComissao.totalComissao)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">Direito do vendedor/gerente</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-[#121212] p-5">
                  <p className="text-xs text-emerald-400 font-semibold">Comissões Pagas / Repassadas</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                    {fmt(metricasComissao.paga)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">Liquidadas e confirmadas</p>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-[#121212] p-5">
                  <p className="text-xs text-amber-400 font-semibold">Saldo a Receber / Pendente</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-400">
                    {fmt(metricasComissao.pendente)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">Aguardando liberação de repasse</p>
                </div>
              </div>

              {/* Gráfico de Evolução e Detalhamento */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Visualizador de Evolução */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4 lg:col-span-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                    <span>Evolução dos Repasses</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Distribuição dos ganhos de comissão apurados mês a mês.
                  </p>

                  <div className="space-y-4 pt-2">
                    {evolucaoComissoes.map((item) => {
                      const maxCom = Math.max(...evolucaoComissoes.map((e) => e.comissao), 10);
                      const perc = Math.min(100, Math.round((item.comissao / maxCom) * 100));
                      return (
                        <div key={item.mes} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white uppercase">{item.mes}</span>
                            <span className="font-extrabold text-[#D4AF37]">{fmt(item.comissao)}</span>
                          </div>
                          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div
                              className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                              style={{ width: `${perc}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela de Pedidos e Comissões Detalhada */}
                <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4 lg:col-span-2">
                  <h3 className="text-sm font-bold text-white">Extrato de Pedidos com Comissão</h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                        <tr>
                          <th className="p-3">Pedido</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Faturamento</th>
                          <th className="p-3">% Aplicada</th>
                          <th className="p-3">Valor Comissão</th>
                          <th className="p-3">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {pedidosComissaoFiltrados.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-900/30">
                            <td className="p-3 font-bold text-[#D4AF37]">{p.numero_pedido}</td>
                            <td className="p-3 text-zinc-400">
                              {new Date(p.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3 font-medium text-white">{fmt(p.total)}</td>
                            <td className="p-3 text-zinc-300">{p.comissao_percentual}%</td>
                            <td className="p-3 font-extrabold text-emerald-400">
                              {fmt(p.comissao_valor)}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => toggleComissaoPaga(p.id)}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                                  p.comissao_paga
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                }`}
                              >
                                {p.comissao_paga ? 'Paga ✓' : 'Marcar Paga'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'produtos' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Produtos & Estoque</h1>
              <form
                onSubmit={handleAddProduto}
                className="grid gap-3 rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:grid-cols-4"
              >
                <input
                  required
                  placeholder="Nome do produto"
                  value={newProdNome}
                  onChange={(e) => setNewProdNome(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs"
                />
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value as typeof newProdCat)}
                  className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs"
                >
                  <option value="Gravatas Slim">Gravatas Slim</option>
                  <option value="Camisas Sociais">Camisas Sociais</option>
                  <option value="Kits Noivo & Padrinhos">Kits Noivo & Padrinhos</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={newProdPreco}
                  onChange={(e) => setNewProdPreco(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold text-black"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Produto</span>
                </button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {produtos.map((p) => (
                  <div key={p.id} className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121212] p-4 text-xs">
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <img
                          src={p.imagem_url}
                          alt={p.nome}
                          className="h-14 w-14 rounded-xl object-cover border border-zinc-800"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#D4AF37]">{p.categoria}</p>
                          <p className="truncate text-sm font-bold text-white">{p.nome}</p>
                        </div>
                      </div>
                      <p className="text-zinc-400">
                        Preço: <strong className="text-white">{fmt(p.preco)}</strong> • Pix:{' '}
                        <strong className="text-emerald-400">{fmt(p.preco_pix)}</strong>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-zinc-400">Estoque:</span>
                        <button
                          onClick={() => salvarProduto({ ...p, estoque: Math.max(0, p.estoque - 1) })}
                          className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800"
                        >
                          -
                        </button>
                        <strong className={p.estoque <= 5 ? 'text-red-400' : 'text-white'}>
                          {p.estoque}
                        </strong>
                        <button
                          onClick={() => salvarProduto({ ...p, estoque: p.estoque + 1 })}
                          className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingProd(p)}
                      className="mt-3 w-full rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 py-1.5 font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                    >
                      Editar Item & Foto
                    </button>
                  </div>
                ))}
              </div>

              {editingProd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#111111] p-5 text-xs text-white space-y-3">
                    <p className="text-sm font-bold text-[#D4AF37]">Editar Produto</p>
                    <input
                      value={editingProd.nome}
                      onChange={(e) => setEditingProd({ ...editingProd, nome: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2"
                      placeholder="Nome"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingProd.preco}
                        onChange={(e) => {
                          const preco = Number(e.target.value) || 0;
                          setEditingProd({
                            ...editingProd,
                            preco,
                            preco_pix: Number((preco * 0.96).toFixed(2)),
                          });
                        }}
                        className="rounded-lg border border-zinc-700 bg-black px-3 py-2"
                        placeholder="Preço"
                      />
                      <input
                        type="number"
                        value={editingProd.estoque}
                        onChange={(e) =>
                          setEditingProd({ ...editingProd, estoque: Number(e.target.value) || 0 })
                        }
                        className="rounded-lg border border-zinc-700 bg-black px-3 py-2"
                        placeholder="Estoque"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-zinc-400">
                        Foto (otimizada automaticamente para WebP)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImg(true);
                          try {
                            const url = await compressAndUploadImage(file, 'produtos');
                            setEditingProd((prev) => (prev ? { ...prev, imagem_url: url } : null));
                          } finally {
                            setUploadingImg(false);
                          }
                        }}
                        className="w-full text-zinc-300"
                      />
                      {uploadingImg && <p className="mt-1 text-[#D4AF37]">Comprimindo e enviando...</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingProd(null)}
                        className="rounded-lg border border-zinc-700 px-4 py-2"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          salvarProduto(editingProd);
                          setEditingProd(null);
                        }}
                        className="rounded-lg bg-[#D4AF37] px-4 py-2 font-bold text-black"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA CONTROLE DE VISITAS COM MAPA DE CALOR (ESTILO FLAMAR COLCHÕES) */}
          {currentTab === 'visitas' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-[#D4AF37]" />
                    <span>Controle de Visitas & Mapa de Calor</span>
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Padrão analítico com matriz de horários 24h, dias da semana e ranking de produtos mais vistos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-zinc-800 bg-[#141414] px-4 py-2 text-xs">
                    Total de Sessões: <strong className="text-white font-bold">{visitas.length}</strong>
                  </div>
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#141414] px-4 py-2 text-xs">
                    Dia de Pico: <strong className="text-[#D4AF37] font-bold">{mapaDiasSemana.topDiaNome}</strong>
                  </div>
                </div>
              </div>

              {/* 3 Cards de Indicadores Rápidos de Acesso */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#D4AF37]" />
                    <span>Horário Mais Acessado</span>
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-white">
                    {mapaCalorHoras.topHora}:00 às {mapaCalorHoras.topHora}:59
                  </p>
                  <p className="mt-1 text-[11px] text-[#D4AF37]">
                    {mapaCalorHoras.topQtd} acessos concentrados nesta faixa
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span>Dia Mais Movimentado</span>
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-white">{mapaDiasSemana.topDiaNome}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {mapaDiasSemana.topQtd} visitas registradas
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Produto Destaque da Vitrine</span>
                  </p>
                  <p className="mt-2 text-base font-extrabold text-emerald-400 truncate">
                    {rankingProdutosVisitas[0]?.nome || 'Gravata Slim Seda Italiana'}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {rankingProdutosVisitas[0]?.total || 0} ações de interesse
                  </p>
                </div>
              </div>

              {/* MAPA DE CALOR: Distribuição pelas 24 Horas do Dia */}
              <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#D4AF37]" />
                      <span>Mapa de Calor por Horário (00h - 23h)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Intensidade de fluxo ao longo das 24 horas do dia
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <span>Menos ativo</span>
                    <span className="h-2.5 w-5 rounded bg-zinc-900 border border-zinc-800" />
                    <span className="h-2.5 w-5 rounded bg-[#8C6D1F]" />
                    <span className="h-2.5 w-5 rounded bg-[#D4AF37]" />
                    <span>Pico</span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5 pt-2">
                  {mapaCalorHoras.contagem.map((qtd, hora) => {
                    const ratio = qtd / mapaCalorHoras.max;
                    let bg = 'bg-zinc-900 text-zinc-500 border-zinc-800';
                    if (ratio > 0.75) bg = 'bg-[#D4AF37] text-black font-extrabold shadow-lg shadow-[#D4AF37]/20 border-[#E5C158]';
                    else if (ratio > 0.4) bg = 'bg-[#AA8222] text-white font-bold border-[#8C6D1F]';
                    else if (ratio > 0.1) bg = 'bg-[#554111] text-amber-200 border-[#664E14]';
                    else if (qtd > 0) bg = 'bg-zinc-800 text-zinc-300 border-zinc-700';

                    return (
                      <div
                        key={hora}
                        className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-transform hover:scale-110 ${bg}`}
                      >
                        <span className="text-[10px] opacity-80">{String(hora).padStart(2, '0')}h</span>
                        <span className="text-xs mt-0.5">{qtd}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MAPA DE CALOR: Dias da Semana */}
              <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#D4AF37]" />
                      <span>Frequência por Dia da Semana</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">Comportamento semanal de acessos e decisões de compra</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
                  {DIAS_SEMANA.map((diaNome, idx) => {
                    const qtd = mapaDiasSemana.contagem[idx];
                    const maxDia = Math.max(...mapaDiasSemana.contagem, 1);
                    const perc = Math.round((qtd / maxDia) * 100);
                    const isTop = qtd === mapaDiasSemana.topQtd && qtd > 0;
                    return (
                      <div
                        key={diaNome}
                        className={`rounded-xl border p-3 flex flex-col justify-between ${
                          isTop
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-zinc-800 bg-[#141414]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{diaNome}</span>
                            {isTop && (
                              <span className="rounded bg-[#D4AF37] px-1.5 py-0.2 text-[9px] font-extrabold text-black">
                                PICO
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xl font-extrabold text-[#D4AF37]">{qtd}</p>
                          <p className="text-[10px] text-zinc-400">acessos</p>
                        </div>
                        <div className="mt-3 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isTop ? 'bg-[#D4AF37]' : 'bg-zinc-600'}`}
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RANKING DOS PRODUTOS MAIS VISTOS E AÇÕES */}
              <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                      <span>Ranking de Produtos Mais Vistos & Ações</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Rastreamento de visualizações de produto, adição ao carrinho e cliques em WhatsApp
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                      <tr>
                        <th className="p-3.5">Posição & Produto</th>
                        <th className="p-3.5 text-center">Visualizações</th>
                        <th className="p-3.5 text-center">Add ao Carrinho</th>
                        <th className="p-3.5 text-center">Cliques no WhatsApp</th>
                        <th className="p-3.5 text-right">Total Interações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {rankingProdutosVisitas.map((prod, idx) => (
                        <tr key={prod.nome} className="hover:bg-zinc-900/40">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${
                                idx === 0
                                  ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/30'
                                  : idx === 1
                                  ? 'bg-zinc-400 text-black'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span>{prod.nome}</span>
                          </td>
                          <td className="p-3.5 text-center text-zinc-300 font-medium">
                            {prod.views}
                          </td>
                          <td className="p-3.5 text-center text-[#D4AF37] font-bold">
                            {prod.carrinho}
                          </td>
                          <td className="p-3.5 text-center text-emerald-400 font-bold">
                            {prod.zap}
                          </td>
                          <td className="p-3.5 text-right font-extrabold text-white text-sm">
                            {prod.total}
                          </td>
                        </tr>
                      ))}
                      {rankingProdutosVisitas.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500">
                            Nenhum produto rastreado ainda. Os acessos no site alimentarão este ranking automaticamente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Registro Completo das Últimas Sessões */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111111]">
                <div className="border-b border-zinc-800 bg-[#161616] p-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Log de Visitas em Tempo Real
                  </h3>
                  <span className="text-[11px] text-zinc-400">Exibindo as mais recentes</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-[#141414] text-zinc-400">
                    <tr>
                      <th className="p-3.5">Página</th>
                      <th className="p-3.5">Produto Envolvido</th>
                      <th className="p-3.5">Ação Rastreio</th>
                      <th className="p-3.5">Origem / UTM</th>
                      <th className="p-3.5">Dispositivo</th>
                      <th className="p-3.5">Data / Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {visitas.slice(0, 30).map((v) => (
                      <tr key={v.id} className="hover:bg-zinc-900/30">
                        <td className="p-3.5 font-semibold text-[#D4AF37]">{v.pagina}</td>
                        <td className="p-3.5 text-white">{v.produto_nome || '—'}</td>
                        <td className="p-3.5">
                          {v.acao ? (
                            <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                              {v.acao}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-zinc-300">{v.origem_utm}</td>
                        <td className="p-3.5 text-zinc-400">{v.dispositivo}</td>
                        <td className="p-3.5 text-zinc-400">
                          {new Date(v.created_at).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA LEADS PROFISSIONAL ESTILO GOOGLE / LEADSTER */}
          {currentTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-[#D4AF37]" />
                    <span>Gestão de Leads & Oportunidades</span>
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Padrão CRM Leadster / Google: qualificação de interesse, status de funil e abordagem rápida via WhatsApp.
                  </p>
                </div>

                {/* Filtros Rápidos */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Buscar lead, fone, email ou produto..."
                      value={buscaLead}
                      onChange={(e) => setBuscaLead(e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-black pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
                    {['todos', 'Novo', 'Em Atendimento', 'Convertido', 'Perdido'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFiltroStatusLead(st)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          filtroStatusLead === st
                            ? 'bg-[#D4AF37] text-black shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st === 'todos' ? 'Todos' : st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4 Cards de Métricas do Funil Leadster */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-blue-500/20 bg-[#121212] p-4">
                  <p className="text-xs text-blue-400 font-semibold">1. Novos Contatos</p>
                  <p className="mt-1 text-2xl font-extrabold text-white">
                    {leads.filter((l) => l.status === 'Novo').length}
                  </p>
                  <p className="text-[10px] text-zinc-400">Aguardando 1º contato imediato</p>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-[#121212] p-4">
                  <p className="text-xs text-amber-400 font-semibold">2. Em Atendimento</p>
                  <p className="mt-1 text-2xl font-extrabold text-white">
                    {leads.filter((l) => l.status === 'Em Atendimento').length}
                  </p>
                  <p className="text-[10px] text-zinc-400">Negociação / Escolha de kits</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-[#121212] p-4">
                  <p className="text-xs text-emerald-400 font-semibold">3. Convertidos em Venda</p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                    {leads.filter((l) => l.status === 'Convertido').length}
                  </p>
                  <p className="text-[10px] text-zinc-400">Sucesso total de fechamento</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
                  <p className="text-xs text-zinc-400 font-semibold">Taxa de Conversão</p>
                  <p className="mt-1 text-2xl font-extrabold text-[#D4AF37]">
                    {leads.length > 0
                      ? Math.round(
                          (leads.filter((l) => l.status === 'Convertido').length / leads.length) * 100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-[10px] text-zinc-500">Benchmark excelente</p>
                </div>
              </div>

              {/* Grid de Cards de Leads Estilo Google / Leadster */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leadsFiltrados.map((l) => {
                  const zapLimpo = l.whatsapp.replace(/\D/g, '');
                  const mensagemLead = encodeURIComponent(
                    `Olá ${l.nome}! Tudo bem? Sou atendente da Roma Gravataria e Moda Social Masculina. Vi seu interesse em "${l.interesse}". Como posso te ajudar hoje?`
                  );
                  return (
                    <div
                      key={l.id}
                      className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121212] p-5 shadow-xl hover:border-zinc-700 transition-colors"
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#D4AF37]">
                              Lead #{l.id.slice(-4)}
                            </span>
                            <h3 className="font-bold text-white text-base truncate">{l.nome}</h3>
                            <p className="text-zinc-400 text-xs flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              {new Date(l.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          <select
                            value={l.status}
                            onChange={(e) =>
                              atualizarLeadStatus(l.id, e.target.value as typeof l.status)
                            }
                            className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold focus:outline-none ${
                              l.status === 'Novo'
                                ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                                : l.status === 'Em Atendimento'
                                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                                : l.status === 'Convertido'
                                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                                : 'border-zinc-700 bg-black text-zinc-400'
                            }`}
                          >
                            <option value="Novo">🔵 Novo</option>
                            <option value="Em Atendimento">🟠 Em Atendimento</option>
                            <option value="Convertido">🟢 Convertido</option>
                            <option value="Perdido">⚫ Perdido</option>
                          </select>
                        </div>

                        {/* Dados de Contato e Interesse */}
                        <div className="space-y-2.5 py-3 text-xs">
                          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                            <p className="text-[10px] font-bold uppercase text-zinc-500">
                              Produto / Interesse Detectado
                            </p>
                            <p className="mt-1 font-semibold text-[#D4AF37] text-sm">
                              {l.interesse}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg bg-zinc-900/50 p-2">
                              <span className="text-zinc-500 block text-[10px]">Origem / Canal:</span>
                              <span className="font-medium text-white truncate block">
                                {l.origem || 'Site / WhatsApp'}
                              </span>
                            </div>
                            <div className="rounded-lg bg-zinc-900/50 p-2">
                              <span className="text-zinc-500 block text-[10px]">E-mail:</span>
                              <span className="font-medium text-zinc-300 truncate block">
                                {l.email || 'Não informado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ações Rápidas de Abordagem */}
                      <div className="border-t border-zinc-800/80 pt-3 flex items-center gap-2">
                        <a
                          href={`https://wa.me/55${zapLimpo}?text=${mensagemLead}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Chamar no WhatsApp</span>
                        </a>

                        <button
                          onClick={() => {
                            const novoStatus =
                              l.status === 'Novo'
                                ? 'Em Atendimento'
                                : l.status === 'Em Atendimento'
                                ? 'Convertido'
                                : 'Em Atendimento';
                            atualizarLeadStatus(l.id, novoStatus);
                          }}
                          title="Avançar status"
                          className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:text-white hover:border-[#D4AF37]"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {leadsFiltrados.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-zinc-800 bg-[#121212] p-8 text-center text-zinc-500">
                    Nenhum lead encontrado com o termo ou status selecionado.
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'blog' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Editor do Blog de Moda Masculina</h1>
              <form
                onSubmit={handleAddBlog}
                className="space-y-3 rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-xs"
              >
                <input
                  required
                  placeholder="Título do artigo"
                  value={newBlogTitulo}
                  onChange={(e) => setNewBlogTitulo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2"
                />
                <input
                  placeholder="Resumo curto"
                  value={newBlogResumo}
                  onChange={(e) => setNewBlogResumo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2"
                />
                <textarea
                  rows={3}
                  placeholder="Conteúdo completo do artigo..."
                  value={newBlogConteudo}
                  onChange={(e) => setNewBlogConteudo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#D4AF37] px-5 py-2 font-bold text-black"
                >
                  Publicar Artigo
                </button>
              </form>

              <div className="space-y-3">
                {blogPosts.map((b) => (
                  <div key={b.id} className="rounded-xl border border-zinc-800 bg-[#121212] p-4 text-xs">
                    <p className="text-sm font-bold text-white">{b.titulo}</p>
                    <p className="mt-1 text-zinc-400">{b.resumo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'configuracoes' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Configurações Gerais, WhatsApp & Usuários</h1>

              {/* CARD DE CONFIGURAÇÃO DO WHATSAPP DE ATENDIMENTO E COMISSÕES */}
              <form
                onSubmit={handleSalvarConfiguracoes}
                className="space-y-4 rounded-2xl border border-[#D4AF37]/40 bg-[#121212] p-5 text-xs shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>Atendimento WhatsApp & Comissão Global</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Configure o número oficial do WhatsApp onde os clientes serão atendidos e a frase inicial de boas-vindas.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400">
                    Ativo no Site & Bot
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Número WhatsApp (DDI + DDD + Número)
                    </label>
                    <input
                      required
                      placeholder="Ex: 5511999998888"
                      value={formZapNumero}
                      onChange={(e) => setFormZapNumero(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white font-mono"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">Apenas números. Ex: 5511999998888</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Exibição Visual (Header / Rodapé)
                    </label>
                    <input
                      required
                      placeholder="Ex: (11) 99999-8888"
                      value={formZapDisplay}
                      onChange={(e) => setFormZapDisplay(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">Como o número aparece para o cliente</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Porcentagem Padrão de Comissão (%)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      value={formComissaoPerc}
                      onChange={(e) => setFormComissaoPerc(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white font-bold"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">Aplicada automaticamente a novos pedidos</p>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Mensagem Padrão de Início do Cliente
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formZapMsg}
                    onChange={(e) => setFormZapMsg(e.target.value)}
                    placeholder="Ex: Olá! Vim do site Roma Gravataria e quero falar com um atendente:"
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">
                    O cliente iniciará a conversa com esta frase, seguida da dúvida dele ou produto escolhido.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>Preview do Link:</span>
                    <code className="rounded bg-black px-2 py-0.5 text-[10px] text-[#D4AF37] font-mono truncate max-w-sm">
                      https://wa.me/{formZapNumero.replace(/\D/g, '')}?text={encodeURIComponent(formZapMsg)}
                    </code>
                  </div>
                  <button
                    type="submit"
                    disabled={salvandoConfig}
                    className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-5 py-2 font-bold text-black hover:bg-[#E5C158] transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{salvandoConfig ? 'Salvando...' : 'Salvar Configurações'}</span>
                  </button>
                </div>
              </form>

              {/* Novo Usuário */}
              <form
                onSubmit={handleAddUsuario}
                className="space-y-4 rounded-2xl border border-zinc-800 bg-[#111111] p-5 text-xs"
              >
                <div>
                  <p className="text-sm font-bold text-[#D4AF37]">Cadastrar Novo Usuário</p>
                  <p className="text-[11px] text-zinc-400">
                    Defina o acesso e a senha provisória. No primeiro login, o sistema exigirá que o usuário crie uma nova senha pessoal.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    required
                    placeholder="Nome"
                    value={newUsrNome}
                    onChange={(e) => setNewUsrNome(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                  />
                  <input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={newUsrEmail}
                    onChange={(e) => setNewUsrEmail(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                  />
                  <input
                    required
                    placeholder="Senha Provisória"
                    value={newUsrSenhaProv}
                    onChange={(e) => setNewUsrSenhaProv(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white font-mono"
                  />
                  <select
                    value={newUsrNivel}
                    onChange={(e) => setNewUsrNivel(e.target.value as RomaUsuario['nivel_acesso'])}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                  >
                    <option value="Vendedor">Vendedor</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Editor">Editor</option>
                    <option value="Master">Master</option>
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-zinc-400">Permissões de Abas:</p>
                  <div className="flex flex-wrap gap-2">
                    {TAB_CONFIG.map((t) => (
                      <label
                        key={t.key}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={newUsrPerms[t.key]}
                          onChange={(e) =>
                            setNewUsrPerms((prev) => ({ ...prev, [t.key]: e.target.checked }))
                          }
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-[#D4AF37] px-5 py-2 font-bold text-black hover:bg-[#E5C158] transition"
                >
                  Salvar Usuário & Gerar Acesso
                </button>
              </form>

              {/* Lista de Usuários com Botões de Editar, Excluir e Modo Usuário */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-zinc-300">Usuários Cadastrados ({usuarios.length})</h2>
                  <span className="text-[11px] text-zinc-500">
                    Sincronizado com Supabase Auth & RLS
                  </span>
                </div>

                {usuarios.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#121212] p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{u.nome}</p>
                        <span className="rounded-full bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                          {u.nivel_acesso}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{u.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {TAB_CONFIG.filter((t) => u.permissoes_abas[t.key]).map((t) => (
                          <span
                            key={t.key}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingUsr(u)}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
                        title="Editar Usuário"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>

                      {u.id !== masterUser?.id && (
                        <>
                          <button
                            onClick={() => setImpersonatedUser(u)}
                            className="flex items-center gap-1.5 rounded-xl border border-[#D4AF37] bg-[#D4AF37]/10 px-3 py-2 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
                            title="Testar visão deste usuário"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Modo Usuário</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUsuario(u)}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500 hover:text-white"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Excluir</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal de Edição de Usuário */}
              {editingUsr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[#111111] p-6 shadow-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[#D4AF37]">Editar Usuário</h3>
                        <p className="text-xs text-zinc-400">Atualize dados e permissões do usuário</p>
                      </div>
                      <button
                        onClick={() => setEditingUsr(null)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleUpdateUsuario} className="mt-4 space-y-4 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1">Nome Completo</label>
                        <input
                          required
                          value={editingUsr.nome}
                          onChange={(e) => setEditingUsr({ ...editingUsr, nome: e.target.value })}
                          className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1">E-mail (Login)</label>
                          <input
                            required
                            type="email"
                            value={editingUsr.email}
                            onChange={(e) => setEditingUsr({ ...editingUsr, email: e.target.value.toLowerCase() })}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Nível de Acesso</label>
                          <select
                            value={editingUsr.nivel_acesso}
                            onChange={(e) =>
                              setEditingUsr({
                                ...editingUsr,
                                nivel_acesso: e.target.value as RomaUsuario['nivel_acesso'],
                              })
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
                          >
                            <option value="Vendedor">Vendedor</option>
                            <option value="Gerente">Gerente</option>
                            <option value="Editor">Editor</option>
                            <option value="Master">Master</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1">Redefinir Senha Provisória</label>
                          <input
                            type="text"
                            placeholder="Deixe em branco para manter a atual"
                            value={editingUsr.senha_provisoria || ''}
                            onChange={(e) => setEditingUsr({ ...editingUsr, senha_provisoria: e.target.value, precisa_trocar_senha: true })}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white font-mono text-xs"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingUsr.precisa_trocar_senha}
                              onChange={(e) => setEditingUsr({ ...editingUsr, precisa_trocar_senha: e.target.checked })}
                            />
                            <span>Exigir troca de senha no próximo login</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <p className="block text-zinc-400 mb-2">Permissões de Abas:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {TAB_CONFIG.map((t) => (
                            <label
                              key={t.key}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300"
                            >
                              <input
                                type="checkbox"
                                checked={editingUsr.permissoes_abas[t.key]}
                                onChange={(e) =>
                                  setEditingUsr({
                                    ...editingUsr,
                                    permissoes_abas: {
                                      ...editingUsr.permissoes_abas,
                                      [t.key]: e.target.checked,
                                    },
                                  })
                                }
                              />
                              <span>{t.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setEditingUsr(null)}
                          className="rounded-xl border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-[#D4AF37] px-5 py-2 font-bold text-black hover:bg-[#E5C158]"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal Obrigatório de Troca de Senha Provisória */}
              {modalTrocaSenha && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                  <div className="w-full max-w-md rounded-2xl border border-[#D4AF37] bg-[#121212] p-6 shadow-2xl">
                    <div className="text-center pb-4 border-b border-zinc-800">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="font-serif text-lg font-bold text-white">Cadastre sua Nova Senha</h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        Por segurança, você está usando uma senha provisória e precisa cadastrar sua senha pessoal definitiva para continuar.
                      </p>
                    </div>

                    <form onSubmit={handleSalvarNovaSenha} className="mt-5 space-y-4 text-xs">
                      {erroTrocaSenha && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-center text-xs text-rose-400">
                          {erroTrocaSenha}
                        </div>
                      )}

                      <div>
                        <label className="block text-zinc-300 mb-1 font-semibold">Nova Senha</label>
                        <input
                          type="password"
                          required
                          placeholder="Mínimo de 6 caracteres"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 mb-1 font-semibold">Confirmar Nova Senha</label>
                        <input
                          type="password"
                          required
                          placeholder="Repita a nova senha"
                          value={confirmaNovaSenha}
                          onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-gradient-to-r from-[#C5A028] via-[#D4AF37] to-[#E5C158] py-3 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110"
                        >
                          Gravar Senha e Liberar Painel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
