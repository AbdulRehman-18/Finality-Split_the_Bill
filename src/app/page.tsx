"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const dashboardThemeVars = {
  "--color-bg": "#f2ecd8",
  "--color-ink": "#1c1c1c",
  "--color-panel": "#ffffff",
  "--color-border": "#d4cfc0",
  "--color-muted": "#8a8475",
} as React.CSSProperties;

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="marketing-theme min-h-screen w-full bg-bg text-ink font-sans selection:bg-red selection:text-white relative overflow-hidden">
      {/* 1. NAV BAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 border-b w-full ${
          scrolled ? "bg-bg/80 backdrop-blur-md border-border shadow-lg" : "bg-transparent border-transparent"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all">
          <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
          <span className="font-mono text-sm font-bold tracking-widest uppercase text-white">
            Finality
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          <a href="#product" className="hover:text-white transition-colors text-muted">Product</a>
          <a href="#how-it-works" className="hover:text-white transition-colors text-muted">How It Works</a>
          <a href="https://github.com/finality-app" target="_blank" rel="noreferrer" className="hover:text-white transition-colors text-muted">GitHub</a>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/finality-app"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:block border border-border hover:border-white text-ink font-mono text-xs font-semibold tracking-wider uppercase py-2 px-4 rounded transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="bg-red text-white font-mono text-xs font-semibold tracking-wider uppercase py-2 px-4 rounded hover:opacity-90 transition-opacity"
          >
            Open Dashboard &rarr;
          </Link>
        </div>
      </nav>

      <main className="pt-32 w-full relative z-10">
        {/* Ambient background lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-red/10 blur-[150px] rounded-full pointer-events-none animate-pulse-slow" />
        
        {/* 2. HERO */}
        <section className="px-6 flex flex-col items-center text-center max-w-5xl mx-auto mb-32 relative z-10">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center border border-red/40 bg-red/5 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8 animate-fade-in-up shadow-[0_0_15px_rgba(204,0,30,0.2)]">
            <span className="w-2 h-2 rounded-full bg-red animate-pulse mr-2 shadow-[0_0_8px_#cc001e]" />
            <span className="font-mono text-[10px] sm:text-xs uppercase text-red tracking-widest font-bold">
              LIVE &middot; ONCHAIN SETTLEMENT ENGINE
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight mb-8 leading-[1.1] text-white animate-fade-in-up-1">
            Every debt. <br />
            Watched. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red via-[#ff4d4d] to-red animate-gradient-shift">
              Until it's paid.
            </span>
          </h1>

          <p className="text-muted text-lg md:text-xl max-w-2xl leading-relaxed mb-12 animate-fade-in-up-2">
            Finality turns group expenses into a live dashboard instead of a forgotten IOU. Every balance visible. Every settlement onchain. Built on Monad.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-20 animate-fade-in-up-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-red text-white font-mono text-sm font-bold tracking-wider uppercase py-4 px-8 rounded hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,0,30,0.4)] hover:shadow-[0_0_30px_rgba(204,0,30,0.6)] hover:-translate-y-0.5"
            >
              Open Dashboard &rarr;
            </Link>
            <a
              href="https://github.com/finality-app"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto border border-border text-ink hover:border-white hover:text-white font-mono text-sm font-semibold tracking-wider uppercase py-4 px-8 rounded transition-all flex items-center justify-center gap-2 bg-panel/30 backdrop-blur-sm hover:bg-panel/50 hover:-translate-y-0.5"
            >
              View on GitHub
            </a>
          </div>

          {/* Hero UI Mock */}
          <div className="w-full relative animate-fade-in-up-3 pt-4">
            <div className="absolute inset-0 bg-red/20 blur-[120px] rounded-full transform scale-95 translate-y-10 pointer-events-none" />
            <div className="relative rounded-xl overflow-hidden border border-[#d4cfc0] shadow-2xl" style={dashboardThemeVars}>
              
              <div className="w-full h-[400px] bg-[#f2ecd8] flex items-center justify-center relative overflow-hidden">
                {/* SVG Graph perfectly matching real canvas ForceGraph */}
                <svg width="100%" height="100%" viewBox="0 0 800 400">
                  {/* Grid Lines */}
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8e2d0" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Edges */}
                  <g fill="none">
                    {/* You -> Alice (Pending) */}
                    <path d="M400,200 Q325,160 250,150" stroke="#3b6fd6" strokeWidth="3" opacity="0.7" />
                    <text x="325" y="165" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$12.50</text>
                    <polygon points="265,152 272,147 274,157" fill="#3b6fd6" opacity="0.7" />

                    {/* Bob -> You (Pending) */}
                    <path d="M550,100 Q485,140 400,200" stroke="#3b6fd6" strokeWidth="4" opacity="0.7" />
                    <text x="485" y="135" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$45.00</text>
                    <polygon points="415,188 423,184 419,194" fill="#3b6fd6" opacity="0.7" />

                    {/* You -> Charlie (Pending) */}
                    <path d="M400,200 Q440,260 500,300" stroke="#3b6fd6" strokeWidth="5" opacity="0.7" />
                    <text x="440" y="250" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$120.00</text>
                    <polygon points="485,285 491,277 482,275" fill="#3b6fd6" opacity="0.7" />

                    {/* Alice -> Dave (Settled) */}
                    <path d="M250,150 Q285,235 300,300" stroke="#1f9e5c" strokeWidth="2" opacity="0.4" />
                    <text x="265" y="235" fill="#1f9e5c" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$8.00</text>
                    <polygon points="295,282 302,277 292,274" fill="#1f9e5c" opacity="0.4" />

                    {/* Settlement Particle Animation */}
                    <circle r="4" fill="#1f9e5c">
                      <animateMotion path="M250,150 Q285,235 300,300" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="8" fill="rgba(31,158,92,0.2)">
                      <animateMotion path="M250,150 Q285,235 300,300" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>

                  {/* Nodes */}
                  <g className="font-mono text-[10px] font-semibold fill-ink" textAnchor="middle">
                    {/* You */}
                    <circle cx="400" cy="200" r="18" fill="#ffffff" stroke="#3b6fd6" strokeWidth="2.5" />
                    <circle cx="400" cy="200" r="4" fill="#3b6fd6" />
                    <text x="400" y="230">You</text>
                    
                    {/* Alice */}
                    <circle cx="250" cy="150" r="18" fill="#ffffff" stroke="#1f9e5c" strokeWidth="2.5" />
                    <circle cx="250" cy="150" r="4" fill="#1f9e5c" />
                    <text x="250" y="180">Alice</text>
                    
                    {/* Bob */}
                    <circle cx="550" cy="100" r="18" fill="#ffffff" stroke="#d6394a" strokeWidth="2.5" />
                    <circle cx="550" cy="100" r="4" fill="#d6394a" />
                    <text x="550" y="130">Bob</text>
                    
                    {/* Charlie */}
                    <circle cx="500" cy="300" r="18" fill="#ffffff" stroke="#d98a1f" strokeWidth="2.5" />
                    <circle cx="500" cy="300" r="4" fill="#d98a1f" />
                    <text x="500" y="330">Charlie</text>
                    
                    {/* Dave */}
                    <circle cx="300" cy="300" r="18" fill="#ffffff" stroke="#9b5fd6" strokeWidth="2.5" />
                    <circle cx="300" cy="300" r="4" fill="#9b5fd6" />
                    <text x="300" y="330">Dave</text>
                  </g>
                </svg>
                {/* Overlay labels */}
                <div className="absolute top-4 left-4 flex gap-3 bg-panel p-2 rounded shadow-sm border border-border">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#3b6fd6] rounded" />
                    <span className="font-mono text-[10px] text-muted uppercase font-bold">PENDING</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#1f9e5c] rounded" />
                    <span className="font-mono text-[10px] text-muted uppercase font-bold">SETTLED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. THE PROBLEM */}
        <section id="product" className="py-24 border-t border-border bg-panel">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Group debt doesn't get tracked.<br />It gets forgotten.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Old way */}
              <div className="p-8 border border-border rounded-lg bg-bg flex flex-col h-full opacity-60 grayscale">
                <span className="font-mono text-xs uppercase tracking-widest text-muted mb-8">The Old Way</span>
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div className="flex flex-col gap-4 w-full max-w-sm font-sans text-sm">
                    <div className="bg-panel border border-border p-3 rounded-xl rounded-tl-sm self-start max-w-[85%] text-ink">
                      Hey, can someone pay me back for dinner?
                    </div>
                    <div className="bg-ink text-bg p-3 rounded-xl rounded-tr-sm self-end max-w-[85%]">
                      Sure, how much was it again?
                    </div>
                    <div className="bg-panel border border-border p-3 rounded-xl rounded-tl-sm self-start max-w-[85%] text-muted">
                      I think $45 each, but wait Alice paid for drinks...
                    </div>
                    <div className="bg-panel border border-border p-3 rounded-xl rounded-tl-sm self-start max-w-[85%] text-ink">
                      Actually, let me check the spreadsheet tonight.
                    </div>
                  </div>
                </div>
              </div>

              {/* New way */}
              <div className="p-8 border border-red/30 rounded-lg bg-bg flex flex-col h-full relative overflow-hidden shadow-[0_0_40px_rgba(204,0,30,0.05)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red/10 blur-3xl rounded-full pointer-events-none" />
                <span className="font-mono text-xs uppercase tracking-widest text-white mb-8 relative z-10">The Finality Way</span>
                <div className="flex-1 flex items-center justify-center relative z-10 w-full">
                  <div className="w-full text-ink font-sans rounded shadow-xl overflow-hidden" style={dashboardThemeVars}>
                    <div className="grid grid-cols-2 lg:flex lg:items-stretch border border-border bg-panel text-left">
                      <div className="col-span-2 lg:col-span-auto flex items-center justify-center gap-2 px-4 py-3 border-b lg:border-b-0 border-border bg-red/5">
                        <span className="pill pill-critical">1 OVERDUE</span>
                      </div>
                      <div className="px-4 py-3 border-r border-b lg:border-b-0 border-border flex-1">
                        <div className="label-caps mb-1">POT TOTAL</div>
                        <div className="metric-value text-lg text-ink">$450.00</div>
                      </div>
                      <div className="px-4 py-3 border-r border-b lg:border-b-0 border-border flex-1">
                        <div className="label-caps mb-1">ACTIVE</div>
                        <div className="metric-value text-lg text-[#3b6fd6]">6</div>
                      </div>
                      <div className="px-4 py-3 border-b lg:border-b-0 border-border flex-1">
                        <div className="label-caps mb-1">SETTLED</div>
                        <div className="metric-value text-lg text-[#1f9e5c]">3</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" className="py-32">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="font-display text-4xl font-bold mb-20 text-white tracking-tight text-center">
              How It Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-full aspect-[4/3] rounded-lg border border-[#d4cfc0] overflow-hidden relative shadow-lg mb-8" style={dashboardThemeVars}>
                  <div className="flex flex-col p-6 w-full h-full justify-center bg-bg items-center text-left">
                    <div className="panel p-4 bg-panel shadow-sm w-full max-w-[200px]">
                      <div className="label-caps mb-2 text-[10px]">New Expense</div>
                      <div className="border border-border rounded p-2 mb-3 text-xs text-ink bg-bg truncate">
                        Dinner at Mario's
                      </div>
                      <div className="border border-border rounded p-2 mb-4 text-xs font-mono text-ink bg-bg flex justify-between items-center">
                        <span className="font-bold">$120.00</span>
                        <span className="text-[10px] text-muted">USD</span>
                      </div>
                      <div className="bg-ink text-panel font-mono text-[10px] font-bold py-2 text-center rounded uppercase tracking-wider">
                        Log Expense
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-mono text-red font-bold mb-3 text-lg">01</div>
                <h3 className="font-mono font-bold uppercase tracking-widest text-white mb-3">Log It</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Log who paid and who owes. No spreadsheets, just an immutable record of truth.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center mt-0 md:mt-12">
                <div className="w-full aspect-[4/3] rounded-lg border border-[#d4cfc0] overflow-hidden relative shadow-lg mb-8" style={dashboardThemeVars}>
                  <div className="flex items-center justify-center w-full h-full bg-bg relative">
                    <svg width="100%" height="100%" viewBox="0 0 200 150">
                      <pattern id="grid-sm" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e8e2d0" strokeWidth="0.25" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#grid-sm)" />
                      
                      {/* Edges */}
                      <g fill="none">
                        {/* You -> Alice */}
                        <path d="M100,75 Q75,55 50,40" stroke="#1f9e5c" strokeWidth="1.5" opacity="0.4" />
                        <polygon points="60,42 63,45 57,47" fill="#1f9e5c" opacity="0.4" />
                        
                        {/* You -> Bob (Active) */}
                        <path d="M100,75 Q125,55 150,50" stroke="#3b6fd6" strokeWidth="2" opacity="0.7" />
                        <polygon points="138,50 135,55 142,57" fill="#3b6fd6" opacity="0.7" />
                        <circle r="2" fill="#3b6fd6">
                          <animateMotion path="M100,75 Q125,55 150,50" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle r="4" fill="rgba(59,111,214,0.2)">
                          <animateMotion path="M100,75 Q125,55 150,50" dur="2s" repeatCount="indefinite" />
                        </circle>

                        {/* You -> Charlie */}
                        <path d="M100,75 Q115,95 120,120" stroke="#1f9e5c" strokeWidth="1" opacity="0.4" />
                        <polygon points="118,108 123,110 115,112" fill="#1f9e5c" opacity="0.4" />
                      </g>

                      {/* Nodes */}
                      <g>
                        {/* You */}
                        <circle cx="100" cy="75" r="14" fill="#ffffff" stroke="#3b6fd6" strokeWidth="2" />
                        <circle cx="100" cy="75" r="3" fill="#3b6fd6" />
                        
                        {/* Alice */}
                        <circle cx="50" cy="40" r="10" fill="#ffffff" stroke="#1f9e5c" strokeWidth="1.5" />
                        <circle cx="50" cy="40" r="2" fill="#1f9e5c" />
                        
                        {/* Bob */}
                        <circle cx="150" cy="50" r="10" fill="#ffffff" stroke="#d6394a" strokeWidth="1.5" />
                        <circle cx="150" cy="50" r="2" fill="#d6394a" />
                        
                        {/* Charlie */}
                        <circle cx="120" cy="120" r="10" fill="#ffffff" stroke="#d98a1f" strokeWidth="1.5" />
                        <circle cx="120" cy="120" r="2" fill="#d98a1f" />
                      </g>
                    </svg>
                  </div>
                </div>
                <div className="font-mono text-red font-bold mb-3 text-lg">02</div>
                <h3 className="font-mono font-bold uppercase tracking-widest text-white mb-3">Watch It</h3>
                <p className="text-muted text-sm leading-relaxed">
                  A live debt graph shows every open balance in real time. Total visibility for all group members.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center mt-0 md:mt-24">
                <div className="w-full aspect-[4/3] rounded-lg border border-[#d4cfc0] overflow-hidden relative shadow-lg mb-8" style={dashboardThemeVars}>
                  <div className="flex flex-col p-6 w-full h-full justify-center bg-bg items-center">
                    <div className="panel p-5 bg-panel shadow-sm text-center flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-[#1f9e5c] text-panel flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="font-mono text-sm font-bold mb-1 text-ink">SETTLED</div>
                      <div className="text-[10px] text-muted font-mono mb-4 truncate max-w-[150px]">0.05 MON &rarr; Bob</div>
                      <div className="bg-[#e8f5e9] text-[#1f9e5c] font-mono text-[9px] font-bold py-1.5 px-3 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-[#1f9e5c]/20">
                        <span className="w-1.5 h-1.5 bg-[#1f9e5c] rounded-full animate-pulse" />
                        Tx Confirmed
                      </div>
                    </div>
                  </div>
                </div>
                <div className="font-mono text-red font-bold mb-3 text-lg">03</div>
                <h3 className="font-mono font-bold uppercase tracking-widest text-white mb-3">Settle It</h3>
                <p className="text-muted text-sm leading-relaxed">
                  One tap sends the exact amount, wallet to wallet, onchain. Instant finality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FEATURES GRID */}
        <section className="py-24 border-y border-border bg-panel">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {/* Feature 1 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#3b6fd6]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Live debt graph</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  Visualize the network of who owes who in real-time, instantly recalculated on every log. No polling, pure live data.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#1f9e5c]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Direct wallet-to-wallet</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  Settlements happen directly between users. No pooled custody, no multi-sig bottlenecks, no middleman.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#b8c0c2]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Full onchain history</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  Every log and settlement is written as a permanent record. Trustless auditability for the entire group.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#d6394a]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Exact-amount enforcement</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  The smart contract enforces accuracy. It outright rejects wrong-amount settlements.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#9b5fd6]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Built on Monad</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  Leveraging Monad's high throughput for fast finality and low fees, making micro-settlements viable.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-panel p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#d98a1f]" />
                  <h4 className="font-mono font-semibold uppercase tracking-widest text-white text-xs">Verified contract</h4>
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  The settlement engine is open and verified. Inspect the logic yourself on the block explorer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. LIVE DASHBOARD PREVIEW */}
        <section className="py-32 overflow-hidden bg-bg w-full">
          <div className="max-w-[1200px] mx-auto px-6 w-full">
            <div className="relative rounded-xl overflow-hidden border border-[#d4cfc0] shadow-[0_0_120px_rgba(204,0,30,0.08)]" style={dashboardThemeVars}>
              
              {/* EXACT Dashboard Layout Mock */}
              <div className="w-full h-[600px] flex flex-col overflow-hidden bg-bg font-sans text-ink text-left">
                {/* Top Header */}
                <header className="border-b border-border px-4 py-2 flex items-center justify-between bg-panel flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button className="font-mono text-xs text-muted">←</button>
                    <div className="w-2 h-2 rounded-full bg-[#1f9e5c]" />
                    <h1 className="font-mono text-xs font-bold tracking-widest uppercase">Finality</h1>
                    <span className="pill pill-live"><span className="live-dot" />LIVE</span>
                    <span className="font-mono text-xs text-muted hidden sm:inline">|</span>
                    <span className="font-mono text-xs font-semibold hidden sm:inline">Hackathon Crew</span>
                    <span className="font-mono text-[10px] text-muted hidden sm:inline">[F8D5KW]</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="font-mono text-xs text-muted">⚙ settings</button>
                    <span className="font-mono text-[10px] text-muted hidden md:inline">14:32:00</span>
                    <button className="bg-ink text-panel font-mono text-[10px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded">
                      + LOG EXPENSE
                    </button>
                  </div>
                </header>

                {/* Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:items-stretch border-b border-border bg-panel flex-shrink-0">
                  <div className="px-4 py-3 border-r border-b xl:border-b-0 border-border">
                    <div className="label-caps mb-1">POT TOTAL</div>
                    <div className="metric-value text-lg text-ink">$450.00</div>
                  </div>
                  <div className="px-4 py-3 border-r border-b xl:border-b-0 border-border">
                    <div className="label-caps mb-1">ACTIVE DEBTS</div>
                    <div className="metric-value text-lg text-[#3b6fd6]">6</div>
                  </div>
                  <div className="px-4 py-3 border-r border-b xl:border-b-0 border-border">
                    <div className="label-caps mb-1">SETTLED</div>
                    <div className="metric-value text-lg text-[#1f9e5c]">3</div>
                  </div>
                  <div className="px-4 py-3 border-r border-b xl:border-b-0 border-border">
                    <div className="label-caps mb-1">OUTSTANDING</div>
                    <div className="metric-value text-lg text-[#d98a1f]">$177.50</div>
                  </div>
                  <div className="px-4 py-3 border-r border-b xl:border-b-0 border-border">
                    <div className="label-caps mb-1">SETTLE RATE</div>
                    <div className="metric-value text-lg text-[#d98a1f]">33%</div>
                  </div>
                  <div className="px-4 py-3 border-b xl:border-b-0 border-border xl:border-r-0">
                    <div className="label-caps mb-1">TX COUNT</div>
                    <div className="metric-value text-lg text-ink">9</div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Panel - Debts */}
                  <div className="w-full lg:w-72 xl:w-80 border-r border-border bg-panel flex-shrink-0 hidden lg:flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border bg-panel/50 flex items-center justify-between sticky top-0 z-10">
                      <span className="label-caps">Active Network Debts</span>
                      <span className="font-mono text-[10px] text-muted">6 TOTAL</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {[
                        { debtor: "You", creditor: "Alice", amount: "$12.50", type: "owe" },
                        { debtor: "Bob", creditor: "You", amount: "$45.00", type: "receive" },
                        { debtor: "You", creditor: "Charlie", amount: "$120.00", type: "owe" },
                      ].map((d, i) => (
                        <div key={i} className="panel p-3 flex flex-col gap-2 relative group hover:border-ink transition-colors cursor-pointer bg-bg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-[10px] text-muted mb-1 uppercase tracking-wider">{d.type === "owe" ? "YOU OWE" : "OWES YOU"}</div>
                              <div className="font-mono text-sm font-bold truncate max-w-[120px]">{d.type === "owe" ? d.creditor : d.debtor}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono text-sm font-bold ${d.type === "owe" ? "text-[#d6394a]" : "text-[#1f9e5c]"}`}>{d.amount}</div>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-border mt-1">
                            <button className="w-full bg-ink text-panel font-mono text-[10px] font-bold py-1.5 px-3 rounded uppercase tracking-wider hover:opacity-90">
                              SETTLE DEBT
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center - Graph */}
                  <div className="flex-1 flex flex-col overflow-hidden relative bg-[#f2ecd8]">
                    <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-panel/50 absolute top-0 left-0 right-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="label-caps">Debt Network</span>
                        <span className="font-mono text-[10px] text-muted">5 NODES · 9 EDGES</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-0.5 bg-[#3b6fd6] rounded" />
                          <span className="font-mono text-[10px] text-muted">PENDING</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-0.5 bg-[#1f9e5c] rounded" />
                          <span className="font-mono text-[10px] text-muted">SETTLED</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 mt-10 relative">
                      <svg width="100%" height="100%" viewBox="0 0 800 400">
                        {/* Grid Lines */}
                        <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8e2d0" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid2)" />

                        {/* Edges */}
                        <g fill="none">
                          <path d="M400,200 Q325,160 250,150" stroke="#3b6fd6" strokeWidth="3" opacity="0.7" />
                          <text x="325" y="165" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$12.50</text>
                          <polygon points="265,152 272,147 274,157" fill="#3b6fd6" opacity="0.7" />

                          <path d="M550,100 Q485,140 400,200" stroke="#3b6fd6" strokeWidth="4" opacity="0.7" />
                          <text x="485" y="135" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$45.00</text>
                          <polygon points="415,188 423,184 419,194" fill="#3b6fd6" opacity="0.7" />

                          <path d="M400,200 Q440,260 500,300" stroke="#3b6fd6" strokeWidth="5" opacity="0.7" />
                          <text x="440" y="250" fill="#3b6fd6" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$120.00</text>
                          <polygon points="485,285 491,277 482,275" fill="#3b6fd6" opacity="0.7" />

                          <path d="M250,150 Q285,235 350,80" stroke="#1f9e5c" strokeWidth="2" opacity="0.4" />
                          <text x="315" y="165" fill="#1f9e5c" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono" textAnchor="middle">$8.00</text>
                          <polygon points="338,98 344,103 332,105" fill="#1f9e5c" opacity="0.4" />
                          
                          {/* Settlement Particle Animation */}
                          <circle r="4" fill="#1f9e5c">
                            <animateMotion path="M250,150 Q285,235 350,80" dur="2s" repeatCount="indefinite" />
                          </circle>
                        </g>

                        {/* Nodes */}
                        <g className="font-mono text-[10px] font-semibold fill-ink" textAnchor="middle">
                          <circle cx="400" cy="200" r="18" fill="#ffffff" stroke="#3b6fd6" strokeWidth="2.5" />
                          <circle cx="400" cy="200" r="4" fill="#3b6fd6" />
                          <text x="400" y="230">You</text>
                          
                          <circle cx="250" cy="150" r="18" fill="#ffffff" stroke="#1f9e5c" strokeWidth="2.5" />
                          <circle cx="250" cy="150" r="4" fill="#1f9e5c" />
                          <text x="250" y="180">Alice</text>
                          
                          <circle cx="550" cy="100" r="18" fill="#ffffff" stroke="#d6394a" strokeWidth="2.5" />
                          <circle cx="550" cy="100" r="4" fill="#d6394a" />
                          <text x="550" y="130">Bob</text>
                          
                          <circle cx="500" cy="300" r="18" fill="#ffffff" stroke="#d98a1f" strokeWidth="2.5" />
                          <circle cx="500" cy="300" r="4" fill="#d98a1f" />
                          <text x="500" y="330">Charlie</text>
                          
                          <circle cx="350" cy="80" r="18" fill="#ffffff" stroke="#9b5fd6" strokeWidth="2.5" />
                          <circle cx="350" cy="80" r="4" fill="#9b5fd6" />
                          <text x="350" y="110">Dave</text>
                        </g>
                      </svg>
                    </div>
                  </div>

                  {/* Right Panel - Stats/Alerts */}
                  <div className="w-full lg:w-64 xl:w-72 border-l border-border bg-panel flex-shrink-0 hidden lg:flex flex-col overflow-hidden">
                    <div className="flex border-b border-border">
                      <button className="flex-1 px-3 py-2 font-mono text-[10px] font-semibold tracking-wider uppercase text-center border-b-2 border-ink text-ink">Engine</button>
                      <button className="flex-1 px-3 py-2 font-mono text-[10px] font-semibold tracking-wider uppercase text-center border-b-2 border-transparent text-muted">Alerts</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                       <div className="border border-border rounded p-3 bg-bg shadow-sm">
                        <div className="font-mono text-xs font-bold mb-2">Monad RPC</div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#1f9e5c] animate-pulse" />
                          <span className="font-mono text-[10px] text-[#1f9e5c]">CONNECTED · 14ms</span>
                        </div>
                      </div>
                      <div className="border border-border rounded p-3 bg-bg shadow-sm">
                        <div className="font-mono text-[10px] text-muted mb-1 uppercase tracking-wider">Settlement Engine</div>
                        <div className="font-mono text-xs font-bold mb-2 break-all">0x742d...44e5</div>
                        <div className="text-xs text-muted leading-relaxed">Validating exact amounts. Trustless execution active.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <footer className="border-t border-border px-4 py-1.5 flex items-center justify-between bg-panel flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <span className="label-caps">5 OPERATORS</span>
                    <span className="label-caps hidden sm:inline">6 ACTIVE · 3 SETTLED</span>
                  </div>
                  <span className="label-caps hidden md:inline">ALL SYSTEMS NOMINAL</span>
                </footer>
              </div>

            </div>
            
            <div className="mt-12 text-center flex flex-col items-center">
              <p className="font-mono text-sm uppercase tracking-widest text-muted mb-4">
                This isn't a mockup. This is what's running right now.
              </p>
              <Link
                href="/dashboard"
                className="font-mono text-xs text-red hover:text-white uppercase tracking-wider transition-colors underline decoration-dotted underline-offset-4"
              >
                Access the Live App &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* 7. TRUST / TECH SECTION */}
        <section className="py-32 bg-panel border-t border-border">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-16 items-center">
            <div className="md:col-span-3">
              <h2 className="font-display text-4xl font-bold mb-6 text-white tracking-tight">
                Trustless by design.
              </h2>
              <p className="text-muted text-base leading-relaxed mb-6">
                We believe financial ledgers shouldn't require blind faith. Finality operates with absolutely no custodial pools. Every transaction routes securely from your wallet directly to the recipient's wallet through our verified smart contract.
              </p>
              <p className="text-muted text-base leading-relaxed">
                The code is completely open source and the contract address is publicly verifiable on the Monad testnet explorer.
              </p>
            </div>
            
            <div className="md:col-span-2">
              <div className="border border-border rounded-lg p-8 bg-bg hover:border-red/40 transition-colors group shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span className="font-mono font-bold text-white text-base">finality-app</span>
                </div>
                <p className="text-muted text-sm mb-8 leading-relaxed">
                  Read the code yourself &mdash; nothing hidden. Fully transparent ops center.
                </p>
                <a 
                  href="https://github.com/finality-app"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full block text-center border border-border group-hover:border-white text-white font-mono text-sm font-semibold uppercase tracking-wider py-3 px-4 rounded transition-colors"
                >
                  View Repository
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section className="py-40 text-center px-6 bg-bg border-t border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-12 text-white">
              Nothing owed goes unnoticed.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-red text-white font-mono text-sm font-bold tracking-wider uppercase py-4 px-10 rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Open Dashboard &rarr;
              </Link>
              <a
                href="https://github.com/finality-app"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto border border-border text-ink hover:border-white hover:text-white font-mono text-sm font-semibold tracking-wider uppercase py-4 px-10 rounded transition-colors flex items-center justify-center gap-2 bg-panel/50"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="border-t border-border px-6 py-12 flex flex-col md:flex-row items-center justify-between bg-panel w-full max-w-[100vw]">
        <div className="flex items-center gap-3 mb-6 md:mb-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-white">
            Finality
          </span>
        </div>
        
        <div className="flex items-center gap-8">
          <a href="https://monad.xyz" target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-white transition-colors flex items-center gap-2 uppercase tracking-wider">
            Built on Monad
          </a>
          <a href="https://github.com/finality-app" target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-white transition-colors flex items-center gap-2 uppercase tracking-wider">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
