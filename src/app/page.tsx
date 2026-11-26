'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  ShieldCheck,
  Truck,
  CreditCard,
  Award,
  X,
  Plus,
  Minus,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useRomaStore } from '@/lib/romaStore';
import { RomaProduto, RomaItemPedido, RomaBlogPost } from '@/types/roma';
import RomaBot from '@/components/RomaBot';

const CATEGORIES = [
  'Todos',
  'Gravatas Slim',
  'Gravatas Tradicionais',
  'Camisas Sociais',
  'Kits Noivo & Padrinhos',
  'Acessórios',
] as const;

export default function RomaStorePage() {
  const { produtos, blogPosts, registrarVisita, adicionarLead, criarPedido, config } = useRomaStore();

  const [categoria, setCategoria] = useState<string>('Todos');
  const [busca, setBusca] = useState('');
  const [selectedCor, setSelectedCor] = useState<Record<string, string>>({});
  const [selectedTam, setSelectedTam] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<RomaItemPedido[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activePost, setActivePost] = useState<RomaBlogPost | null>(null);

  // Checkout form
  const [cliNome, setCliNome] = useState('');
  const [cliWhats, setCliWhats] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliCep, setCliCep] = useState('');
  const [cliEndereco, setCliEndereco] = useState('');
  const [formaPgto, setFormaPgto] = useState<'Pix' | 'Cartão de Crédito (até 6x)' | 'Boleto'>('Pix');
  const [pedidoCriado, setPedidoCriado] = useState<string | null>(null);

  useEffect(() => {
    registrarVisita('/');
  }, [registrarVisita]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (!p.ativo) return false;
      const matchCat = categoria === 'Todos' || p.categoria === categoria;
      const matchBusca =
        !busca.trim() ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [produtos, categoria, busca]);

  const addToCart = (prod: RomaProduto) => {
    const cor = selectedCor[prod.id] || prod.cores[0] || 'Padrão';
    const tamanho = selectedTam[prod.id] || prod.tamanhos[0] || 'Único';
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.produto_id === prod.id && i.cor === cor && i.tamanho === tamanho
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        return copy;
      }
      return [
        ...prev,
        {
          produto_id: prod.id,
          nome: prod.nome,
          cor,
          tamanho,
          quantidade: 1,
          preco_unitario: prod.preco,
        },
      ];
    });
    registrarVisita(`/produto/${prod.slug}`, {
      produto_id: prod.id,
      produto_nome: prod.nome,
      acao: 'add_carrinho',
    });
    setCartOpen(true);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === idx ? { ...item, quantidade: item.quantidade + delta } : item))
        .filter((item) => item.quantidade > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0);
  const frete = subtotal >= 299 || subtotal === 0 ? 0 : 24.9;
  const descontoPix = formaPgto === 'Pix' ? Number((subtotal * 0.04).toFixed(2)) : 0;
  const total = Math.max(0, subtotal + frete - descontoPix);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliNome.trim() || !cliWhats.trim() || cart.length === 0) return;
    const novo = criarPedido({
      cliente_nome: cliNome.trim(),
      cliente_whatsapp: cliWhats.trim(),
      cliente_email: cliEmail.trim(),
      cep: cliCep.trim(),
      endereco: cliEndereco.trim(),
      itens: cart,
      subtotal,
      frete,
      desconto_pix: descontoPix,
      total,
      forma_pagamento: formaPgto,
      status: 'Pendente',
    });
    setPedidoCriado(novo.numero_pedido);
    setCart([]);
  };

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-[#080808] text-[var(--foreground)] selection:bg-[#D4AF37] selection:text-black">
      {/* Top Announcement Bar */}
      <div className="border-b border-[#D4AF37]/20 bg-[var(--surface-alt)] px-4 py-2 text-center text-xs font-medium text-[#E5C158]">
        FRETE GRÁTIS acima de R$ 299 para todo o Brasil • 4% OFF no Pix • Parcele em até 6x sem juros
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#D4AF37]/30 bg-[#060606]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1 rounded-full bg-[#D4AF37]/25 blur-md transition duration-500 group-hover:bg-[#D4AF37]/45" />
              <img
                src="/logo-roma.jpg"
                alt="Roma Moda Social Masculina"
                className="relative h-14 sm:h-16 w-auto object-contain drop-shadow-[0_0_16px_rgba(212,175,55,0.7)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="font-serif text-lg font-black tracking-widest text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                ROMA
              </span>
              <span className="text-[9px] font-semibold tracking-[0.25em] text-[var(--muted)] uppercase">
                Moda Social Masculina
              </span>
            </div>
          </Link>

          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[#121212] px-4 py-2.5 md:flex">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar gravatas slim, camisas de bambu, kits..."
              className="w-full bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#nossa-historia"
              className="hidden items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[#D4AF37] sm:flex"
            >
              <span>Nossa História</span>
            </a>
            <a
              href="#blog"
              className="hidden items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[#D4AF37] sm:flex"
            >
              <BookOpen className="h-4 w-4" />
              <span>Blog</span>
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C5A028] via-[#D4AF37] to-[#E5C158] px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Carrinho ({cart.reduce((s, i) => s + i.quantidade, 0)})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#D4AF37]/15 bg-gradient-to-b from-[#12100B] via-[#0A0A0A] to-[#080808] py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="space-y-5">
            <span className="inline-block rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#E5C158]">
              Alfaiataria & Moda Social Masculina
            </span>
            <h1 className="font-editorial text-4xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] md:text-5xl">
              Elegância Imperial em Cada <span className="text-[#D4AF37]">Detalhe</span>.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-[var(--muted)]">
              Gravatas slim e tradicionais em seda jacquard, camisas em fibra de bambu e kits
              exclusivos para noivos e padrinhos.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#catalogo"
                className="flex items-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#E5C158]"
              >
                <span>Ver Coleção</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                onClick={() => setCategoria('Kits Noivo & Padrinhos')}
                className="rounded-full border border-[#D4AF37]/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#E5C158] transition hover:bg-[#D4AF37]/10"
              >
                Kits Padrinhos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[var(--surface-alt)] p-5">
              <Truck className="mb-3 h-6 w-6 text-[#D4AF37]" />
              <p className="text-sm font-bold text-[var(--foreground)]">Frete Grátis</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Em compras acima de R$ 299 para todo o Brasil</p>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[var(--surface-alt)] p-5">
              <CreditCard className="mb-3 h-6 w-6 text-[#D4AF37]" />
              <p className="text-sm font-bold text-[var(--foreground)]">Até 6x Sem Juros</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Ou 4% de desconto imediato no Pix</p>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[var(--surface-alt)] p-5">
              <ShieldCheck className="mb-3 h-6 w-6 text-[#D4AF37]" />
              <p className="text-sm font-bold text-[var(--foreground)]">Compra Segura</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Garantia de troca rápida e atendimento VIP</p>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[var(--surface-alt)] p-5">
              <Award className="mb-3 h-6 w-6 text-[#D4AF37]" />
              <p className="text-sm font-bold text-[var(--foreground)]">Padrão Roma</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Acabamento premium e caimento impecável</p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[var(--foreground)]">Mais Vendidos & Coleção</h2>
            <p className="text-xs text-[var(--muted)]">Escolha cor e tamanho diretamente no card</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  categoria === cat
                    ? 'bg-[#D4AF37] text-black'
                    : 'border border-[var(--border)] bg-[#121212] text-[var(--muted)] hover:border-[#D4AF37]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produtosFiltrados.map((prod) => {
            const corAtual = selectedCor[prod.id] || prod.cores[0] || '';
            const tamAtual = selectedTam[prod.id] || prod.tamanhos[0] || '';
            return (
              <div
                key={prod.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] transition hover:border-[#D4AF37]/50"
              >
                <div className="relative h-64 w-full overflow-hidden bg-[var(--surface)]">
                  <img
                    src={prod.imagem_url}
                    alt={prod.nome}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                  {prod.mais_vendido && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#D4AF37] px-3 py-1 text-[10px] font-bold uppercase text-black">
                      Mais Vendido
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                      {prod.categoria}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">{prod.nome}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-[var(--muted)]">{prod.descricao}</p>

                    {/* Cores */}
                    {prod.cores.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] text-[var(--muted)]">
                          Cor: <span className="font-semibold text-[var(--foreground)]">{corAtual}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.cores.map((c) => (
                            <button
                              key={c}
                              onClick={() => setSelectedCor((prev) => ({ ...prev, [prod.id]: c }))}
                              className={`rounded-md px-2 py-1 text-[11px] transition ${
                                corAtual === c
                                  ? 'bg-[#D4AF37] font-bold text-black'
                                  : 'border border-zinc-700 bg-black text-[var(--muted)] hover:border-zinc-500'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tamanhos */}
                    {prod.tamanhos.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] text-[var(--muted)]">
                          Tamanho: <span className="font-semibold text-[var(--foreground)]">{tamAtual}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.tamanhos.map((t) => (
                            <button
                              key={t}
                              onClick={() => setSelectedTam((prev) => ({ ...prev, [prod.id]: t }))}
                              className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                                tamAtual === t
                                  ? 'bg-[#D4AF37] font-bold text-black'
                                  : 'border border-zinc-700 bg-black text-[var(--muted)] hover:border-zinc-500'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        {prod.preco_original && (
                          <span className="mr-2 text-xs text-zinc-500 line-through">
                            {fmt(prod.preco_original)}
                          </span>
                        )}
                        <span className="text-lg font-extrabold text-[var(--foreground)]">{fmt(prod.preco)}</span>
                        <p className="text-xs font-semibold text-emerald-400">
                          {fmt(prod.preco_pix)} no Pix (4% OFF)
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={`https://wa.me/${(config?.whatsapp_numero || '5511999998888').replace(/\D/g, '')}?text=${encodeURIComponent(
                          `${config?.mensagem_padrao_atendente || 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:'} Tenho interesse no produto "${prod.nome}".`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          registrarVisita(`/produto/${prod.slug}`, {
                            produto_id: prod.id,
                            produto_nome: prod.nome,
                            acao: 'click_whatsapp',
                          })
                        }
                        title="Dúvidas no WhatsApp"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500 hover:text-black"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => {
                          addToCart(prod);
                          registrarVisita(`/produto/${prod.slug}`, {
                            produto_id: prod.id,
                            produto_nome: prod.nome,
                            acao: 'view_produto',
                          });
                        }}
                        className="flex-1 rounded-xl bg-gradient-to-r from-[#C5A028] via-[#D4AF37] to-[#E5C158] py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110 active:scale-95"
                      >
                        Comprar Agora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Blog de Moda Masculina */}
      <section id="blog" className="border-t border-[var(--border)] bg-[#0C0C0C] py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
              Editorial Roma
            </span>
            <h2 className="font-editorial mt-1 text-2xl font-bold text-[var(--foreground)]">Blog de Moda Masculina</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {blogPosts
              .filter((b) => b.publicado)
              .map((post) => (
                <div
                  key={post.id}
                  onClick={() => setActivePost(post)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[#121212] transition hover:border-[#D4AF37]/50 md:flex"
                >
                  <img
                    src={post.imagem_url}
                    alt={post.titulo}
                    className="h-48 w-full object-cover md:h-auto md:w-48"
                  />
                  <div className="flex flex-col justify-between p-5">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-[#D4AF37]">
                        {post.categoria} • {post.tempo_leitura}
                      </span>
                      <h3 className="mt-1 text-base font-bold text-[var(--foreground)] group-hover:text-[#E5C158]">
                        {post.titulo}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">{post.resumo}</p>
                    </div>
                    <span className="mt-3 text-xs font-semibold text-[#D4AF37]">Ler artigo →</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Nossa História & Card Site Seguro */}
      <section id="nossa-historia" className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-[#D4AF37]/20 bg-[var(--card)] p-6 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">Tradição &amp; Elegância</p>
            <h2 className="font-editorial text-2xl font-bold text-[var(--foreground)]">Nossa História</h2>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              A Roma Gravataria nasceu com o propósito de unir alfaiataria clássica, tecidos selecionados e atendimento personalizado para noivos, padrinhos e executivos que valorizam presença e sofisticação em cada detalhe.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-xl">🔒</span>
              <h3 className="text-sm font-bold uppercase tracking-wider">Site Seguro</h3>
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Navegação protegida por criptografia SSL 256-bit. Seus dados e pedidos são tratados com total sigilo e segurança.
            </p>
            <div className="text-[11px] font-semibold text-emerald-400">
              ✓ Certificado SSL Ativo • Compra Protegida
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D4AF37]/20 bg-[#050505] py-12 text-[var(--muted)]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pb-8 border-b border-[var(--border)]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-roma.jpg"
                  alt="Roma"
                  className="h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]"
                />
                <div>
                  <p className="font-serif font-black tracking-widest text-[#D4AF37]">ROMA</p>
                  <p className="text-[10px] tracking-wider text-zinc-500 uppercase">Moda Social Masculina</p>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Referência em gravatas slim, tradicionais, camisas de bambu e alfaiataria fina para eventos e casamentos.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Navegação</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="#catalogo" className="hover:text-[#D4AF37]">Coleção & Produtos</a></li>
                <li><a href="#blog" className="hover:text-[#D4AF37]">Blog de Moda Masculina</a></li>
                <li><button onClick={() => setCategoria('Kits Noivo & Padrinhos')} className="hover:text-[#D4AF37]">Kits Noivos & Padrinhos</button></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Atendimento VIP</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>Segunda a Sexta: 08h às 18h</li>
                <li>Sábados: 08h às 13h</li>
                <li className="text-[#D4AF37] font-semibold">Envio para todo o Brasil</li>
                <li className="pt-1">
                  <a
                    href={`https://wa.me/${(config?.whatsapp_numero || '5511999998888').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `${config?.mensagem_padrao_atendente || 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:'} Gostaria de atendimento via WhatsApp.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp: {config?.whatsapp_display || '(11) 99999-8888'}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© 2026 Roma Gravataria e Moda Social Masculina • Todos os direitos reservados</p>
            <p className="text-zinc-600">Desenvolvido com padrão de alta costura</p>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col border-l border-[#D4AF37]/30 bg-[#0E0E0E] p-5 text-[var(--foreground)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h3 className="text-lg font-bold text-[#D4AF37]">Seu Carrinho</h3>
              <button onClick={() => setCartOpen(false)}>
                <X className="h-5 w-5 text-[var(--muted)] hover:text-[var(--foreground)]" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {cart.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-500">Seu carrinho está vazio.</p>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.produto_id}-${item.cor}-${item.tamanho}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#151515] p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.nome}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.cor} • {item.tamanho}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#D4AF37]">
                        {fmt(item.preco_unitario * item.quantidade)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="rounded-md border border-zinc-700 p-1 hover:bg-zinc-800"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="rounded-md border border-zinc-700 p-1 hover:bg-zinc-800"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-3 border-t border-[var(--border)] pt-4">
                <div className="flex justify-between text-xs text-[var(--muted)]">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--muted)]">
                  <span>Frete</span>
                  <span>{frete === 0 ? 'GRÁTIS' : fmt(frete)}</span>
                </div>
                <button
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                    setPedidoCriado(null);
                  }}
                  className="w-full rounded-xl bg-[#D4AF37] py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#E5C158]"
                >
                  Finalizar Compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[var(--surface-alt)] p-6 text-[var(--foreground)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#D4AF37]">Finalizar Pedido Roma</h3>
              <button onClick={() => setCheckoutOpen(false)}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>

            {pedidoCriado ? (
              <div className="space-y-4 py-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h4 className="text-xl font-bold">Pedido {pedidoCriado} Confirmado!</h4>
                <p className="text-xs text-[var(--muted)]">
                  Seu pedido já foi registrado no ERP Roma com cálculo automático de comissão.
                </p>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="rounded-xl bg-[#D4AF37] px-6 py-2.5 text-xs font-bold text-black"
                >
                  Continuar Navegando
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="space-y-3 text-xs">
                <input
                  required
                  placeholder="Nome completo"
                  value={cliNome}
                  onChange={(e) => setCliNome(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="WhatsApp (com DDD)"
                    value={cliWhats}
                    onChange={(e) => setCliWhats(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={cliEmail}
                    onChange={(e) => setCliEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    placeholder="CEP"
                    value={cliCep}
                    onChange={(e) => setCliCep(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                  />
                  <input
                    placeholder="Endereço completo"
                    value={cliEndereco}
                    onChange={(e) => setCliEndereco(e.target.value)}
                    className="col-span-2 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[var(--muted)]">Forma de Pagamento</label>
                  <select
                    value={formaPgto}
                    onChange={(e) => setFormaPgto(e.target.value as typeof formaPgto)}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Pix">Pix (4% de desconto)</option>
                    <option value="Cartão de Crédito (até 6x)">Cartão de Crédito (até 6x sem juros)</option>
                    <option value="Boleto">Boleto Bancário</option>
                  </select>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-black p-3 space-y-1">
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>Subtotal:</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  {descontoPix > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Desconto Pix (4%):</span>
                      <span>-{fmt(descontoPix)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#D4AF37]">
                    <span>Total a Pagar:</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#D4AF37] py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#E5C158]"
                >
                  Confirmar Pedido
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Blog Reader Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#D4AF37]/40 bg-[var(--surface-alt)] p-6 text-[var(--foreground)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-[#D4AF37]">
                {activePost.categoria}
              </span>
              <button onClick={() => setActivePost(null)}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <h2 className="font-editorial text-2xl font-bold">{activePost.titulo}</h2>
            <img
              src={activePost.imagem_url}
              alt={activePost.titulo}
              className="my-4 h-56 w-full rounded-xl object-cover"
            />
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
              {activePost.conteudo}
            </p>
          </div>
        </div>
      )}

      <RomaBot
        onCaptureLead={adicionarLead}
        whatsappNumero={config?.whatsapp_numero}
        mensagemPadrao={config?.mensagem_padrao_atendente}
      />
    </div>
  );
}
