"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Member, Debt } from "@/lib/types";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<
    { linkIdx: number; progress: number; speed: number }[]
  >([]);

  const buildGraph = useCallback(() => {
    const existingNodes = nodesRef.current;
    const nodes: GraphNode[] = members.map((m) => {
      const existing = existingNodes.find((n) => n.id === m.id);
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
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const centerX = w / 2;
    const centerY = h / 2;

    nodesRef.current.forEach((node, i) => {
      if (node.x === undefined) {
        const angle = (2 * Math.PI * i) / nodesRef.current.length;
        const radius = Math.min(w, h) * 0.25;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
      }
    });

    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      if (!ctx || !canvas) return;

      const cw = canvas.width / window.devicePixelRatio;
      const ch = canvas.height / window.devicePixelRatio;

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
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
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
      ctx.strokeStyle = "#e8e2d0";
      ctx.lineWidth = 0.5;
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

      // Group links by node pairs to handle parallel edges
      const linkGroups = new Map<string, GraphLink[]>();
      links.forEach((link) => {
        const pairKey =
          link.source < link.target
            ? `${link.source}-${link.target}`
            : `${link.target}-${link.source}`;
        const group = linkGroups.get(pairKey) || [];
        group.push(link);
        linkGroups.set(pairKey, group);
      });

      // Draw edges
      links.forEach((link) => {
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
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

        ctx.beginPath();
        ctx.moveTo(sourceNode.x!, sourceNode.y!);
        ctx.quadraticCurveTo(controlX, controlY, targetNode.x!, targetNode.y!);
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

        ctx.font = "600 9px 'IBM Plex Mono', monospace";
        ctx.fillStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.textAlign = "center";
        ctx.fillText(`$${link.amount.toFixed(2)}`, labelX, labelY);

        // Arrow
        const angle = Math.atan2(
          targetNode.y! - controlY,
          targetNode.x! - controlX
        );
        const arrowX = targetNode.x! - Math.cos(angle) * 24;
        const arrowY = targetNode.y! - Math.sin(angle) * 24;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - Math.cos(angle - 0.4) * 8,
          arrowY - Math.sin(angle - 0.4) * 8
        );
        ctx.lineTo(
          arrowX - Math.cos(angle + 0.4) * 8,
          arrowY - Math.sin(angle + 0.4) * 8
        );
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
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
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

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Name label
        ctx.font = "600 10px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#1c1c1c";
        ctx.fillText(node.name, node.x, node.y + 30);
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
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
