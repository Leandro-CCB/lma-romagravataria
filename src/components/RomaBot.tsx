'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, CheckCircle2 } from 'lucide-react';

interface RomaBotProps {
  onCaptureLead: (lead: {
    nome: string;
    whatsapp: string;
    interesse: string;
    origem: 'Bot Especialista';
  }) => void;
  whatsappNumero?: string;
  mensagemPadrao?: string;
}

interface Msg {
  from: 'bot' | 'user';
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

const QUICK_QUESTIONS = [
  'Qual gravata escolher para casamento?',
  'Camisas de Fibra de Bambu são boas?',
  'Como funciona o Kit Padrinhos?',
  'Falar com um atendente agora',
];

export default function RomaBot({
  onCaptureLead,
  whatsappNumero = '5511999998888',
  mensagemPadrao = 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:',
}: RomaBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: 'bot',
      text: 'Olá! Sou o Consultor Especialista da Roma Gravataria. Posso te ajudar a escolher gravatas, camisas de fibra de bambu ou montar o Kit Padrinhos ideal?',
    },
  ]);
  const [input, setInput] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadNome, setLeadNome] = useState('');
  const [leadWhats, setLeadWhats] = useState('');
  const [leadInteresse, setLeadInteresse] = useState('Kit Padrinhos / Moda Social');
  const [leadSent, setLeadSent] = useState(false);

  const responder = (texto: string) => {
    const lower = texto.toLowerCase();
    let reply =
      'Excelente escolha! Nossas peças são selecionadas com padrão de alfaiataria italiana. Quer deixar seu WhatsApp para eu te enviar fotos e condições exclusivas?';

    if (lower.includes('casamento') || lower.includes('padrinho') || lower.includes('kit')) {
      reply =
        'Para casamentos e padrinhos, a nossa campeã de vendas é a Gravata Slim 6cm (Marsala, Azul Serenity ou Terracota). Temos o Kit Padrinhos com 6 unidades + caixas individuais com desconto especial e 4% OFF no Pix!';
    } else if (lower.includes('frete') || lower.includes('prazo') || lower.includes('entrega')) {
      reply =
        'Oferecemos Frete Grátis para todo o Brasil em compras acima de R$ 299,00! Além disso, você pode parcelar em até 6x sem juros ou garantir 4% de desconto no Pix.';
    } else if (lower.includes('bambu') || lower.includes('camisa')) {
      reply =
        'Nossas Camisas em Fibra de Bambu têm toque sedoso, controle térmico natural e quase não amassam. Temos tamanhos do 1 ao 6 nas cores Branco, Preto, Azul Serenity, Cinza e Marinho.';
    } else if (lower.includes('whatsapp') || lower.includes('consultor') || lower.includes('falar') || lower.includes('atendente')) {
      const cleanNum = (whatsappNumero || '5511999998888').replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(`${mensagemPadrao || 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:'} ${texto}`);
      const directWaUrl = `https://wa.me/${cleanNum}?text=${encodedMsg}`;
      
      reply = `Perfeito! Você pode falar diretamente com nossa equipe no WhatsApp agora pelo botão abaixo ou deixar seu contato para nós te chamarmos:`;
      setShowLeadForm(true);
      setMessages((prev) => [
        ...prev,
        { from: 'user', text: texto },
        {
          from: 'bot',
          text: reply,
          actionUrl: directWaUrl,
          actionLabel: 'Abrir WhatsApp do Atendente 💬',
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { from: 'user', text: texto }, { from: 'bot', text: reply }]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    responder(input.trim());
    setInput('');
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadNome.trim() || !leadWhats.trim()) return;
    onCaptureLead({
      nome: leadNome.trim(),
      whatsapp: leadWhats.trim(),
      interesse: leadInteresse,
      origem: 'Bot Especialista',
    });
    setLeadSent(true);
    setShowLeadForm(false);
    setMessages((prev) => [
      ...prev,
      {
        from: 'bot',
        text: `Obrigado, ${leadNome}! Seus dados foram registrados no nosso atendimento prioritário. Em instantes um consultor Roma falará com você no WhatsApp.`,
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-full border border-[#D4AF37]/60 bg-[#0A0A0A] px-5 py-3.5 text-sm font-semibold text-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.35)] transition hover:scale-105 hover:bg-[#141414]"
        >
          <Sparkles className="h-4 w-4" />
          <span>Especialista Roma</span>
        </button>
      )}

      {open && (
        <div className="flex h-[480px] w-[350px] flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0D0D0D] text-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D4AF37]/25 bg-[#141414] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#D4AF37]">Consultor Roma</p>
                <p className="text-[11px] text-zinc-400">Especialista em Moda Social</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.from === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                    m.from === 'user'
                      ? 'bg-[#D4AF37] font-medium text-black'
                      : 'border border-zinc-800 bg-[#181818] text-zinc-200'
                  }`}
                >
                  {m.text}
                </div>
                {m.actionUrl && (
                  <a
                    href={m.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500"
                  >
                    <span>{m.actionLabel || 'Chamar Atendente'}</span>
                  </a>
                )}
              </div>
            ))}

            {/* Quick replies */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => responder(q)}
                  className="rounded-full border border-[#D4AF37]/30 bg-[#161616] px-2.5 py-1 text-[11px] text-[#E5C158] transition hover:bg-[#D4AF37]/15"
                >
                  {q}
                </button>
              ))}
            </div>

            {showLeadForm && !leadSent && (
              <form onSubmit={handleLeadSubmit} className="space-y-2 rounded-xl border border-[#D4AF37]/30 bg-[#151515] p-3">
                <p className="font-semibold text-[#D4AF37]">Atendimento VIP WhatsApp</p>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={leadNome}
                  onChange={(e) => setLeadNome(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="text"
                  required
                  placeholder="WhatsApp (com DDD)"
                  value={leadWhats}
                  onChange={(e) => setLeadWhats(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="text"
                  placeholder="Interesse (ex: 6 gravatas marsala)"
                  value={leadInteresse}
                  onChange={(e) => setLeadInteresse(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#D4AF37] py-1.5 text-xs font-bold text-black hover:bg-[#E5C158]"
                >
                  Solicitar Atendimento
                </button>
              </form>
            )}

            {leadSent && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Lead enviado para a equipe Roma!</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-zinc-800 bg-[#141414] p-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre gravatas, camisas..."
              className="flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37] text-black hover:bg-[#E5C158]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
