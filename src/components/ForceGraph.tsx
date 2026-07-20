"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Member, Debt } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface GraphNode {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  key: string;
  source: number;
  target: number;
  amount: number;
  settled: boolean;
  debtCount: number;
  debtIds: number[];
}

interface Props {
  members: Member[];
  debts: Debt[];
  recentlySettled: Set<number>;
  viewMode?: "net" | "directional" | "detailed";
  hideSettled?: boolean;
}

interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  settled: boolean;
  linkKey: string;
}

export default function ForceGraph({
  members,
  debts,
  recentlySettled,
  viewMode = "net",
  hideSettled = true,
}: Props) {
  const { formatCurrency } = useAuth();
  const formatCurrencyRef = useRef(formatCurrency);
  formatCurrencyRef.current = formatCurrency;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hover refs to avoid React re-renders tearing down the animation loop
  const hoveredNodeIdRef = useRef<number | null>(null);
  const hoveredLinkKeyRef = useRef<string | null>(null);
  const tooltipRef = useRef<{
    x: number;
    y: number;
    title: string;
    items: string[];
  } | null>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const nodeByIdRef = useRef<Map<number, GraphNode>>(new Map());
  const linkGroupsRef = useRef<Map<string, GraphLink[]>>(new Map());

  const animRef = useRef<number>(0);
  const alphaRef = useRef(1.0);
  const draggedNodeRef = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const particlesRef = useRef<
    { linkIdx: number; progress: number; speed: number }[]
  >([]);

  // Curve cache for hover detection
  const curvesRef = useRef<
    {
      linkKey: string;
      sourceId: number;
      targetId: number;
      amount: number;
      x0: number;
      y0: number;
      cx: number;
      cy: number;
      x1: number;
      y1: number;
    }[]
  >([]);

  // Function to request next tick
  const wakeAnimationRef = useRef<() => void>(() => {});

  const buildGraph = useCallback(() => {
    const existingNodes = nodesRef.current;
    const existingNodeById = new Map(existingNodes.map((n) => [n.id, n]));

    const container = containerRef.current;
    const cw = container?.clientWidth && container.clientWidth > 100 ? container.clientWidth : 600;
    const ch = container?.clientHeight && container.clientHeight > 100 ? container.clientHeight : 450;
    const centerX = cw / 2;
    const centerY = ch / 2;

    // Build nodes and guarantee valid initial coordinates
    const nodes: GraphNode[] = members.map((m, i) => {
      const existing = existingNodeById.get(m.id);
      let x = existing?.x;
      let y = existing?.y;

      if (x === undefined || y === undefined || isNaN(x) || isNaN(y) || x <= 10 || y <= 10) {
        if (members.length === 1) {
          x = centerX;
          y = centerY;
        } else {
          const angle = (2 * Math.PI * i) / members.length;
          const radius = Math.min(centerX, centerY) * 0.55;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }
      }

      return {
        id: m.id,
        name: m.name,
        color: m.color || "#3b6fd6",
        x,
        y,
        vx: existing?.vx || 0,
        vy: existing?.vy || 0,
      };
    });

    // Filter debts based on hideSettled
    const filteredDebts = hideSettled ? debts.filter((d) => !d.settled) : debts;

    let links: GraphLink[] = [];

    if (viewMode === "net") {
      // Net Consolidated Mode: Aggregate net debt per member pair into 1 clean arrow
      const pairMap = new Map<
        string,
        {
          abDebts: Debt[];
          baDebts: Debt[];
          minId: number;
          maxId: number;
        }
      >();

      filteredDebts.forEach((d) => {
        const minId = Math.min(d.debtorId, d.creditorId);
        const maxId = Math.max(d.debtorId, d.creditorId);
        const key = `${minId}-${maxId}`;

        const entry = pairMap.get(key) || {
          abDebts: [],
          baDebts: [],
          minId,
          maxId,
        };

        if (d.debtorId === minId) {
          entry.abDebts.push(d);
        } else {
          entry.baDebts.push(d);
        }
        pairMap.set(key, entry);
      });

      pairMap.forEach((entry, pairKey) => {
        const sumAB = entry.abDebts.reduce((s, d) => s + parseFloat(d.amount), 0);
        const sumBA = entry.baDebts.reduce((s, d) => s + parseFloat(d.amount), 0);
        const net = sumAB - sumBA;

        const allDebts = [...entry.abDebts, ...entry.baDebts];
        const allSettled = allDebts.every((d) => d.settled);

        if (Math.abs(net) > 0.001) {
          if (net > 0) {
            links.push({
              key: `net-${pairKey}`,
              source: entry.minId,
              target: entry.maxId,
              amount: net,
              settled: allSettled,
              debtCount: allDebts.length,
              debtIds: allDebts.map((d) => d.id),
            });
          } else {
            links.push({
              key: `net-${pairKey}`,
              source: entry.maxId,
              target: entry.minId,
              amount: Math.abs(net),
              settled: allSettled,
              debtCount: allDebts.length,
              debtIds: allDebts.map((d) => d.id),
            });
          }
        } else if (allDebts.length > 0 && !hideSettled) {
          links.push({
            key: `net-${pairKey}`,
            source: entry.minId,
            target: entry.maxId,
            amount: 0,
            settled: true,
            debtCount: allDebts.length,
            debtIds: allDebts.map((d) => d.id),
          });
        }
      });
    } else if (viewMode === "directional") {
      // Directional Totals Mode
      const dirMap = new Map<string, Debt[]>();

      filteredDebts.forEach((d) => {
        const key = `${d.debtorId}->${d.creditorId}`;
        const group = dirMap.get(key) || [];
        group.push(d);
        dirMap.set(key, group);
      });

      dirMap.forEach((group, dirKey) => {
        const [sStr, tStr] = dirKey.split("->");
        const source = parseInt(sStr, 10);
        const target = parseInt(tStr, 10);
        const totalAmount = group.reduce((s, d) => s + parseFloat(d.amount), 0);
        const allSettled = group.every((d) => d.settled);

        links.push({
          key: `dir-${dirKey}`,
          source,
          target,
          amount: totalAmount,
          settled: allSettled,
          debtCount: group.length,
          debtIds: group.map((d) => d.id),
        });
      });
    } else {
      // Detailed Mode: Individual debt lines
      links = filteredDebts.map((d) => ({
        key: `detailed-${d.id}`,
        source: d.debtorId,
        target: d.creditorId,
        amount: parseFloat(d.amount),
        settled: d.settled,
        debtCount: 1,
        debtIds: [d.id],
      }));
    }

    nodesRef.current = nodes;
    linksRef.current = links;
    nodeByIdRef.current = new Map(nodes.map((node) => [node.id, node]));

    const linkGroups = new Map<string, GraphLink[]>();
    links.forEach((link) => {
      const key =
        link.source < link.target
          ? `${link.source}-${link.target}`
          : `${link.target}-${link.source}`;
      const group = linkGroups.get(key) || [];
      group.push(link);
      linkGroups.set(key, group);
    });
    linkGroupsRef.current = linkGroups;

    alphaRef.current = 1.0;
    wakeAnimationRef.current();
  }, [members, debts, viewMode, hideSettled]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  // Settlement particles
  useEffect(() => {
    recentlySettled.forEach((debtId) => {
      const linkIdx = linksRef.current.findIndex((l) =>
        l.debtIds.includes(debtId)
      );
      if (linkIdx !== -1) {
        particlesRef.current.push({
          linkIdx,
          progress: 0,
          speed: 0.02,
        });
      }
    });
    wakeAnimationRef.current();
  }, [recentlySettled]);

  // Persistent Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : 600;
        const height = rect.height > 0 ? rect.height : 450;

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        // Ensure nodes remain within valid bounds
        nodesRef.current.forEach((n) => {
          if (n.x === undefined || n.y === undefined || n.x <= 10 || n.y <= 10) {
            n.x = width / 2;
            n.y = height / 2;
          } else {
            n.x = Math.max(50, Math.min(width - 50, n.x));
            n.y = Math.max(50, Math.min(height - 50, n.y));
          }
        });
      }
    };
    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      alphaRef.current = 1.0;
      wakeAnimationRef.current();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const tick = () => {
      animRef.current = 0;

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeById = nodeByIdRef.current;
      const linkGroups = linkGroupsRef.current;
      const fmt = formatCurrencyRef.current;

      if (!ctx || !canvas) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(canvas.width / pixelRatio, 300);
      const ch = Math.max(canvas.height / pixelRatio, 300);

      // Re-initialize any misplaced node coordinates
      nodes.forEach((n, i) => {
        if (n.x === undefined || n.y === undefined || isNaN(n.x) || isNaN(n.y) || n.x <= 10 || n.y <= 10) {
          const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
          const radius = Math.min(cw, ch) * 0.28;
          n.x = cw / 2 + Math.cos(angle) * radius;
          n.y = ch / 2 + Math.sin(angle) * radius;
        }
      });

      // Theme colors
      const themeAttr =
        document.documentElement.getAttribute("data-theme") || "default";
      let themeInk = "#1c1c1c";
      let themePanel = "#ffffff";
      let themeBorder = "#d4cfc0";

      if (themeAttr === "dark-retro") {
        themeInk = "#ebdcb9";
        themePanel = "#1e1c16";
        themeBorder = "#3b372f";
      } else if (themeAttr === "modern-dark") {
        themeInk = "#f8fafc";
        themePanel = "#1e293b";
        themeBorder = "#334155";
      } else if (themeAttr === "cyber-neon") {
        themeInk = "#39ff14";
        themePanel = "#0a0f10";
        themeBorder = "#143015";
      } else {
        const rootStyle = getComputedStyle(document.documentElement);
        themeInk = rootStyle.getPropertyValue("--color-ink").trim() || themeInk;
        themePanel =
          rootStyle.getPropertyValue("--color-panel").trim() || themePanel;
        themeBorder =
          rootStyle.getPropertyValue("--color-border").trim() || themeBorder;
      }

      // Re-center single node
      if (nodes.length === 1 && nodes[0]) {
        nodes[0].x = cw / 2;
        nodes[0].y = ch / 2;
      }

      // Physics energy
      const isDragging = draggedNodeRef.current !== null;
      const alpha = Math.max(alphaRef.current, isDragging ? 0.4 : 0.05);

      if (!isDragging && alphaRef.current > 0.005) {
        alphaRef.current *= 0.985;
      }

      // 1. Center force
      nodes.forEach((n) => {
        if (draggedNodeRef.current?.id !== n.id) {
          n.vx = (n.vx || 0) + (cw / 2 - n.x) * 0.0015 * alpha;
          n.vy = (n.vy || 0) + (ch / 2 - n.y) * 0.0015 * alpha;
        }
      });

      // 2. Strong Repulsion & Collision force
      const minNodeDist = 160;
      const kRepulsion = 48000;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;

          let force = (kRepulsion / (dist * dist + 100)) * alpha;
          if (dist < minNodeDist) {
            const overlap = minNodeDist - dist;
            force += overlap * 0.25 * alpha;
          }

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (draggedNodeRef.current?.id !== a.id) {
            a.vx = (a.vx || 0) - fx;
            a.vy = (a.vy || 0) - fy;
          }
          if (draggedNodeRef.current?.id !== b.id) {
            b.vx = (b.vx || 0) + fx;
            b.vy = (b.vy || 0) + fy;
          }
        }
      }

      // 3. Spring force from links
      const targetDist = Math.max(220, Math.min(cw, ch) * 0.4);
      links.forEach((link) => {
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = ((dist - targetDist) / dist) * 0.04 * alpha;
        const fx = dx * force;
        const fy = dy * force;

        if (draggedNodeRef.current?.id !== sourceNode.id) {
          sourceNode.vx = (sourceNode.vx || 0) + fx;
          sourceNode.vy = (sourceNode.vy || 0) + fy;
        }
        if (draggedNodeRef.current?.id !== targetNode.id) {
          targetNode.vx = (targetNode.vx || 0) - fx;
          targetNode.vy = (targetNode.vy || 0) - fy;
        }
      });

      // 4. Velocity & canvas boundaries
      nodes.forEach((n) => {
        if (draggedNodeRef.current?.id === n.id) return;
        n.vx = (n.vx || 0) * 0.82;
        n.vy = (n.vy || 0) * 0.82;
        n.x += n.vx || 0;
        n.y += n.vy || 0;
        const pad = 50;
        n.x = Math.max(pad, Math.min(cw - pad, n.x));
        n.y = Math.max(pad, Math.min(ch - pad, n.y));
      });

      // Clear Canvas
      ctx.clearRect(0, 0, cw, ch);

      // Grid background
      ctx.strokeStyle = themeBorder;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.35;
      for (let x = 0; x < cw; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      for (let y = 0; y < ch; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Current hover state refs
      const hoveredNodeId = hoveredNodeIdRef.current;
      const hoveredLinkKey = hoveredLinkKeyRef.current;

      const renderedCurves: typeof curvesRef.current = [];
      const labelRects: LabelRect[] = [];

      // Draw edges
      links.forEach((link) => {
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (!sourceNode || !targetNode) return;

        let isFocused = true;
        let isDimmed = false;
        if (hoveredNodeId !== null) {
          isFocused = link.source === hoveredNodeId || link.target === hoveredNodeId;
          isDimmed = !isFocused;
        } else if (hoveredLinkKey !== null) {
          isFocused = link.key === hoveredLinkKey;
          isDimmed = !isFocused;
        }

        const pairKey =
          link.source < link.target
            ? `${link.source}-${link.target}`
            : `${link.target}-${link.source}`;
        const group = linkGroups.get(pairKey) || [];
        const indexInGroup = group.indexOf(link);
        const numInGroup = group.length;

        const isForward = link.source < link.target;
        const nodeA = isForward ? sourceNode : targetNode;
        const nodeB = isForward ? targetNode : sourceNode;

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.hypot(dx, dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = (nodeA.y + nodeB.y) / 2;

        const spacing = Math.min(54, Math.max(40, dist * 0.25));
        const curveOffset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * curveOffset;
        const controlY = midY + normalY * curveOffset;

        renderedCurves.push({
          linkKey: link.key,
          sourceId: link.source,
          targetId: link.target,
          amount: link.amount,
          x0: sourceNode.x,
          y0: sourceNode.y,
          cx: controlX,
          cy: controlY,
          x1: targetNode.x,
          y1: targetNode.y,
        });

        const thickness = Math.max(2, Math.min(6, link.amount / 500 + 2));

        const angle = Math.atan2(
          targetNode.y - controlY,
          targetNode.x - controlX
        );
        const arrowTipDist = 22;
        const arrowLength = 9;
        const arrowWidth = 6;
        const baseDist = arrowTipDist + arrowLength;

        const tanX = Math.cos(angle);
        const tanY = Math.sin(angle);
        const normX = -tanY;
        const normY = tanX;

        const tipX = targetNode.x - tanX * arrowTipDist;
        const tipY = targetNode.y - tanY * arrowTipDist;
        const baseCenterX = targetNode.x - tanX * baseDist;
        const baseCenterY = targetNode.y - tanY * baseDist;
        const corner1X = baseCenterX + normX * arrowWidth;
        const corner1Y = baseCenterY + normY * arrowWidth;
        const corner2X = baseCenterX - normX * arrowWidth;
        const corner2Y = baseCenterY - normY * arrowWidth;

        const strokeAlpha = isDimmed
          ? 0.12
          : isFocused
          ? link.settled
            ? 0.7
            : 0.95
          : link.settled
          ? 0.4
          : 0.75;

        // Edge stroke
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.quadraticCurveTo(controlX, controlY, baseCenterX, baseCenterY);
        ctx.strokeStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.lineWidth = isFocused && (hoveredNodeId !== null || hoveredLinkKey !== null) ? thickness + 1.5 : thickness;
        ctx.globalAlpha = strokeAlpha;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(corner1X, corner1Y);
        ctx.lineTo(corner2X, corner2Y);
        ctx.closePath();
        ctx.fillStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.globalAlpha = strokeAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Stagger edge label
        let tLabel = 0.5;
        if (numInGroup > 1) {
          tLabel = 0.32 + 0.36 * (indexInGroup / (numInGroup - 1));
        }

        const lx =
          (1 - tLabel) * (1 - tLabel) * sourceNode.x +
          2 * (1 - tLabel) * tLabel * controlX +
          tLabel * tLabel * targetNode.x;
        const ly =
          (1 - tLabel) * (1 - tLabel) * sourceNode.y +
          2 * (1 - tLabel) * tLabel * controlY +
          tLabel * tLabel * targetNode.y;

        const tx =
          2 * (1 - tLabel) * (controlX - sourceNode.x) +
          2 * tLabel * (targetNode.x - controlX);
        const ty =
          2 * (1 - tLabel) * (controlY - sourceNode.y) +
          2 * tLabel * (targetNode.y - controlY);
        const tLen = Math.hypot(tx, ty) || 1;
        const cnX = -ty / tLen;
        const cnY = tx / tLen;

        const labelShift = (curveOffset >= 0 ? 1 : -1) * 12;
        const labelX = lx + cnX * labelShift;
        const labelY = ly + cnY * labelShift;

        const edgeText =
          link.debtCount > 1
            ? `${fmt(link.amount)} (${link.debtCount} txs)`
            : fmt(link.amount);

        ctx.font = "600 9.5px 'IBM Plex Mono', monospace";
        const edgeTextWidth = ctx.measureText(edgeText).width;
        const edgePillW = edgeTextWidth + 12;
        const edgePillH = 18;

        labelRects.push({
          x: labelX,
          y: labelY,
          w: edgePillW,
          h: edgePillH,
          text: edgeText,
          settled: link.settled,
          linkKey: link.key,
        });
      });

      curvesRef.current = renderedCurves;

      // 2D label anti-collision relaxation
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < labelRects.length; i++) {
          for (let j = i + 1; j < labelRects.length; j++) {
            const r1 = labelRects[i];
            const r2 = labelRects[j];
            const dx = r2.x - r1.x;
            const dy = r2.y - r1.y;
            const minX = (r1.w + r2.w) / 2 + 4;
            const minY = (r1.h + r2.h) / 2 + 4;
            if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
              const overlapX = minX - Math.abs(dx);
              const overlapY = minY - Math.abs(dy);
              if (overlapX < overlapY) {
                const sx = dx >= 0 ? 1 : -1;
                r1.x -= (overlapX / 2) * sx;
                r2.x += (overlapX / 2) * sx;
              } else {
                const sy = dy >= 0 ? 1 : -1;
                r1.y -= (overlapY / 2) * sy;
                r2.y += (overlapY / 2) * sy;
              }
            }
          }
        }
      }

      // Draw edge label pills
      ctx.font = "600 9.5px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      labelRects.forEach((rect) => {
        const isLinkHovered = hoveredLinkKey === rect.linkKey;
        const isDimmed =
          (hoveredNodeId !== null || hoveredLinkKey !== null) && !isLinkHovered;

        const pillX = rect.x - rect.w / 2;
        const pillY = rect.y - rect.h / 2;

        ctx.globalAlpha = isDimmed ? 0.2 : 1;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(pillX, pillY, rect.w, rect.h, 3);
        } else {
          ctx.rect(pillX, pillY, rect.w, rect.h);
        }
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = rect.settled ? "#1f9e5c" : isLinkHovered ? themeInk : "#3b6fd6";
        ctx.lineWidth = isLinkHovered ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = rect.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.fillText(rect.text, rect.x, rect.y);
        ctx.globalAlpha = 1;
      });

      // Draw settlement particles
      particlesRef.current = particlesRef.current.filter((p) => {
        const link = links[p.linkIdx];
        if (!link) return false;
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (!sourceNode || !targetNode) return false;

        const pairKey =
          link.source < link.target
            ? `${link.source}-${link.target}`
            : `${link.target}-${link.source}`;
        const group = linkGroups.get(pairKey) || [];
        const indexInGroup = group.indexOf(link);
        const numInGroup = group.length;

        const isForward = link.source < link.target;
        const nodeA = isForward ? sourceNode : targetNode;
        const nodeB = isForward ? targetNode : sourceNode;

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.hypot(dx, dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = (nodeA.y + nodeB.y) / 2;

        const spacing = Math.min(54, Math.max(40, dist * 0.25));
        const offset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * offset;
        const controlY = midY + normalY * offset;

        p.progress += p.speed;
        if (p.progress > 1) return false;

        const t = p.progress;
        const x =
          (1 - t) * (1 - t) * sourceNode.x +
          2 * (1 - t) * t * controlX +
          t * t * targetNode.x;
        const y =
          (1 - t) * (1 - t) * sourceNode.y +
          2 * (1 - t) * t * controlY +
          t * t * targetNode.y;

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(31, 158, 92, 0.2)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#1f9e5c";
        ctx.fill();

        return true;
      });

      // Draw nodes
      nodes.forEach((node) => {
        const isDragged = draggedNodeRef.current?.id === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isConnected =
          hoveredNodeId !== null &&
          links.some(
            (l) =>
              (l.source === hoveredNodeId && l.target === node.id) ||
              (l.target === hoveredNodeId && l.source === node.id)
          );

        const isDimmed =
          (hoveredNodeId !== null || hoveredLinkKey !== null) &&
          !isHovered &&
          !isConnected;

        const nodeColor = node.color || themeInk;

        ctx.globalAlpha = isDimmed ? 0.2 : 1;

        // Glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, isDragged || isHovered ? 26 : 22, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = isDimmed ? 0.05 : isDragged || isHovered ? 0.35 : 0.15;
        ctx.fill();
        ctx.globalAlpha = isDimmed ? 0.2 : 1;

        // Node circle background
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = isDragged || isHovered ? 3.5 : 2.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Name badge pill box
        const text = node.name;
        ctx.font = "600 11px 'IBM Plex Mono', monospace";
        const textWidth = ctx.measureText(text).width;
        const pillW = textWidth + 16;
        const pillH = 20;
        const pillX = node.x - pillW / 2;
        const pillY = node.y + 24;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(pillX, pillY, pillW, pillH, 4);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = isDragged || isHovered ? nodeColor : themeBorder;
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke();

        // Name text inside pill
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = themeInk;
        ctx.fillText(text, node.x, pillY + pillH / 2);
        ctx.globalAlpha = 1;
      });

      // Draw hover tooltip directly on canvas for 60fps performance
      const tooltip = tooltipRef.current;
      if (tooltip) {
        ctx.save();
        ctx.font = "600 10px 'IBM Plex Mono', monospace";
        let maxTextW = ctx.measureText(tooltip.title).width;
        tooltip.items.forEach((item) => {
          const w = ctx.measureText(item).width;
          if (w > maxTextW) maxTextW = w;
        });

        const cardW = maxTextW + 20;
        const cardH = 22 + tooltip.items.length * 15;
        let cardX = tooltip.x;
        let cardY = tooltip.y;

        if (cardX + cardW > cw - 10) cardX = cw - cardW - 10;
        if (cardX < 10) cardX = 10;
        if (cardY + cardH > ch - 10) cardY = ch - cardH - 10;
        if (cardY < 10) cardY = 10;

        // Card background
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(cardX, cardY, cardW, cardH, 5);
        } else {
          ctx.rect(cardX, cardY, cardW, cardH);
        }
        ctx.fillStyle = themePanel;
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = themeInk;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Title
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = themeInk;
        ctx.font = "700 10.5px 'IBM Plex Mono', monospace";
        ctx.fillText(tooltip.title, cardX + 10, cardY + 7);

        // Divider line
        ctx.beginPath();
        ctx.moveTo(cardX + 8, cardY + 21);
        ctx.lineTo(cardX + cardW - 8, cardY + 21);
        ctx.strokeStyle = themeBorder;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Items
        ctx.font = "500 9.5px 'IBM Plex Mono', monospace";
        tooltip.items.forEach((item, idx) => {
          ctx.fillStyle = themeInk;
          ctx.fillText(item, cardX + 10, cardY + 26 + idx * 15);
        });

        ctx.restore();
      }

      // Schedule next tick if energy > min or active elements present
      if (document.visibilityState === "visible") {
        if (
          alphaRef.current > 0.005 ||
          draggedNodeRef.current !== null ||
          particlesRef.current.length > 0
        ) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          // Slow background tick to maintain responsive hover and dynamic updates
          animRef.current = window.setTimeout(() => {
            animRef.current = requestAnimationFrame(tick);
          }, 100) as unknown as number;
        }
      }
    };

    // Wake function to immediately schedule render tick
    wakeAnimationRef.current = () => {
      if (document.visibilityState !== "visible") return;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        clearTimeout(animRef.current);
        animRef.current = 0;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        wakeAnimationRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    wakeAnimationRef.current();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        clearTimeout(animRef.current);
        animRef.current = 0;
      }
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Distance from point (px, py) to quadratic Bezier curve
  const distToCurve = (
    px: number,
    py: number,
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number
  ) => {
    let minDist = Infinity;
    const samples = 20;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const d = Math.hypot(px - bx, py - by);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  // Pointer interaction handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitNode = nodesRef.current.find((n) => {
      return Math.hypot(n.x - x, n.y - y) <= 26;
    });

    if (hitNode) {
      draggedNodeRef.current = {
        id: hitNode.id,
        offsetX: hitNode.x - x,
        offsetY: hitNode.y - y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      alphaRef.current = 1.0;
      wakeAnimationRef.current();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedNodeRef.current) {
      const draggedNode = nodeByIdRef.current.get(draggedNodeRef.current.id);
      if (draggedNode) {
        draggedNode.x = x + draggedNodeRef.current.offsetX;
        draggedNode.y = y + draggedNodeRef.current.offsetY;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        alphaRef.current = 0.8;
        wakeAnimationRef.current();
      }
      return;
    }

    const fmt = formatCurrencyRef.current;

    // Node hover detection
    const hitNode = nodesRef.current.find((n) => {
      return Math.hypot(n.x - x, n.y - y) <= 26;
    });

    if (hitNode) {
      if (hoveredNodeIdRef.current !== hitNode.id) {
        hoveredNodeIdRef.current = hitNode.id;
        hoveredLinkKeyRef.current = null;
        canvas.style.cursor = "grab";

        const outgoing = linksRef.current.filter((l) => l.source === hitNode.id);
        const incoming = linksRef.current.filter((l) => l.target === hitNode.id);

        const totalOwed = outgoing.reduce((s, l) => s + l.amount, 0);
        const totalReceivable = incoming.reduce((s, l) => s + l.amount, 0);
        const netPos = totalReceivable - totalOwed;

        const items = [
          `Owes Out: ${fmt(totalOwed)}`,
          `Gets Back: ${fmt(totalReceivable)}`,
          `Net: ${
            netPos > 0
              ? `+${fmt(netPos)} (Creditor)`
              : netPos < 0
              ? `${fmt(netPos)} (Debtor)`
              : "Balanced (₹0.00)"
          }`,
        ];

        tooltipRef.current = {
          x: Math.min(rect.width - 210, Math.max(10, hitNode.x - 100)),
          y: Math.max(10, hitNode.y - 95),
          title: hitNode.name,
          items,
        };
        wakeAnimationRef.current();
      }
      return;
    }

    // Edge curve hover detection
    const hitCurve = curvesRef.current.find((c) => {
      const d = distToCurve(x, y, c.x0, c.y0, c.cx, c.cy, c.x1, c.y1);
      return d <= 12;
    });

    if (hitCurve) {
      if (hoveredLinkKeyRef.current !== hitCurve.linkKey) {
        hoveredLinkKeyRef.current = hitCurve.linkKey;
        hoveredNodeIdRef.current = null;
        canvas.style.cursor = "pointer";

        const sNode = nodeByIdRef.current.get(hitCurve.sourceId);
        const tNode = nodeByIdRef.current.get(hitCurve.targetId);

        const items = [
          `From: ${sNode?.name || "?"}`,
          `To: ${tNode?.name || "?"}`,
          `Net Obligation: ${fmt(hitCurve.amount)}`,
        ];

        tooltipRef.current = {
          x: Math.min(rect.width - 210, Math.max(10, x - 100)),
          y: Math.max(10, y - 75),
          title: `${sNode?.name || "?"} → ${tNode?.name || "?"}`,
          items,
        };
        wakeAnimationRef.current();
      }
      return;
    }

    // Clear hover state if changed
    if (
      hoveredNodeIdRef.current !== null ||
      hoveredLinkKeyRef.current !== null ||
      tooltipRef.current !== null
    ) {
      hoveredNodeIdRef.current = null;
      hoveredLinkKeyRef.current = null;
      tooltipRef.current = null;
      canvas.style.cursor = "default";
      wakeAnimationRef.current();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      draggedNodeRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "default";
      }
      wakeAnimationRef.current();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full touch-none select-none"
        style={{ display: "block" }}
      />
    </div>
  );
}
