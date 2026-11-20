'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_PRODUTOS,
  INITIAL_PEDIDOS,
  INITIAL_VISITAS,
  INITIAL_LEADS,
  INITIAL_BLOG,
  INITIAL_USUARIOS,
} from './romaData';
import {
  RomaProduto,
  RomaPedido,
  RomaVisita,
  RomaLead,
  RomaBlogPost,
  RomaUsuario,
  RomaConfiguracao,
} from '@/types/roma';

export const CONFIG_PADRAO: RomaConfiguracao = {
  id: 'config-default',
  whatsapp_numero: '5511999998888',
  whatsapp_display: '(11) 99999-8888',
  mensagem_padrao_atendente: 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:',
  comissao_padrao_percentual: 12,
};

const KEYS = {
  produtos: 'roma_produtos_v1',
  pedidos: 'roma_pedidos_v1',
  visitas: 'roma_visitas_v1',
  leads: 'roma_leads_v1',
  blog: 'roma_blog_v1',
  usuarios: 'roma_usuarios_v1',
  config: 'roma_config_v1',
};

function loadLocal<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function useRomaStore() {
  const [produtos, setProdutos] = useState<RomaProduto[]>(INITIAL_PRODUTOS);
  const [pedidos, setPedidos] = useState<RomaPedido[]>(INITIAL_PEDIDOS);
  const [visitas, setVisitas] = useState<RomaVisita[]>(INITIAL_VISITAS);
  const [leads, setLeads] = useState<RomaLead[]>(INITIAL_LEADS);
  const [blogPosts, setBlogPosts] = useState<RomaBlogPost[]>(INITIAL_BLOG);
  const [usuarios, setUsuarios] = useState<RomaUsuario[]>(INITIAL_USUARIOS);
  const [config, setConfig] = useState<RomaConfiguracao>(CONFIG_PADRAO);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProdutos(loadLocal(KEYS.produtos, INITIAL_PRODUTOS));
    setPedidos(loadLocal(KEYS.pedidos, INITIAL_PEDIDOS));
    setVisitas(loadLocal(KEYS.visitas, INITIAL_VISITAS));
    setLeads(loadLocal(KEYS.leads, INITIAL_LEADS));
    setBlogPosts(loadLocal(KEYS.blog, INITIAL_BLOG));
    setUsuarios(loadLocal(KEYS.usuarios, INITIAL_USUARIOS));
    if (typeof window !== 'undefined') {
      try {
        const rawCfg = localStorage.getItem(KEYS.config);
        if (rawCfg) setConfig(JSON.parse(rawCfg));
      } catch {}
    }
    setReady(true);

    if (isSupabaseConfigured && supabase) {
      Promise.all([
        supabase.from('roma_produtos').select('*').order('created_at', { ascending: false }),
        supabase.from('roma_pedidos').select('*').order('created_at', { ascending: false }),
        supabase.from('roma_visitas').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('roma_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('roma_blog_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('roma_usuarios').select('*').order('created_at', { ascending: true }),
      ]).then(([p, ped, vis, l, b, u]) => {
        if (p.data && p.data.length > 0) {
          setProdutos(p.data as RomaProduto[]);
          saveLocal(KEYS.produtos, p.data);
        }
        if (ped.data && ped.data.length > 0) {
          setPedidos(ped.data as RomaPedido[]);
          saveLocal(KEYS.pedidos, ped.data);
        }
        if (vis.data && vis.data.length > 0) {
          setVisitas(vis.data as RomaVisita[]);
          saveLocal(KEYS.visitas, vis.data);
        }
        if (l.data && l.data.length > 0) {
          setLeads(l.data as RomaLead[]);
          saveLocal(KEYS.leads, l.data);
        }
        if (b.data && b.data.length > 0) {
          setBlogPosts(b.data as RomaBlogPost[]);
          saveLocal(KEYS.blog, b.data);
        }
        if (u.data && u.data.length > 0) {
          setUsuarios(u.data as RomaUsuario[]);
          saveLocal(KEYS.usuarios, u.data);
        }
      });
    }
  }, []);

  const registrarVisita = useCallback(
    (
      pagina: string,
      extras?: {
        origem_utm?: string;
        produto_id?: string;
        produto_nome?: string;
        acao?: 'visita' | 'view_produto' | 'add_carrinho' | 'click_whatsapp';
      }
    ) => {
      if (typeof window === 'undefined') return;
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const params = new URLSearchParams(window.location.search);
      const utm = extras?.origem_utm || params.get('utm_source') || params.get('utm_campaign') || 'Direto';
      const nova: RomaVisita = {
        id: `vis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pagina,
        origem_utm: utm,
        dispositivo: isMobile ? 'Mobile' : 'Desktop',
        session_id: `sess-${Math.random().toString(36).slice(2, 8)}`,
        produto_id: extras?.produto_id,
        produto_nome: extras?.produto_nome,
        acao: extras?.acao || 'visita',
        created_at: new Date().toISOString(),
      };
      setVisitas((prev) => {
        const next = [nova, ...prev].slice(0, 500);
        saveLocal(KEYS.visitas, next);
        return next;
      });
      if (isSupabaseConfigured && supabase) {
        supabase.from('roma_visitas').insert({
          pagina: nova.pagina,
          origem_utm: nova.origem_utm,
          dispositivo: nova.dispositivo,
          session_id: nova.session_id,
        });
      }
    },
    []
  );

  const adicionarLead = useCallback((lead: Omit<RomaLead, 'id' | 'created_at' | 'status'>) => {
    const novo: RomaLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      status: 'Novo',
      created_at: new Date().toISOString(),
    };
    setLeads((prev) => {
      const next = [novo, ...prev];
      saveLocal(KEYS.leads, next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_leads').insert({
        nome: novo.nome,
        whatsapp: novo.whatsapp,
        email: novo.email || null,
        interesse: novo.interesse,
        origem: novo.origem,
        status: novo.status,
        notas: novo.notas || null,
      });
    }
    return novo;
  }, []);

  const atualizarLeadStatus = useCallback((id: string, status: RomaLead['status']) => {
    setLeads((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, status } : l));
      saveLocal(KEYS.leads, next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_leads').update({ status }).eq('id', id);
    }
  }, []);

  const criarPedido = useCallback(
    (pedido: Omit<RomaPedido, 'id' | 'numero_pedido' | 'created_at' | 'comissao_percentual' | 'comissao_valor' | 'comissao_paga'>) => {
      const comissaoPct = config.comissao_padrao_percentual || 12;
      const comissaoVal = Number(((pedido.total * comissaoPct) / 100).toFixed(2));
      const novo: RomaPedido = {
        ...pedido,
        id: `ped-${Date.now()}`,
        numero_pedido: `RM-${Math.floor(1050 + Math.random() * 8900)}`,
        comissao_percentual: comissaoPct,
        comissao_valor: comissaoVal,
        comissao_paga: false,
        created_at: new Date().toISOString(),
      };
      setPedidos((prev) => {
        const next = [novo, ...prev];
        saveLocal(KEYS.pedidos, next);
        return next;
      });
      if (isSupabaseConfigured && supabase) {
        supabase.from('roma_pedidos').insert({
          numero_pedido: novo.numero_pedido,
          cliente_nome: novo.cliente_nome,
          cliente_email: novo.cliente_email || null,
          cliente_whatsapp: novo.cliente_whatsapp,
          cep: novo.cep || null,
          endereco: novo.endereco || null,
          itens: novo.itens,
          subtotal: novo.subtotal,
          frete: novo.frete,
          desconto_pix: novo.desconto_pix,
          total: novo.total,
          forma_pagamento: novo.forma_pagamento,
          status: novo.status,
          comissao_percentual: novo.comissao_percentual,
          comissao_valor: novo.comissao_valor,
          comissao_paga: novo.comissao_paga,
        });
      }
      return novo;
    },
    [config.comissao_padrao_percentual]
  );

  const atualizarPedidoStatus = useCallback((id: string, status: RomaPedido['status']) => {
    setPedidos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status } : p));
      saveLocal(KEYS.pedidos, next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_pedidos').update({ status }).eq('id', id);
    }
  }, []);

  const toggleComissaoPaga = useCallback((id: string) => {
    setPedidos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, comissao_paga: !p.comissao_paga } : p));
      saveLocal(KEYS.pedidos, next);
      return next;
    });
  }, []);

  const salvarProduto = useCallback((prod: RomaProduto) => {
    setProdutos((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      const next = exists ? prev.map((p) => (p.id === prod.id ? prod : p)) : [prod, ...prev];
      saveLocal(KEYS.produtos, next);
      return next;
    });
  }, []);

  const salvarBlogPost = useCallback((post: RomaBlogPost) => {
    setBlogPosts((prev) => {
      const exists = prev.some((b) => b.id === post.id);
      const next = exists ? prev.map((b) => (b.id === post.id ? post : b)) : [post, ...prev];
      saveLocal(KEYS.blog, next);
      return next;
    });
  }, []);

  const salvarConfiguracao = useCallback((novaConfig: Partial<RomaConfiguracao>) => {
    setConfig((prev) => {
      const merged: RomaConfiguracao = { ...prev, ...novaConfig };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(KEYS.config, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_configuracoes').upsert({
        id: 'config-default',
        ...novaConfig,
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  const salvarUsuario = useCallback((usr: RomaUsuario) => {
    setUsuarios((prev) => {
      const exists = prev.some((u) => u.id === usr.id);
      const next = exists ? prev.map((u) => (u.id === usr.id ? usr : u)) : [...prev, usr];
      saveLocal(KEYS.usuarios, next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_usuarios').upsert({
        id: usr.id,
        nome: usr.nome,
        email: usr.email,
        senha_provisoria: usr.senha_provisoria,
        precisa_trocar_senha: usr.precisa_trocar_senha,
        nivel_acesso: usr.nivel_acesso,
        permissoes_abas: usr.permissoes_abas,
        ativo: usr.ativo,
      });
    }
  }, []);

  const excluirUsuario = useCallback((id: string) => {
    setUsuarios((prev) => {
      const next = prev.filter((u) => u.id !== id);
      saveLocal(KEYS.usuarios, next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('roma_usuarios').delete().eq('id', id);
    }
  }, []);

  return {
    ready,
    produtos,
    pedidos,
    visitas,
    leads,
    blogPosts,
    usuarios,
    config,
    salvarConfiguracao,
    registrarVisita,
    adicionarLead,
    atualizarLeadStatus,
    criarPedido,
    atualizarPedidoStatus,
    toggleComissaoPaga,
    salvarProduto,
    salvarBlogPost,
    salvarUsuario,
    excluirUsuario,
  };
}
