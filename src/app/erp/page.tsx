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
} from 'lucide-react';
import { useRomaStore } from '@/lib/romaStore';
import { TabKey, RomaUsuario, PermissoesAbas, RomaProduto } from '@/types/roma';
import { compressAndUploadImage } from '@/lib/imageUpload';

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
    atualizarPedidoStatus,
    toggleComissaoPaga,
    atualizarLeadStatus,
    salvarProduto,
    salvarBlogPost,
    salvarUsuario,
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'admin@roma.com.br' && loginSenha === 'roma2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('roma_erp_auth', 'true');
      setLoginErro('');
    } else {
      setLoginErro('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('roma_erp_auth');
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

  // New User Form
  const [newUsrNome, setNewUsrNome] = useState('');
  const [newUsrEmail, setNewUsrEmail] = useState('');
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

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalVendas = pedidos.reduce((s, p) => (p.status !== 'Cancelado' ? s + p.total : s), 0);
  const totalComissoes = pedidos.reduce((s, p) => (p.status !== 'Cancelado' ? s + p.comissao_valor : s), 0);
  const comissoesPendentes = pedidos.reduce(
    (s, p) => (p.status !== 'Cancelado' && !p.comissao_paga ? s + p.comissao_valor : s),
    0
  );

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
    salvarUsuario({
      id: `usr-${Date.now()}`,
      nome: newUsrNome.trim(),
      email: newUsrEmail.trim(),
      nivel_acesso: newUsrNivel,
      permissoes_abas: newUsrPerms,
      ativo: true,
      created_at: new Date().toISOString(),
    });
    setNewUsrNome('');
    setNewUsrEmail('');
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C5A028] via-[#D4AF37] to-[#E5C158] py-3 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110"
            >
              <Lock className="h-4 w-4" />
              <span>Entrar no Painel</span>
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
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-white">Visão Geral — Roma Gravataria</h1>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5">
                  <p className="text-xs text-zinc-400">Faturamento Total</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">{fmt(totalVendas)}</p>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#121212] p-5">
                  <p className="text-xs text-[#E5C158]">Sua Comissão (12%)</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#D4AF37]">{fmt(totalComissoes)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5">
                  <p className="text-xs text-zinc-400">Visitas Registradas</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">{visitas.length}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-5">
                  <p className="text-xs text-zinc-400">Leads Capturados</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-400">{leads.length}</p>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'vendas' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Vendas & Pedidos</h1>
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111111]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                    <tr>
                      <th className="p-3.5">Pedido</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Pagamento</th>
                      <th className="p-3.5">Total</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {pedidos.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3.5 font-bold text-[#D4AF37]">{p.numero_pedido}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-white">{p.cliente_nome}</p>
                          <p className="text-zinc-400">{p.cliente_whatsapp}</p>
                        </td>
                        <td className="p-3.5">{p.forma_pagamento}</td>
                        <td className="p-3.5 font-bold">{fmt(p.total)}</td>
                        <td className="p-3.5">
                          <select
                            value={p.status}
                            onChange={(e) =>
                              atualizarPedidoStatus(p.id, e.target.value as typeof p.status)
                            }
                            className="rounded-lg border border-zinc-700 bg-black px-2.5 py-1 text-xs"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Em Separação">Em Separação</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'comissoes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Controle de Comissões</h1>
                <div className="rounded-xl border border-[#D4AF37]/40 bg-[#141414] px-4 py-2 text-xs">
                  A receber: <strong className="text-[#D4AF37]">{fmt(comissoesPendentes)}</strong>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111111]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                    <tr>
                      <th className="p-3.5">Pedido</th>
                      <th className="p-3.5">Valor Venda</th>
                      <th className="p-3.5">% Comissão</th>
                      <th className="p-3.5">Valor Comissão</th>
                      <th className="p-3.5">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {pedidos.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3.5 font-bold text-[#D4AF37]">{p.numero_pedido}</td>
                        <td className="p-3.5">{fmt(p.total)}</td>
                        <td className="p-3.5">{p.comissao_percentual}%</td>
                        <td className="p-3.5 font-bold text-emerald-400">{fmt(p.comissao_valor)}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => toggleComissaoPaga(p.id)}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                              p.comissao_paga
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {p.comissao_paga ? 'Paga ✓' : 'Pendente (Marcar Paga)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          {currentTab === 'visitas' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Controle de Visitas ({visitas.length})</h1>
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111111]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-[#161616] text-zinc-400">
                    <tr>
                      <th className="p-3.5">Página</th>
                      <th className="p-3.5">Origem / UTM</th>
                      <th className="p-3.5">Dispositivo</th>
                      <th className="p-3.5">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {visitas.map((v) => (
                      <tr key={v.id}>
                        <td className="p-3.5 font-semibold text-[#D4AF37]">{v.pagina}</td>
                        <td className="p-3.5">{v.origem_utm}</td>
                        <td className="p-3.5">{v.dispositivo}</td>
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

          {currentTab === 'leads' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Leads Capturados ({leads.length})</h1>
              <div className="grid gap-4 md:grid-cols-2">
                {leads.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-zinc-800 bg-[#121212] p-4 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{l.nome}</p>
                        <p className="text-[#D4AF37]">{l.whatsapp}</p>
                      </div>
                      <select
                        value={l.status}
                        onChange={(e) =>
                          atualizarLeadStatus(l.id, e.target.value as typeof l.status)
                        }
                        className="rounded-lg border border-zinc-700 bg-black px-2 py-1 text-xs"
                      >
                        <option value="Novo">Novo</option>
                        <option value="Em Atendimento">Em Atendimento</option>
                        <option value="Convertido">Convertido</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </div>
                    <p className="mt-2 text-zinc-300">Interesse: {l.interesse}</p>
                    <div className="mt-3 flex items-center justify-between text-zinc-500">
                      <span>Origem: {l.origem}</span>
                      <a
                        href={`https://wa.me/55${l.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
                      >
                        <span>Chamar no WhatsApp</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
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
              <h1 className="text-2xl font-bold">Configurações, Usuários & Permissões</h1>

              {/* Novo Usuário */}
              <form
                onSubmit={handleAddUsuario}
                className="space-y-4 rounded-2xl border border-zinc-800 bg-[#111111] p-5 text-xs"
              >
                <p className="text-sm font-bold text-[#D4AF37]">Cadastrar Novo Usuário</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    required
                    placeholder="Nome"
                    value={newUsrNome}
                    onChange={(e) => setNewUsrNome(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2"
                  />
                  <input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={newUsrEmail}
                    onChange={(e) => setNewUsrEmail(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2"
                  />
                  <select
                    value={newUsrNivel}
                    onChange={(e) => setNewUsrNivel(e.target.value as RomaUsuario['nivel_acesso'])}
                    className="rounded-lg border border-zinc-700 bg-black px-3 py-2"
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
                  className="rounded-lg bg-[#D4AF37] px-5 py-2 font-bold text-black"
                >
                  Salvar Usuário
                </button>
              </form>

              {/* Lista de Usuários com Botão Modo Usuário */}
              <div className="space-y-3">
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

                    {u.id !== masterUser?.id && (
                      <button
                        onClick={() => setImpersonatedUser(u)}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Modo Usuário</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
