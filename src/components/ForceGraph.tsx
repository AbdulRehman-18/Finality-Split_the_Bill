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

interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  settled: boolean;
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
  const alphaRef = useRef(1.0);
  const draggedNodeRef = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

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
      const key =
        link.source < link.target
          ? `${link.source}-${link.target}`
          : `${link.target}-${link.source}`;
      const group = linkGroups.get(key) || [];
      group.push(link);
      linkGroups.set(key, group);
    });
    linkGroupsRef.current = linkGroups;

    // Reset alpha simulation energy when graph structure changes
    alphaRef.current = 1.0;
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
      alphaRef.current = 1.0;
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Initialize node positions in a wider circle
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / pixelRatio;
    const h = canvas.height / pixelRatio;
    const centerX = w / 2;
    const centerY = h / 2;

    nodesRef.current.forEach((node, i) => {
      if (
        node.x === undefined ||
        node.y === undefined ||
        (node.x <= 45 && node.y <= 45 && w > 100)
      ) {
        if (nodesRef.current.length === 1) {
          node.x = centerX;
          node.y = centerY;
        } else {
          const angle = (2 * Math.PI * i) / nodesRef.current.length;
          const radius = Math.min(w, h) * 0.32;
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

      // Physics Energy calculation
      const isDragging = draggedNodeRef.current !== null;
      const alpha = Math.max(alphaRef.current, isDragging ? 0.4 : 0.05);

      if (!isDragging && alphaRef.current > 0.005) {
        alphaRef.current *= 0.985;
      }

      // 1. Center force
      nodes.forEach((n) => {
        if (
          n.x !== undefined &&
          n.y !== undefined &&
          draggedNodeRef.current?.id !== n.id
        ) {
          n.vx = (n.vx || 0) + (cw / 2 - n.x) * 0.0015 * alpha;
          n.vy = (n.vy || 0) + (ch / 2 - n.y) * 0.0015 * alpha;
        }
      });

      // 2. Strong Repulsion & Collision force
      const minNodeDist = 150;
      const kRepulsion = 45000;
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
      const targetDist = Math.max(200, Math.min(cw, ch) * 0.38);
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

      // 4. Apply velocity & screen boundaries
      nodes.forEach((n) => {
        if (draggedNodeRef.current?.id === n.id) return;
        if (n.x !== undefined && n.y !== undefined) {
          n.vx = (n.vx || 0) * 0.82;
          n.vy = (n.vy || 0) * 0.82;
          n.x += n.vx || 0;
          n.y += n.vy || 0;
          const pad = 50;
          n.x = Math.max(pad, Math.min(cw - pad, n.x));
          n.y = Math.max(pad, Math.min(ch - pad, n.y));
        }
      });

      // Clear Canvas
      ctx.clearRect(0, 0, cw, ch);

      // Grid background lines
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

      // Collection for edge label pills to run anti-collision
      const labelRects: LabelRect[] = [];

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
        const dist = Math.hypot(dx, dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x! + nodeB.x!) / 2;
        const midY = (nodeA.y! + nodeB.y!) / 2;

        // Curve spacing based on line distance
        const spacing = Math.min(54, Math.max(40, dist * 0.25));
        const curveOffset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * curveOffset;
        const controlY = midY + normalY * curveOffset;

        const thickness = Math.max(1.5, Math.min(5.5, link.amount / 500 + 1.5));

        // Arrow calculation at target node
        const angle = Math.atan2(
          targetNode.y! - controlY,
          targetNode.x! - controlX
        );
        const arrowTipDist = 22;
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

        // Draw edge stroke
        ctx.beginPath();
        ctx.moveTo(sourceNode.x!, sourceNode.y!);
        ctx.quadraticCurveTo(controlX, controlY, baseCenterX, baseCenterY);
        ctx.strokeStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.lineWidth = thickness;
        ctx.globalAlpha = link.settled ? 0.4 : 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(corner1X, corner1Y);
        ctx.lineTo(corner2X, corner2Y);
        ctx.closePath();
        ctx.fillStyle = link.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.globalAlpha = link.settled ? 0.4 : 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Stagger edge label position along curve (t ∈ [0.32, 0.68])
        let tLabel = 0.5;
        if (numInGroup > 1) {
          tLabel = 0.32 + 0.36 * (indexInGroup / (numInGroup - 1));
        }

        // Curve position at tLabel
        const lx =
          (1 - tLabel) * (1 - tLabel) * sourceNode.x! +
          2 * (1 - tLabel) * tLabel * controlX +
          tLabel * tLabel * targetNode.x!;
        const ly =
          (1 - tLabel) * (1 - tLabel) * sourceNode.y! +
          2 * (1 - tLabel) * tLabel * controlY +
          tLabel * tLabel * targetNode.y!;

        // Curve tangent & normal vector at tLabel
        const tx =
          2 * (1 - tLabel) * (controlX - sourceNode.x!) +
          2 * tLabel * (targetNode.x! - controlX);
        const ty =
          2 * (1 - tLabel) * (controlY - sourceNode.y!) +
          2 * tLabel * (targetNode.y! - controlY);
        const tLen = Math.hypot(tx, ty) || 1;
        const cnX = -ty / tLen;
        const cnY = tx / tLen;

        // Shift label perpendicular to curve tangent
        const labelShift = (curveOffset >= 0 ? 1 : -1) * 12;
        const labelX = lx + cnX * labelShift;
        const labelY = ly + cnY * labelShift;

        // Measure text width
        const edgeText = formatCurrency(link.amount);
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
        });
      });

      // 2D anti-collision relaxation pass for edge labels
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

      // Draw edge label pill boxes
      ctx.font = "600 9.5px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      labelRects.forEach((rect) => {
        const pillX = rect.x - rect.w / 2;
        const pillY = rect.y - rect.h / 2;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(pillX, pillY, rect.w, rect.h, 3);
        } else {
          ctx.rect(pillX, pillY, rect.w, rect.h);
        }
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = rect.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = rect.settled ? "#1f9e5c" : "#3b6fd6";
        ctx.fillText(rect.text, rect.x, rect.y);
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
        const dist = Math.hypot(dx, dy) || 1;
        const normalX = -dy / dist;
        const normalY = dx / dist;

        const midX = (nodeA.x! + nodeB.x!) / 2;
        const midY = (nodeA.y! + nodeB.y!) / 2;

        const spacing = Math.min(54, Math.max(40, dist * 0.25));
        const offset = (indexInGroup - (numInGroup - 1) / 2) * spacing;

        const controlX = midX + normalX * offset;
        const controlY = midY + normalY * offset;

        p.progress += p.speed;
        if (p.progress > 1) return false;

        const t = p.progress;
        const x =
          (1 - t) * (1 - t) * sourceNode.x! +
          2 * (1 - t) * t * controlX +
          t * t * targetNode.x!;
        const y =
          (1 - t) * (1 - t) * sourceNode.y! +
          2 * (1 - t) * t * controlY +
          t * t * targetNode.y!;

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

        const isDragged = draggedNodeRef.current?.id === node.id;
        const nodeColor = node.color || themeInk;

        // Subtle outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, isDragged ? 26 : 22, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = isDragged ? 0.3 : 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Node circle background
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = themePanel;
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = isDragged ? 3.5 : 2.5;
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
        ctx.strokeStyle = isDragged ? nodeColor : themeBorder;
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
      setAnimationState(
        document.visibilityState === "visible" && isIntersecting
      );
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

  // Pointer Interaction Handlers for Node Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitNode = nodesRef.current.find((n) => {
      if (n.x === undefined || n.y === undefined) return false;
      return Math.hypot(n.x - x, n.y - y) <= 26;
    });

    if (hitNode && hitNode.x !== undefined && hitNode.y !== undefined) {
      draggedNodeRef.current = {
        id: hitNode.id,
        offsetX: hitNode.x - x,
        offsetY: hitNode.y - y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      alphaRef.current = 1.0;
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
      }
    } else {
      const hovering = nodesRef.current.some((n) => {
        if (n.x === undefined || n.y === undefined) return false;
        return Math.hypot(n.x - x, n.y - y) <= 26;
      });
      canvas.style.cursor = hovering ? "grab" : "default";
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }
      draggedNodeRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "default";
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="w-full h-full touch-none select-none"
      style={{ display: "block" }}
    />
  );
}
