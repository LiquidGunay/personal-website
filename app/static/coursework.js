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

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const explicitTheme = document.documentElement.dataset.theme;
  const darkMode = explicitTheme === 'dark' || (!explicitTheme && prefersDark);
  const surfaceColour = darkMode ? '#1f2937' : '#f8fafc';
  const borderColour = darkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(15, 23, 42, 0.18)';

  fetch('/static/courses.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data) => init(data))
    .catch((err) => {
      console.error('Failed to load coursework data', err);
      mount.textContent = 'Failed to load visualization.';
    });

  function init(data) {
    const courseMap = buildCourseMap(data.hierarchy);
    const radialEl = mount.querySelector('[data-viz="radial"]');
    const tooltip = createTooltip(radialEl || mount);

    if (radialEl) {
      let lastWidth = 0;
      const measureWidth = () =>
        Math.round(radialEl.getBoundingClientRect().width || radialEl.clientWidth || 0);
      const render = () => {
        const width = measureWidth();
        if (!width) return;
        renderRadialTree(radialEl, data.hierarchy, courseMap, tooltip, width);
        lastWidth = width;
      };
      render();

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          const width = measureWidth();
          if (!width || Math.abs(width - lastWidth) < 8) return;
          window.requestAnimationFrame(() => render());
        });
        observer.observe(radialEl);
      } else {
        window.addEventListener(
          'resize',
          debounce(() => {
            const width = measureWidth();
            if (!width || Math.abs(width - lastWidth) < 8) return;
            render();
          }, 200),
        );
      }
    }

    const fallbackEl = document.getElementById('cw-fallback');
    if (fallbackEl) fallbackEl.innerHTML = buildFallbackList(data.hierarchy);
  }

  function debounce(fn, wait) {
    let t;
    return () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(), wait);
    };
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
    const container = tip.parentElement;
    if (!container) return;
    const sourceEvent = event.touches && event.touches[0] ? event.touches[0] : event;
    const [x, y] = d3.pointer(sourceEvent, container);
    tip.innerHTML = html;
    tip.style.left = `${x + 16}px`;
    tip.style.top = `${y + 12}px`;
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

  function viewFor(node, diameter, rotationAngle = 0) {
    if (!node) return [0, 0, diameter];
    const descendants = node.descendants();
    if (!descendants.length) return [0, 0, diameter];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxR = 0;
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);
    for (const d of descendants) {
      const rx = d.px * cosR - d.py * sinR;
      const ry = d.px * sinR + d.py * cosR;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
      maxR = Math.max(maxR, nodeRadius(d));
    }
    const span = Math.max(maxX - minX, maxY - minY) + maxR * 4;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const minSpan = diameter * 0.75;
    return [0, 0, Math.max(span, minSpan)];
  }

  function renderRadialTree(container, hierarchyData, courseMap, tooltip, measuredWidth) {
    container.innerHTML = '';
    hideTooltip(tooltip);

    const baseSize = computeBaseSize(container, measuredWidth);

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
      .attr('width', diameter)
      .attr('height', diameter)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Radial coursework map with zoomable clusters');

    const g = svg.append('g');

    let rotation = 0;
    const tau = Math.PI * 2;

    const linkPath = d3
      .linkRadial()
      .angle((d) => rawAngle(d))
      .radius((d) => d.y);

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('stroke', (d) => blendWithSurface(colourFor(topCategory(d.target)), 0.45))
      .attr('d', linkPath);

    const nodes = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => translateToNode(d));

    nodes
      .append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => {
        if (d.depth === 0) return blendWithSurface('#64748b', 0.4);
        const cat = topCategory(d);
        const base = colourFor(cat);
        const t = d.children ? (d.depth === 1 ? 0.52 : 0.7) : 0.88;
        return blendWithSurface(base, t);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.95 : 1))
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'))
      .attr('stroke', borderColour)
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

    const labels = nodes
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', '0.32em')
      .attr('x', (d) => labelPosition(d))
      .attr('y', (d) => labelBaselineShift(d))
      .attr('text-anchor', (d) => (isRightSide(d) ? 'start' : 'end'))
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

    applyRotation();
    zoomTo(view);
    updateHighlight();

    function zoom(target, event) {
      focus = target;
      const targetRotation = rotationFor(target);
      const next = target === root ? [0, 0, diameter] : viewFor(target, diameter, targetRotation);
      const transition = svg
        .transition()
        .duration(event?.altKey ? 1000 : 750)
        .tween('zoom', () => {
          const i = d3.interpolateZoom(view, next);
          return (t) => zoomTo(i(t));
        })
        .tween('rotate', () => {
          const r = d3.interpolateNumber(rotation, targetRotation);
          return (t) => setRotation(r(t));
        });

      transition.on('end', updateHighlight);
    }

    function zoomTo(v) {
      const k = diameter / v[2];
      view = [0, 0, v[2]];
      g.attr('transform', `scale(${k})`);
    }

    function updateHighlight() {
      const active = new Set(focus.descendants().concat(focus.ancestors ? focus.ancestors() : []));
      nodes.classed('dimmed', (d) => !active.has(d));
      link.classed('dimmed', (d) => !active.has(d.source) && !active.has(d.target));
      updateLabelVisibility(active);
    }

    function setRotation(value) {
      rotation = wrapAngle(value);
      applyRotation();
    }

    function applyRotation() {
      nodes.attr('transform', (d) => translateToNode(d));
      link.attr('d', linkPath);
      labels
        .attr('x', (d) => labelPosition(d))
        .attr('y', (d) => labelBaselineShift(d))
        .attr('text-anchor', (d) => (isRightSide(d) ? 'start' : 'end'))
        .attr('transform', null);
    }

    function rawAngle(d) {
      return d.x + rotation;
    }

    function normalizedAngle(d) {
      let angle = rawAngle(d) % tau;
      if (angle < 0) angle += tau;
      return angle;
    }

    function translateToNode(d) {
      const angle = rawAngle(d) - Math.PI / 2;
      const r = d.y;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      return `translate(${x},${y})`;
    }

    function isRightSide(d) {
      return Math.cos(rawAngle(d)) >= 0;
    }

    function labelPosition(d) {
      const base = nodeRadius(d) + (d.depth === 0 ? 28 : d.depth === 1 ? 20 : 18);
      return isRightSide(d) ? base : -base;
    }

    function labelBaselineShift(d) {
      return 0;
    }

    function updateLabelVisibility(activeSet) {
      labels.each(function (d) {
        const label = d3.select(this);
        const visible = d.depth <= 1 || activeSet.has(d) || (d.parent && activeSet.has(d.parent));
        label
          .classed('label-hidden', !visible)
          .style('opacity', visible ? 1 : 0)
          .style('pointer-events', visible ? 'auto' : 'none');
      });
    }

    function rotationFor(node) {
      if (!node || node === root) {
        return wrapAngle(0);
      }
      const currentAngle = normalizedAngle(node);
      const leftBoundary = Math.PI / 2;
      const rightBoundary = (3 * Math.PI) / 2;
      const targetAngle = currentAngle > leftBoundary && currentAngle < rightBoundary ? Math.PI : 0;
      const delta = smallestAngleDifference(targetAngle, currentAngle);
      return wrapAngle(rotation + delta);
    }

    function wrapAngle(value) {
      return ((value + Math.PI) % tau + tau) % tau - Math.PI;
    }

    function smallestAngleDifference(target, current) {
      return wrapAngle(target - current);
    }
    return baseSize;
  }

  function computeBaseSize(container, measuredWidth = 0) {
    const rect = container.getBoundingClientRect();
    const measured = Math.max(
      measuredWidth,
      rect.width || 0,
      container.clientWidth || 0,
      mount.clientWidth || 0,
    );
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight || 0 : 0;

    const fallbackWidth = viewportWidth
      ? Math.max(Math.min(viewportWidth - 96, 1100), 320)
      : 960;

    let candidate = Math.max(measured, fallbackWidth);

    if (viewportHeight) {
      const heightCap = Math.max(Math.min(viewportHeight - 280, 760), 420);
      candidate = Math.min(candidate, heightCap);
    }

    const upperBound = 1150;
    const lowerBound = viewportWidth < 640 ? 320 : 480;
    return Math.max(Math.min(candidate, upperBound), lowerBound);
  }

  function blendWithSurface(color, weight) {
    return d3.interpolateLab(surfaceColour, color)(weight);
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
