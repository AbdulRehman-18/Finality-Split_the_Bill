"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NodeData {
  id: string;
  label: string;
  role: string;
  cx: number;
  cy: number;
  netUSD: number;
  color: string;
}

interface EdgeData {
  id: string;
  from: string;
  to: string;
  amountUSD: number;
  status: "pending" | "settled";
  path: string;
  lx: number;
  ly: number;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("you");
  const [simStatus, setSimStatus] = useState<string | null>(null);

  // ROI Calculator State
  const [groupSize, setGroupSize] = useState<number>(8);
  const [monthlySpend, setMonthlySpend] = useState<number>(2400);

  // FAQ Expand State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Nodes for Hero Graph
  const [nodes, setNodes] = useState<NodeData[]>([
    { id: "you", label: "YOU", role: "LEDGER OWNER", cx: 400, cy: 190, netUSD: 152.5, color: "#5487eb" },
    { id: "alice", label: "ALICE", role: "PARTICIPANT", cx: 200, cy: 120, netUSD: -12.5, color: "#2ecc71" },
    { id: "bob", label: "BOB", role: "PARTICIPANT", cx: 600, cy: 110, netUSD: 45.0, color: "#e74c3c" },
    { id: "charlie", label: "CHARLIE", role: "PARTICIPANT", cx: 550, cy: 300, netUSD: -120.0, color: "#f39c12" },
    { id: "dave", label: "DAVE", role: "PARTICIPANT", cx: 250, cy: 280, netUSD: -65.0, color: "#a855f7" },
  ]);

  // Curved Edges for Hero Graph
  const [edges, setEdges] = useState<EdgeData[]>([
    { id: "e1", from: "you", to: "alice", amountUSD: 12.5, status: "pending", path: "M400,190 Q300,150 200,120", lx: 300, ly: 140 },
    { id: "e2", from: "bob", to: "you", amountUSD: 45.0, status: "pending", path: "M600,110 Q500,150 400,190", lx: 500, ly: 140 },
    { id: "e3", from: "you", to: "charlie", amountUSD: 120.0, status: "pending", path: "M400,190 Q475,245 550,300", lx: 475, ly: 235 },
    { id: "e4", from: "dave", to: "you", amountUSD: 65.0, status: "settled", path: "M250,280 Q325,235 400,190", lx: 325, ly: 250 },
    { id: "e5", from: "alice", to: "dave", amountUSD: 18.0, status: "pending", path: "M200,120 Q225,200 250,280", lx: 220, ly: 200 },
  ]);

  // Telemetry log
  const [logs, setLogs] = useState<Array<{ id: string; time: string; msg: string; hash: string }>>([
    { id: "1", time: "16:04:12", msg: "PARALLEL_REBALANCE: Bob -> You ($45.00)", hash: "0x7f4a...91bc" },
    { id: "2", time: "16:01:45", msg: "EVENT_EXPENSE_LOGGED: Alice split ($36.00)", hash: "0x3e11...4a02" },
    { id: "3", time: "15:58:30", msg: "ATOMIC_SETTLE_SUCCESS: Monad Testnet block #149201", hash: "0x9d4b...88aa" },
  ]);

