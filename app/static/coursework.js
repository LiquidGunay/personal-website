// Coursework radial tree visualisation powered by D3
(function () {
  const mount = document.getElementById('cw-viz');
  if (!mount || typeof d3 === 'undefined') return;

  const palette = new Map([
    ['Physics', '#2563eb'],
    ['Electronics', '#f97316'],
    ['Mathematics', '#16a34a'],
    ['Computer Science', '#8b5cf6'],
    ['Economics', '#b45309'],
    ['Other', '#64748b'],
  ]);

  const style = document.createElement('style');
  style.textContent = `
    .cw { max-width: min(1300px, 95vw); margin: clamp(2rem, 5vw, 4.5rem) auto; display: flex; flex-direction: column; gap: clamp(1.5rem, 3vw, 2.5rem); }
    .cw figure { background: var(--tile); border-radius: 1.2rem; padding: clamp(1.2rem, 2vw, 2rem); box-shadow: 0 22px 48px color-mix(in oklab, var(--fg) 10%, transparent); display: flex; flex-direction: column; gap: 1rem; }
    .cw figure h2 { margin: 0; font-size: clamp(1.25rem, 1.2vw + 1rem, 1.6rem); }
    .cw figure p { margin: 0; font-size: clamp(0.95rem, 0.4vw + 0.85rem, 1.05rem); color: color-mix(in oklab, var(--fg) 85%, var(--bg) 15%); }
    .cw .viz-canvas { position: relative; width: 100%; min-height: clamp(520px, 68vh, 880px); }
    .cw .viz-canvas svg { width: 100%; height: 100%; display: block; }
    .cw .viz-canvas svg text { font-family: var(--font-sans); fill: currentColor; }
    .cw .viz-canvas svg .node-label { font-size: clamp(0.66rem, 0.25vw + 0.58rem, 0.85rem); letter-spacing: 0.01em; }
    .cw .viz-canvas svg .link { fill: none; stroke: color-mix(in oklab, var(--fg) 22%, transparent); stroke-width: 1.2; }
    .cw .viz-canvas svg .node circle { stroke: color-mix(in oklab, var(--bg) 35%, transparent); stroke-width: 1.2; }
    .cw .viz-canvas svg .node.dimmed { opacity: 0.15; }
    .cw .viz-canvas svg .link.dimmed { opacity: 0.08; }
    .cw-tooltip { position: absolute; pointer-events: none; background: color-mix(in oklab, var(--bg) 86%, #000 14%); color: var(--fg); border: 1px solid color-mix(in oklab, var(--border) 60%, transparent); padding: .55rem .7rem; border-radius: .6rem; font-size: .85rem; max-width: 20rem; box-shadow: 0 16px 40px color-mix(in oklab, var(--fg) 8%, transparent); display: none; z-index: 5; line-height: 1.4; }
  `;
  document.head.appendChild(style);

  fetch('/static/courses.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data) => init(data))
    .catch((err) => {
      console.error('Failed to load coursework data', err);
      mount.textContent = 'Failed to load visualization.';
    });

  function init(data) {
    const courseMap = buildCourseMap(data.hierarchy);
    const tooltip = createTooltip(mount);

    const radialEl = mount.querySelector('[data-viz="radial"]');
    if (radialEl) renderRadialTree(radialEl, data.hierarchy, courseMap, tooltip);

    const fallbackEl = document.getElementById('cw-fallback');
    if (fallbackEl) fallbackEl.innerHTML = buildFallbackList(data.hierarchy);
  }

  function buildCourseMap(tree) {
    const root = d3.hierarchy(structuredCloneSafe(tree));
    const map = new Map();
    root.each((node) => {
      if (!node.children) {
        const top = node.ancestors().find((a) => a.depth === 1);
        const category = top ? top.data.name : 'Other';
        const id = node.data.id || node.data.code || node.data.name;
        const code = node.data.code || null;
        const name = node.data.name;
        const full = code ? `${code} · ${name}` : name;
        map.set(id, { id, code, name, full, category });
      }
    });
    return map;
  }

  function structuredCloneSafe(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function createTooltip(parent) {
    const tip = document.createElement('div');
    tip.className = 'cw-tooltip';
    parent.appendChild(tip);
    return tip;
  }

  function showTooltip(tip, event, html) {
    const [x, y] = d3.pointer(event, event.currentTarget.closest('.viz-canvas'));
    tip.innerHTML = html;
    tip.style.left = `${x + 18}px`;
    tip.style.top = `${y + 18}px`;
    tip.style.display = 'block';
  }

  function hideTooltip(tip) {
    tip.style.display = 'none';
  }

  function colourFor(category) {
    return palette.get(category) || '#475569';
  }

  function formatCourse(meta) {
    if (!meta) return '';
    return meta.full;
  }

  function topCategory(node) {
    if (node.depth === 0) return 'Other';
    const top = node.ancestors().find((a) => a.depth === 1);
    return top ? top.data.name : 'Other';
  }

  function nodeRadius(node) {
    if (!node.children) return 5.5;
    if (node.depth === 1) return 14;
    return 7 + Math.sqrt(node.leaves().length);
  }

  function viewFor(node, diameter) {
    if (!node) return [0, 0, diameter];
    const descendants = node.descendants();
    if (!descendants.length) return [0, 0, diameter];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxR = 0;
    for (const d of descendants) {
      minX = Math.min(minX, d.px);
      maxX = Math.max(maxX, d.px);
      minY = Math.min(minY, d.py);
      maxY = Math.max(maxY, d.py);
      maxR = Math.max(maxR, nodeRadius(d));
    }
    const span = Math.max(maxX - minX, maxY - minY) + maxR * 4;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return [cx, cy, Math.max(span, diameter / 3)];
  }

  function renderRadialTree(container, hierarchyData, courseMap, tooltip) {
    container.innerHTML = '';

    const bounds = container.getBoundingClientRect();
    const baseSize = Math.max(bounds.width, container.clientWidth, 880);
    const margin = 90;
    const outerRadius = baseSize / 2;
    const innerRadius = outerRadius - margin;
    const diameter = outerRadius * 2;

    const root = d3
      .hierarchy(structuredCloneSafe(hierarchyData))
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const cluster = d3.cluster().size([2 * Math.PI, innerRadius]);
    cluster(root);

    root.each((node) => {
      const angle = node.x - Math.PI / 2;
      node.px = Math.cos(angle) * node.y;
      node.py = Math.sin(angle) * node.y;
    });

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${-outerRadius} ${-outerRadius} ${diameter} ${diameter}`)
      .attr('role', 'img')
      .attr('aria-label', 'Radial coursework map with zoomable clusters');

    const g = svg.append('g');

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr(
        'stroke',
        (d) => `color-mix(in oklab, ${colourFor(topCategory(d.target))} 35%, var(--bg) 65%)`
      )
      .attr(
        'd',
        d3
          .linkRadial()
          .angle((d) => d.x)
          .radius((d) => d.y)
      );

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => {
        if (d.depth === 0) return colourFor('Other');
        const cat = topCategory(d);
        const base = colourFor(cat);
        const t = d.children ? (d.depth === 1 ? 0.52 : 0.7) : 0.88;
        return d3.interpolateLab('#f8fafc', base)(t);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.95 : 1))
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'))
      .on('click', (event, d) => {
        event.stopPropagation();
        if (focus === d) return;
        zoom(d, event);
      })
      .on('mouseenter', (event, d) => {
        const meta = !d.children ? courseMap.get(d.data.id || d.data.code || d.data.name) : null;
        const label = d.children
          ? `${d.data.name} · ${d.leaves().length} course${d.leaves().length === 1 ? '' : 's'}`
          : formatCourse(meta);
        showTooltip(tooltip, event, label);
      })
      .on('mousemove', (event, d) => {
        const meta = !d.children ? courseMap.get(d.data.id || d.data.code || d.data.name) : null;
        const label = d.children
          ? `${d.data.name} · ${d.leaves().length} course${d.leaves().length === 1 ? '' : 's'}`
          : formatCourse(meta);
        showTooltip(tooltip, event, label);
      })
      .on('mouseleave', () => hideTooltip(tooltip));

    node
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', '0.32em')
      .attr('x', (d) => {
        const offset = nodeRadius(d) + 8;
        return d.x < Math.PI ? offset : -offset;
      })
      .attr('text-anchor', (d) => (d.x < Math.PI ? 'start' : 'end'))
      .attr('transform', (d) => (d.x >= Math.PI ? 'rotate(180)' : null))
      .text((d) => {
        if (d.depth === 0) return 'Coursework';
        if (d.depth === 1) return d.data.name;
        if (!d.children) {
          const meta = courseMap.get(d.data.id || d.data.code || d.data.name);
          return meta?.code || d.data.name;
        }
        return d.data.name;
      });

    let focus = root;
    let view = [0, 0, diameter];

    svg.on('click', () => {
      if (focus !== root) zoom(root);
    });

    zoomTo(view);
    updateHighlight();

    function zoom(target, event) {
      focus = target;
      const next = target === root ? [0, 0, diameter] : viewFor(target, diameter);
      const transition = svg
        .transition()
        .duration(event?.altKey ? 1000 : 750)
        .tween('zoom', () => {
          const i = d3.interpolateZoom(view, next);
          return (t) => zoomTo(i(t));
        });

      transition.on('end', updateHighlight);
    }

    function zoomTo(v) {
      const k = diameter / v[2];
      view = v;
      g.attr('transform', `translate(${-v[0] * k},${-v[1] * k}) scale(${k})`);
    }

    function updateHighlight() {
      const active = new Set(focus.descendants().concat(focus.ancestors ? focus.ancestors() : []));
      node.classed('dimmed', (d) => !active.has(d));
      link.classed('dimmed', (d) => !active.has(d.source) && !active.has(d.target));
    }
  }

  function buildFallbackList(tree) {
    const lines = [];
    const root = d3.hierarchy(structuredCloneSafe(tree));
    for (const category of root.children || []) {
      lines.push(`<h3>${category.data.name}</h3>`);
      for (const group of category.children || []) {
        lines.push(`<h4>${group.data.name}</h4>`);
        lines.push('<ul>');
        for (const leaf of group.leaves()) {
          const code = leaf.data.code ? `${leaf.data.code} · ` : '';
          lines.push(`<li>${code}${leaf.data.name}</li>`);
        }
        lines.push('</ul>');
      }
    }
    return lines.join('');
  }
})();
