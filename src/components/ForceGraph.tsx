"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Member, Debt } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface GraphNode {
  id: number;
  name: string;
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: number;
  target: number;
  amount: number;
  settled: boolean;
  debtId: number;
}

interface Props {
  members: Member[];
  debts: Debt[];
  recentlySettled: Set<number>;
}

export default function ForceGraph({ members, debts, recentlySettled }: Props) {
  const { formatCurrency } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const nodeByIdRef = useRef<Map<number, GraphNode>>(new Map());
  const linkGroupsRef = useRef<Map<string, GraphLink[]>>(new Map());
  const animRef = useRef<number>(0);
  const animationRunningRef = useRef(false);
  const particlesRef = useRef<
    { linkIdx: number; progress: number; speed: number }[]
  >([]);

  const buildGraph = useCallback(() => {
    const existingNodes = nodesRef.current;
    const existingNodeById = new Map(existingNodes.map((node) => [node.id, node]));
    const nodes: GraphNode[] = members.map((m) => {
      const existing = existingNodeById.get(m.id);
      return {
        id: m.id,
        name: m.name,
        color: m.color || "#3b6fd6",
        x: existing?.x,
        y: existing?.y,
        vx: existing?.vx || 0,
        vy: existing?.vy || 0,
      };
    });

    const links: GraphLink[] = debts.map((d) => ({
      source: d.debtorId,
      target: d.creditorId,
      amount: parseFloat(d.amount),
      settled: d.settled,
      debtId: d.id,
    }));

    nodesRef.current = nodes;
    linksRef.current = links;
    nodeByIdRef.current = new Map(nodes.map((node) => [node.id, node]));

    const linkGroups = new Map<string, GraphLink[]>();
    links.forEach((link) => {
      const key = link.source < link.target
        ? `${link.source}-${link.target}`
        : `${link.target}-${link.source}`;
      const group = linkGroups.get(key) || [];
      group.push(link);
      linkGroups.set(key, group);
    });
    linkGroupsRef.current = linkGroups;
  }, [members, debts]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  // Add settlement particles
  useEffect(() => {
    recentlySettled.forEach((debtId) => {
      const linkIdx = linksRef.current.findIndex((l) => l.debtId === debtId);
      if (linkIdx !== -1) {
        particlesRef.current.push({
          linkIdx,
          progress: 0,
          speed: 0.02,
        });
      }
    });
  }, [recentlySettled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * pixelRatio;
        canvas.height = rect.height * pixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }
    };
    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Initialize node positions
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / pixelRatio;
    const h = canvas.height / pixelRatio;
    const centerX = w / 2;
    const centerY = h / 2;

    nodesRef.current.forEach((node, i) => {
      if (node.x === undefined || node.y === undefined || (node.x <= 45 && node.y <= 45 && w > 100)) {
        if (nodesRef.current.length === 1) {
          node.x = centerX;
          node.y = centerY;
        } else {
          const angle = (2 * Math.PI * i) / nodesRef.current.length;
          const radius = Math.min(w, h) * 0.25;
          node.x = centerX + Math.cos(angle) * radius;
          node.y = centerY + Math.sin(angle) * radius;
        }
      }
    });

    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeById = nodeByIdRef.current;
      const linkGroups = linkGroupsRef.current;

      if (!ctx || !canvas) return;

      const cw = canvas.width / pixelRatio;
      const ch = canvas.height / pixelRatio;

      // Get active theme colors from CSS & data-theme attribute
      const themeAttr = document.documentElement.getAttribute("data-theme") || "default";
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
        themePanel = rootStyle.getPropertyValue("--color-panel").trim() || themePanel;
        themeBorder = rootStyle.getPropertyValue("--color-border").trim() || themeBorder;
      }

      // Re-center single or uninitialized nodes if canvas size settled
      if (nodes.length === 1 && nodes[0]) {
        nodes[0].x = cw / 2;
        nodes[0].y = ch / 2;
      }

      // Simple force simulation
      const alpha = 0.3;

      // Center force
      nodes.forEach((n) => {
        if (n.x !== undefined && n.y !== undefined) {
          n.vx = (n.vx || 0) + (cw / 2 - n.x) * 0.002 * alpha;
          n.vy = (n.vy || 0) + (ch / 2 - n.y) * 0.002 * alpha;
        }
      });

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (
            a.x === undefined ||
            a.y === undefined ||
            b.x === undefined ||
            b.y === undefined
          )
            continue;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = (800 / (dist * dist)) * alpha;
          const fx = (dx / dist) * repulse;
          const fy = (dy / dist) * repulse;
          a.vx = (a.vx || 0) - fx;
          a.vy = (a.vy || 0) - fy;
          b.vx = (b.vx || 0) + fx;
          b.vy = (b.vy || 0) + fy;
        }
      }

      // Spring force from links
      links.forEach((link) => {
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (
          !sourceNode ||
          !targetNode ||
          sourceNode.x === undefined ||
          sourceNode.y === undefined ||
          targetNode.x === undefined ||
          targetNode.y === undefined
        )
          return;

        let dx = targetNode.x - sourceNode.x;
        let dy = targetNode.y - sourceNode.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 120;
        const force = ((dist - targetDist) / dist) * 0.02 * alpha;
        const fx = dx * force;
        const fy = dy * force;
        sourceNode.vx = (sourceNode.vx || 0) + fx;
        sourceNode.vy = (sourceNode.vy || 0) + fy;
        targetNode.vx = (targetNode.vx || 0) - fx;
        targetNode.vy = (targetNode.vy || 0) - fy;
      });

      // Apply velocity
      nodes.forEach((n) => {
        if (n.x !== undefined && n.y !== undefined) {
          n.vx = (n.vx || 0) * 0.85;
          n.vy = (n.vy || 0) * 0.85;
          n.x += n.vx || 0;
          n.y += n.vy || 0;
          // Boundary
          n.x = Math.max(40, Math.min(cw - 40, n.x));
          n.y = Math.max(40, Math.min(ch - 40, n.y));
        }
      });

      // Draw
      ctx.clearRect(0, 0, cw, ch);

      // Grid lines
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


      // Draw edges
      links.forEach((link) => {
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (
          !sourceNode ||
          !targetNode ||
          sourceNode.x === undefined ||
          sourceNode.y === undefined ||
          targetNode.x === undefined ||
          targetNode.y === undefined
        )
          return;

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

        const dx = nodeB.x! - nodeA.x!;
        const dy = nodeB.y! - nodeA.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x! + nodeB.x!) / 2;
        const midY = (nodeA.y! + nodeB.y!) / 2;

        const spacing = 32; // Spacing in pixels between parallel lines
        const offset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * offset;
        const controlY = midY + normalY * offset;

        const thickness = Math.max(1, Math.min(6, link.amount / 5));

        // Calculate tangent angle at target node
        const angle = Math.atan2(
          targetNode.y! - controlY,
          targetNode.x! - controlX
        );
        const arrowTipDist = 23;
        const arrowLength = 8;
        const arrowWidth = 5;
        const baseDist = arrowTipDist + arrowLength;
        
        const tanX = Math.cos(angle);
        const tanY = Math.sin(angle);
        const normX = -tanY;
        const normY = tanX;

        const tipX = targetNode.x! - tanX * arrowTipDist;
        const tipY = targetNode.y! - tanY * arrowTipDist;
        const baseCenterX = targetNode.x! - tanX * baseDist;
        const baseCenterY = targetNode.y! - tanY * baseDist;
        const corner1X = baseCenterX + normX * arrowWidth;
        const corner1Y = baseCenterY + normY * arrowWidth;
        const corner2X = baseCenterX - normX * arrowWidth;
        const corner2Y = baseCenterY - normY * arrowWidth;

        // Draw edge line, terminating at base of arrow
        ctx.beginPath();
        ctx.moveTo(sourceNode.x!, sourceNode.y!);
        ctx.quadraticCurveTo(controlX, controlY, baseCenterX, baseCenterY);
        ctx.strokeStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.lineWidth = thickness;
        ctx.globalAlpha = link.settled ? 0.4 : 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Amount label on edge (midpoint of curve, offset perpendicular to the curve)
        const curveMidX = midX + normalX * (offset / 2);
        const curveMidY = midY + normalY * (offset / 2);

        // Offset the label away from the curve line to keep it clean and readable
        const labelShift = offset >= 0 ? 8 : -8;
        const labelX = curveMidX + normalX * labelShift;
        const labelY = curveMidY + normalY * labelShift;

        // Edge label pill box
        const edgeText = formatCurrency(link.amount);
        ctx.font = "600 9px 'IBM Plex Mono', monospace";
        const edgeTextWidth = ctx.measureText(edgeText).width;
        const edgePillW = edgeTextWidth + 10;
        const edgePillH = 16;
        ctx.beginPath();
        ctx.fillStyle = themePanel;
        ctx.strokeStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.lineWidth = 1;
        ctx.rect(labelX - edgePillW / 2, labelY - edgePillH / 2, edgePillW, edgePillH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(edgeText, labelX, labelY);

        // Arrow (sleek triangular arrowhead)
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(corner1X, corner1Y);
        ctx.lineTo(corner2X, corner2Y);
        ctx.closePath();
        ctx.fillStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.globalAlpha = link.settled ? 0.4 : 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw settlement particles
      particlesRef.current = particlesRef.current.filter((p) => {
        const link = links[p.linkIdx];
        if (!link) return false;
        const sourceNode = nodeById.get(link.source);
        const targetNode = nodeById.get(link.target);
        if (
          !sourceNode ||
          !targetNode ||
          sourceNode.x === undefined ||
          sourceNode.y === undefined ||
          targetNode.x === undefined ||
          targetNode.y === undefined
        )
          return false;

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

        const dx = nodeB.x! - nodeA.x!;
        const dy = nodeB.y! - nodeA.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x! + nodeB.x!) / 2;
        const midY = (nodeA.y! + nodeB.y!) / 2;

        const spacing = 32;
        const offset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * offset;
        const controlY = midY + normalY * offset;

        p.progress += p.speed;
        if (p.progress > 1) return false;

        // Interpolate along quadratic Bezier curve
        const t = p.progress;
        const x = (1 - t) * (1 - t) * sourceNode.x! + 2 * (1 - t) * t * controlX + t * t * targetNode.x!;
        const y = (1 - t) * (1 - t) * sourceNode.y! + 2 * (1 - t) * t * controlY + t * t * targetNode.y!;

        // Glow
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
        if (node.x === undefined || node.y === undefined) return;

        const nodeColor = node.color || themeInk;

        // Subtle outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Node circle background
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 2.5;
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
        ctx.strokeStyle = themeBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Name text inside pill
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = themeInk;
        ctx.fillText(text, node.x, pillY + pillH / 2);
      });



      if (animationRunningRef.current) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    const setAnimationState = (running: boolean) => {
      animationRunningRef.current = running;
      if (running && !animRef.current) {
        animRef.current = requestAnimationFrame(tick);
      }
      if (!running && animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = 0;
      }
    };

    const updateVisibility = (isIntersecting = true) => {
      setAnimationState(document.visibilityState === "visible" && isIntersecting);
    };
    const handleVisibilityChange = () => updateVisibility();
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => updateVisibility(entry.isIntersecting),
      { threshold: 0.01 }
    );
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateVisibility();

    return () => {
      animationRunningRef.current = false;
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