  useEffect(() => {
    // Strictly set dark-retro theme
    document.documentElement.setAttribute("data-theme", "dark-retro");

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSettleSimulation = (edgeId?: string) => {
    const target = edgeId
      ? edges.find((e) => e.id === edgeId)
      : edges.find((e) => e.status === "pending");

    if (!target) {
      setSimStatus("TOPOLOGY BALANCED — ZERO PENDING EDGES");
      setTimeout(() => setSimStatus(null), 3000);
      return;
    }

    setEdges((prev) => prev.map((e) => (e.id === target.id ? { ...e, status: "settled" } : e)));

    const fromName = nodes.find((n) => n.id === target.from)?.label || target.from;
    const toName = nodes.find((n) => n.id === target.to)?.label || target.to;

    const newLog = {
      id: Date.now().toString(),
      time: new Date().toTimeString().split(" ")[0],
      msg: `SETTLEMENT_EXECUTED: ${fromName} -> ${toName} ($${target.amountUSD.toFixed(2)})`,
      hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    };

    setLogs((prev) => [newLog, ...prev.slice(0, 3)]);
    setSimStatus(`EXECUTED: ${fromName} → ${toName} ($${target.amountUSD.toFixed(2)})`);
    setTimeout(() => setSimStatus(null), 3000);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const pendingTotal = edges.filter((e) => e.status === "pending").reduce((acc, c) => acc + c.amountUSD, 0);

  const faqs = [
    {
      q: "HOW DOES TALLY PREVENT UNCOLLECTED GROUP DEBTS?",
      a: "Tally maps debts into an active topological directional graph. Circular IOUs automatically cancel out, reducing net multi-party transfers to minimal direct routes with 1-click settlement options.",
    },
    {
      q: "IS THERE ANY CENTRAL CUSTODY OR WALLET LOCKUP?",
      a: "No. Tally never holds user deposits. Settlements execute directly wallet-to-wallet on Monad EVM via smart contracts enforcing exact transaction amounts.",
    },
    {
      q: "CAN USERS TRACK EXPENSES WITHOUT CONNECTING A CRYPTO WALLET?",
      a: "Yes. Tally supports dual-mode operation: offchain ledger monitoring for informal tracking, and optional instant EVM wallet settlements on demand.",
    },
    {
      q: "WHY MONAD EVM?",
      a: "Monad provides 10,000 TPS execution and sub-second finality with sub-cent gas fees, allowing micro-settlements without economic overhead.",
    },
  ];

  return (
    <div className="marketing-theme min-h-screen w-full font-mono selection:bg-[#e74c3c] selection:text-white relative overflow-x-hidden">
      {/* 1. MOBILE-RESPONSIVE HEADER DOCK */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
          scrolled ? "bg-[#151410]/95 backdrop-blur-md border-[#3b372f] py-3 shadow-xl" : "bg-transparent border-[#3b372f]/40 py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo (Clean TALLY, no surveillance text) */}
          <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#1e1c16] border border-[#3b372f] flex items-center justify-center shadow-inner flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#e74c3c] animate-pulse" />
            </div>
            <span className="font-bold tracking-widest text-sm sm:text-base text-[#ebdcb9] uppercase">
              TALLY
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-xs text-[#807765] tracking-widest uppercase font-semibold">
            <a href="#topology" className="hover:text-[#ebdcb9] transition-colors">TOPOLOGY</a>
            <a href="#specs" className="hover:text-[#ebdcb9] transition-colors">SPECIFICATIONS</a>
            <a href="#telemetry" className="hover:text-[#ebdcb9] transition-colors">TELEMETRY</a>
            <a href="#faq" className="hover:text-[#ebdcb9] transition-colors">FAQ</a>
          </nav>

          {/* Header Controls: Mobile Menu Toggle & Primary CTA */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link
              href="/dashboard"
              className="text-[11px] sm:text-xs border border-[#3b372f] hover:border-[#ebdcb9] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[#ebdcb9] bg-[#1e1c16] transition-all uppercase tracking-wider font-bold shadow-md hover:shadow-lg whitespace-nowrap"
            >
              [ Launch App &rarr; ]
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-[#1e1c16] border border-[#3b372f] text-[#ebdcb9] focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#1e1c16] border-b border-[#3b372f] px-6 py-4 space-y-3 font-mono text-xs text-[#ebdcb9] animate-fade-in">
            <a
              href="#topology"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 hover:text-[#e74c3c] tracking-widest uppercase font-bold"
            >
              TOPOLOGY
            </a>
            <a
              href="#specs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 hover:text-[#e74c3c] tracking-widest uppercase font-bold"
            >
              SPECIFICATIONS
            </a>
            <a
              href="#telemetry"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 hover:text-[#e74c3c] tracking-widest uppercase font-bold"
            >
              TELEMETRY
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 hover:text-[#e74c3c] tracking-widest uppercase font-bold"
            >
              FAQ
            </a>
          </div>
        )}
      </header>

      <main className="pt-24 sm:pt-28 relative z-10">
        {/* Ambient Warm Backlight Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[900px] h-[350px] sm:h-[450px] bg-[#e74c3c]/10 blur-[140px] sm:blur-[180px] pointer-events-none animate-pulse-slow" />

        {/* 2. HERO SECTION */}
        <section className="px-4 sm:px-6 max-w-6xl mx-auto pt-6 sm:pt-10 pb-16 sm:pb-20 text-center relative z-10">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 border border-[#3b372f] bg-[#1e1c16] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs text-[#807765] tracking-widest uppercase mb-6 sm:mb-10 shadow-md flex-wrap justify-center">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#e74c3c] animate-pulse" />
            <span className="font-bold text-[#ebdcb9]">SHARED SETTLEMENT LEDGER</span>
            <span className="text-[#3b372f] hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline">MONAD EVM PROTOCOL</span>
          </div>

          {/* Mobile Responsive Headline */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[6.5rem] font-extrabold tracking-tight text-[#ebdcb9] mb-6 sm:mb-8 leading-[1.08] max-w-4xl mx-auto break-words">
            Every debt. <br />
            Watched. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e74c3c] via-[#f39c12] to-[#e74c3c]">
              Until it's paid.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#807765] text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-12 font-sans font-normal px-2">
            Tally turns group expenses into an interactive live debt graph. Watch balances rebalance automatically and settle in seconds on Monad EVM.
          </p>

          {/* Stacked Mobile CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto mb-14 sm:mb-20 text-xs w-full">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-[#e74c3c] hover:bg-[#d6394a] text-white font-mono font-bold py-3.5 sm:py-4 px-6 sm:px-8 rounded-lg tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(231,76,60,0.3)] hover:shadow-[0_6px_25px_rgba(231,76,60,0.5)] active:scale-95"
            >
              Open Dashboard &rarr;
            </Link>
            <button
              onClick={() => handleSettleSimulation()}
              className="w-full sm:w-auto border border-[#3b372f] hover:border-[#ebdcb9] bg-[#1e1c16] text-[#ebdcb9] py-3.5 sm:py-4 px-5 sm:px-6 rounded-lg tracking-wider uppercase transition-all font-semibold shadow-md active:scale-95"
            >
              Run Live Rebalance
            </button>
          </div>

          {/* 3. HERO INTERACTIVE GRAPH VIEWPORT */}
          <div id="topology" className="w-full relative text-left">
            <div className="absolute inset-0 bg-[#e74c3c]/10 blur-[60px] sm:blur-[90px] rounded-2xl pointer-events-none" />

            <div className="relative rounded-xl overflow-hidden bg-[#1e1c16] border border-[#3b372f] shadow-2xl">
              {/* Header Bar */}
              <div className="px-3.5 sm:px-6 py-3 border-b border-[#3b372f] bg-[#151410] flex flex-wrap items-center justify-between gap-2.5 text-[11px] sm:text-xs text-[#807765]">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#e74c3c]/80" />
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#f39c12]/80" />
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#2ecc71]/80" />
                  </div>
                  <span className="font-bold text-[#ebdcb9] tracking-widest uppercase">
                    GRAPH MATRIX
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#2ecc71]/15 text-[#2ecc71] border border-[#2ecc71]/30 text-[9px] sm:text-[10px] font-bold">
                    ENGINE ACTIVE
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs flex-wrap">
                  <span>PENDING: <strong className="text-[#5487eb]">${pendingTotal.toFixed(2)}</strong></span>
                  <button
                    onClick={() => handleSettleSimulation()}
                    className="px-2.5 py-1 rounded bg-[#e74c3c]/20 text-[#e74c3c] border border-[#e74c3c]/30 hover:bg-[#e74c3c] hover:text-white font-bold transition-all"
                  >
                    [ REBALANCE ]
                  </button>
                </div>
              </div>

              {/* Status Notice Flash */}
              {simStatus && (
                <div className="bg-[#1e1c16] border-b border-[#3b372f] px-3.5 sm:px-6 py-2 text-[10px] sm:text-xs text-[#2ecc71] font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 animate-fade-in">
                  <span className="truncate max-w-full">⚡ {simStatus}</span>
                  <span className="text-[#807765] font-mono text-[9px] sm:text-[10px]">MONAD EVM VERIFIED</span>
                </div>
              )}

              {/* Main SVG Graph Surface with ViewBox fluid scaling */}
              <div className="relative w-full h-[280px] sm:h-[380px] md:h-[400px] bg-[#151410] overflow-hidden">
                <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" className="w-full h-full absolute inset-0">
                  <defs>
                    <pattern id="dark-grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
                      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#3b372f" strokeWidth="0.5" opacity="0.4" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#dark-grid-pattern)" />

                  {/* Render Curved Edges */}
                  <g fill="none">
                    {edges.map((e) => {
                      const isSettled = e.status === "settled";
                      const strokeColor = isSettled ? "#2ecc71" : "#5487eb";
                      return (
                        <g key={e.id} className="cursor-pointer group" onClick={() => handleSettleSimulation(e.id)}>
                          <path
                            d={e.path}
                            stroke={strokeColor}
                            strokeWidth={isSettled ? "1.5" : "2.5"}
                            strokeDasharray={isSettled ? "4 4" : "none"}
                            opacity={isSettled ? "0.5" : "0.85"}
                            className="transition-all duration-300"
                          />

                          {/* Animated Stream Particle along edge */}
                          {!isSettled && (
                            <circle r="3.5" fill={strokeColor}>
                              <animateMotion path={e.path} dur="3s" repeatCount="indefinite" />
                            </circle>
                          )}

                          {/* Label Pill */}
                          <g transform={`translate(${e.lx}, ${e.ly})`}>
                            <rect x="-26" y="-11" width="52" height="20" rx="4" fill="#1e1c16" stroke={strokeColor} strokeWidth="1" />
                            <text x="0" y="3" fill={strokeColor} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono" textAnchor="middle">
                              ${e.amountUSD.toFixed(2)}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Render Nodes */}
                  <g>
                    {nodes.map((n) => {
                      const isSelected = selectedNodeId === n.id;
                      return (
                        <g
                          key={n.id}
                          transform={`translate(${n.cx}, ${n.cy})`}
                          className="cursor-pointer group"
                          onClick={() => setSelectedNodeId(n.id)}
                        >
                          <circle
                            r="20"
                            fill="#1e1c16"
                            stroke={isSelected ? "#e74c3c" : n.color}
                            strokeWidth={isSelected ? "3" : "2"}
                            className="transition-transform group-hover:scale-110"
                          />
                          <circle r="4" fill={isSelected ? "#e74c3c" : n.color} />
                          <text y="34" fill="#ebdcb9" fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono" textAnchor="middle">
                            {n.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Left Node Detail Overlay (Mobile Optimized) */}
                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 p-2.5 sm:p-4 rounded-lg bg-[#1e1c16]/95 backdrop-blur-md border border-[#3b372f] text-[10px] sm:text-xs text-[#ebdcb9] max-w-[180px] sm:max-w-xs space-y-0.5 sm:space-y-1 shadow-xl">
                  <div className="text-[#807765] text-[9px] sm:text-[10px] uppercase tracking-wider font-bold">SELECTED</div>
                  <div className="font-bold text-xs sm:text-sm text-[#ebdcb9] truncate">{selectedNode.label}</div>
                  <div className="text-[#807765] pt-0.5">
                    Position: <span className={selectedNode.netUSD >= 0 ? "text-[#2ecc71] font-bold" : "text-[#e74c3c] font-bold"}>
                      ${selectedNode.netUSD.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-[9px] sm:text-[10px] text-[#807765] font-bold tracking-wider hidden sm:block">
                  CLICK NODE TO INSPECT &middot; CLICK EDGE TO REBALANCE
                </div>
              </div>

              {/* Viewport Footer Stream */}
              <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 border-t border-[#3b372f] bg-[#151410] text-[9px] sm:text-[10px] text-[#807765] flex flex-col sm:flex-row justify-between gap-1 font-mono">
                <span className="truncate">LATEST: <strong className="text-[#ebdcb9]">{logs[0]?.msg}</strong></span>
                <span className="flex-shrink-0 text-[8px] sm:text-[10px]">MONAD TESTNET &middot; DARK RETRO THEME</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PERFORMANCE METRICS STRIP */}
        <section className="border-y border-[#3b372f] bg-[#1e1c16] py-6 sm:py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
            <div className="p-2">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ebdcb9] mb-1">0.28s</div>
              <div className="text-[9px] sm:text-xs text-[#807765] tracking-widest uppercase font-mono">FINALITY</div>
            </div>
            <div className="p-2">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ebdcb9] mb-1">$142.8M</div>
              <div className="text-[9px] sm:text-xs text-[#807765] tracking-widest uppercase font-mono">VOLUME</div>
            </div>
            <div className="p-2">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ebdcb9] mb-1">0.00%</div>
              <div className="text-[9px] sm:text-xs text-[#807765] tracking-widest uppercase font-mono">CUSTODY RISK</div>
            </div>
            <div className="p-2">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ebdcb9] mb-1">48,290</div>
              <div className="text-[9px] sm:text-xs text-[#807765] tracking-widest uppercase font-mono">LEDGERS</div>
            </div>
          </div>
        </section>

        {/* 5. PROTOCOL SPECIFICATIONS GRID */}
        <section id="specs" className="py-16 sm:py-28 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-10 sm:mb-16">
            <div className="text-xs text-[#807765] tracking-widest uppercase mb-2 font-mono">CORE ARCHITECTURE</div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#ebdcb9]">
              Engineering Specs.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#3b372f] border border-[#3b372f] rounded-lg overflow-hidden">
            <div className="bg-[#1e1c16] p-5 sm:p-8 dashboard-hover">
              <div className="text-[11px] sm:text-xs text-[#5487eb] mb-3 sm:mb-4 font-bold font-mono">01 &middot; TOPOLOGY OPTIMIZATION</div>
              <h3 className="text-base sm:text-lg font-bold text-[#ebdcb9] mb-2 sm:mb-3">Parallel Debt Rebalancing</h3>
              <p className="text-[#807765] text-xs leading-relaxed font-sans">
                Automatically resolves cyclic dependencies across N-party networks, minimizing required payment transactions to the absolute mathematical minimum.
              </p>
            </div>

            <div className="bg-[#1e1c16] p-5 sm:p-8 dashboard-hover">
              <div className="text-[11px] sm:text-xs text-[#2ecc71] mb-3 sm:mb-4 font-bold font-mono">02 &middot; EXECUTION ENGINE</div>
              <h3 className="text-base sm:text-lg font-bold text-[#ebdcb9] mb-2 sm:mb-3">Monad EVM Integration</h3>
              <p className="text-[#807765] text-xs leading-relaxed font-sans">
                Leverages parallel execution and sub-second block times for near-instantaneous micro-settlements without gas friction.
              </p>
            </div>

            <div className="bg-[#1e1c16] p-5 sm:p-8 dashboard-hover">
              <div className="text-[11px] sm:text-xs text-[#e74c3c] mb-3 sm:mb-4 font-bold font-mono">03 &middot; PROOF SYSTEM</div>
              <h3 className="text-base sm:text-lg font-bold text-[#ebdcb9] mb-2 sm:mb-3">Exact-Amount Smart Contract</h3>
              <p className="text-[#807765] text-xs leading-relaxed font-sans">
                Smart contracts strictly enforce precise settlement figures, rejecting over-transfers or under-transfers at the EVM state level.
              </p>
            </div>

            <div className="bg-[#1e1c16] p-5 sm:p-8 dashboard-hover">
              <div className="text-[11px] sm:text-xs text-[#f39c12] mb-3 sm:mb-4 font-bold font-mono">04 &middot; OPERABILITY</div>
              <h3 className="text-base sm:text-lg font-bold text-[#ebdcb9] mb-2 sm:mb-3">Dual-Mode Ledger</h3>
              <p className="text-[#807765] text-xs leading-relaxed font-sans">
                Maintain seamless offchain balance tracking for daily expenses, with optional onchain settlement whenever members choose to finalize.
              </p>
            </div>
          </div>
        </section>

        {/* 6. TELEMETRY CONSOLE */}
        <section id="telemetry" className="py-16 sm:py-24 border-t border-[#3b372f] bg-[#1e1c16]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4">
              <div>
                <div className="text-xs text-[#807765] tracking-widest uppercase mb-1.5 sm:mb-2 font-mono">REAL-TIME STREAM</div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#ebdcb9]">Live Ledger Telemetry</h2>
              </div>
              <div className="text-xs text-[#2ecc71] font-bold font-mono">SYSTEM STATUS: NOMINAL</div>
            </div>

            <div className="dashboard-panel p-4 sm:p-5 bg-[#151410] text-xs font-mono space-y-3">
              <div className="text-[#807765] text-[9px] sm:text-[10px] pb-2 border-b border-[#3b372f] flex justify-between">
                <span>TIMESTAMP &middot; EVENT LOG</span>
                <span className="hidden sm:inline">TX HASH RECEIPT</span>
              </div>
              {logs.map((l) => (
                <div key={l.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[#ebdcb9] gap-1 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 truncate max-w-full">
                    <span className="text-[#807765] text-[10px] sm:text-xs flex-shrink-0">{l.time}</span>
                    <span className="font-semibold truncate text-[11px] sm:text-xs">{l.msg}</span>
                  </div>
                  <span className="text-[#807765] text-[10px] sm:text-[11px] font-mono">{l.hash}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CAPITAL RECOVERY CALCULATOR */}
        <section className="py-16 sm:py-28 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-xs text-[#807765] tracking-widest uppercase mb-2 font-mono">CAPITAL RECOVERY</div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#ebdcb9]">
              Estimated Uncollected IOU Recovery.
            </h2>
          </div>

          <div className="dashboard-panel p-5 sm:p-8 bg-[#1e1c16]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center">
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <div className="flex justify-between text-xs text-[#807765] mb-2 font-mono">
                    <span>GROUP MEMBERS</span>
                    <span className="text-[#ebdcb9] font-bold">{groupSize} PEOPLE</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#151410] rounded appearance-none cursor-pointer border border-[#3b372f]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#807765] mb-2 font-mono">
                    <span>MONTHLY EXPENSES</span>
                    <span className="text-[#ebdcb9] font-bold">${monthlySpend.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="10000"
                    step="100"
                    value={monthlySpend}
                    onChange={(e) => setMonthlySpend(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#151410] rounded appearance-none cursor-pointer border border-[#3b372f]"
                  />
                </div>
              </div>

              <div className="border border-[#3b372f] p-5 sm:p-6 rounded-lg bg-[#151410] text-center space-y-3 sm:space-y-4 font-mono">
                <div className="text-[11px] sm:text-xs text-[#807765] tracking-widest uppercase font-bold">ANNUAL RECOVERED CAPITAL</div>
                <div className="text-3xl sm:text-4xl font-bold text-[#2ecc71]">
                  ${Math.round(monthlySpend * 0.14 * 12).toLocaleString()}
                </div>
                <div className="text-[11px] sm:text-xs text-[#807765]">
                  Based on 14% industry average uncollected informal group debt.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. TECHNICAL FAQ ACCORDION */}
        <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-t border-[#3b372f]">
          <div className="mb-8 sm:mb-12">
            <div className="text-xs text-[#807765] tracking-widest uppercase mb-2 font-mono">KNOWLEDGE BASE</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#ebdcb9]">Protocol FAQ.</h2>
          </div>

          <div className="space-y-3 font-mono">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="border border-[#3b372f] rounded-lg bg-[#1e1c16] overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex justify-between items-center text-xs sm:text-sm font-bold text-[#ebdcb9] hover:text-[#e74c3c] transition-colors gap-3"
                  >
                    <span>{faq.q}</span>
                    <span className="text-[#807765] flex-shrink-0">{isOpen ? "[ − ]" : "[ + ]"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-[#807765] leading-relaxed font-sans border-t border-[#3b372f] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. MINIMAL CTA */}
        <section className="py-20 sm:py-32 text-center px-4 sm:px-6 border-t border-[#3b372f] bg-[#1e1c16]">
          <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#ebdcb9]">
              Start Monitoring Group Balances.
            </h2>
            <p className="text-[#807765] text-xs sm:text-sm font-sans">
              No registration or seed phrase required for offchain ledger tracking.
            </p>
            <div>
              <Link
                href="/dashboard"
                className="inline-block bg-[#e74c3c] text-white text-xs font-bold py-3.5 px-8 rounded-lg tracking-wider uppercase hover:bg-[#d6394a] transition-all shadow-md active:scale-95"
              >
                Launch Dashboard App &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="border-t border-[#3b372f] px-4 sm:px-6 py-8 sm:py-10 bg-[#151410] text-[11px] sm:text-xs text-[#807765] font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>TALLY PROTOCOL &middot; SHARED SETTLEMENT LEDGER &middot; 2026</div>
          <div className="flex gap-4 sm:gap-6">
            <a href="https://monad.xyz" target="_blank" rel="noreferrer" className="hover:text-[#ebdcb9] transition-colors">MONAD EVM</a>
            <a href="https://github.com/finality-app" target="_blank" rel="noreferrer" className="hover:text-[#ebdcb9] transition-colors">GITHUB</a>
            <Link href="/dashboard" className="hover:text-[#ebdcb9] transition-colors">APP</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
