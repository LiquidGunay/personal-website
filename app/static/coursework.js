// Coursework sunburst visualisation powered by D3
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
  const surfaceColour = darkMode ? '#0f172a' : '#f8fafc';

  fetch('/static/courses.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data) => init(data))
    .catch((err) => {
      console.error('Failed to load coursework data', err);
      mount.textContent = 'Failed to load visualization.';
    });

  function init(data) {
    const stageMap = buildStageMap(data.stages || []);
    const courseMap = buildCourseMap(data.hierarchy, stageMap);
    const sunburstEl = mount.querySelector('[data-viz="radial"]');
    const tooltip = createTooltip(sunburstEl || mount);

    if (sunburstEl) {
      let lastWidth = 0;
      const measureWidth = () => Math.round(sunburstEl.getBoundingClientRect().width || sunburstEl.clientWidth || 0);
      const render = () => {
        const width = measureWidth();
        if (!width) return;
        renderSunburst(sunburstEl, data.hierarchy, courseMap, tooltip, width);
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
        observer.observe(sunburstEl);
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

  function buildCourseMap(tree, stageMap) {
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
        const stages = stageMap.get(id) || stageMap.get(code) || [];
        map.set(id, { id, code, name, full, category, stages });
      }
    });
    return map;
  }

  function buildStageMap(stages) {
    const map = new Map();
    for (const stage of stages) {
      const entry = {
        name: stage.name,
        description: stage.description,
      };
      for (const course of stage.courses || []) {
        if (!map.has(course)) map.set(course, []);
        map.get(course).push(entry);
      }
    }
    return map;
  }

  function structuredCloneSafe(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function createTooltip(parent) {
    const tip = document.createElement('div');
    tip.className = 'cw-tooltip';
    tip.setAttribute('role', 'status');
    parent.appendChild(tip);
    return tip;
  }

  function showTooltip(tip, anchorRect, html, align = 'right') {
    const container = tip.parentElement;
    if (!container) return;
    tip.innerHTML = html;
    tip.dataset.visible = 'true';
    tip.style.display = 'block';
    tip.style.visibility = 'hidden';
    window.requestAnimationFrame(() => {
      if (tip.dataset.visible !== 'true') return;
      const containerRect = container.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const gap = 14;
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const baseTop = anchorRect.top + anchorRect.height / 2 - containerRect.top - tipRect.height / 2;
      let top = clamp(baseTop, 8, containerRect.height - tipRect.height - 8);
      let left;
      if (align === 'left') {
        left = anchorRect.left - containerRect.left - tipRect.width - gap;
      } else {
        left = anchorRect.right - containerRect.left + gap;
      }
      left = clamp(left, 8, containerRect.width - tipRect.width - 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      tip.style.visibility = 'visible';
    });
  }

  function hideTooltip(tip) {
    tip.removeAttribute('data-visible');
    tip.style.visibility = 'hidden';
    tip.style.display = 'none';
  }

  function colourFor(category) {
    return palette.get(category) || '#475569';
  }

  function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCourseTooltip(meta) {
    if (!meta) return '';
    const title = escapeHtml(meta.code ? `${meta.code} · ${meta.name}` : meta.name);
    const parts = [`<div class="cw-tip-title">${title}</div>`];
    const metaChips = [];
    if (meta.code) metaChips.push(`<span>${escapeHtml(meta.code)}</span>`);
    metaChips.push(`<span>${escapeHtml(meta.category)}</span>`);
    parts.push(`<div class="cw-tip-meta">${metaChips.join('')}</div>`);
    if (meta.stages && meta.stages.length) {
      const limited = meta.stages.slice(0, 2);
      parts.push('<ul class="cw-tip-stages">');
      for (const stage of limited) {
        parts.push(
          `<li><strong>${escapeHtml(stage.name)}</strong>${
            stage.description ? `<span>${escapeHtml(stage.description)}</span>` : ''
          }</li>`,
        );
      }
      if (meta.stages.length > limited.length) {
        const remaining = meta.stages.length - limited.length;
        parts.push(
          `<li><span>${escapeHtml(
            `${remaining} more stage${remaining === 1 ? '' : 's'} in plan`,
          )}</span></li>`,
        );
      }
      parts.push('</ul>');
    } else {
      parts.push('<p class="cw-tip-empty">Independent elective without a stage grouping.</p>');
    }
    return parts.join('');
  }

  function topCategory(node) {
    if (node.depth === 0) return 'Other';
    const top = node.ancestors().find((a) => a.depth === 1);
    return top ? top.data.name : 'Other';
  }

  function renderSunburst(container, hierarchyData, courseMap, tooltip, measuredWidth) {
    container.innerHTML = '';
    hideTooltip(tooltip);

    const baseSize = computeBaseSize(container, measuredWidth);
    const radius = baseSize / 2;
    const radialPadding = 36;
    const arcRadius = radius - radialPadding;

    const root = d3
      .hierarchy(structuredCloneSafe(hierarchyData))
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.partition().size([2 * Math.PI, root.height + 1])(root);

    root.each((node) => {
      node.current = {
        x0: node.x0,
        x1: node.x1,
        y0: node.y0,
        y1: node.y1,
      };
    });

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${-radius} ${-radius} ${baseSize} ${baseSize}`)
      .attr('width', baseSize)
      .attr('height', baseSize)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Zoomable coursework sunburst');

    const g = svg.append('g');
    const radiusStep = arcRadius / (root.height + 1);
    const maxVisibleDepth = Math.min(root.height, 4);

    const arcVisible = (d) => d.y1 <= maxVisibleDepth + 1 && d.y0 >= 0 && d.x1 > d.x0;

    const labelVisible = (d) => {
      if (!arcVisible(d)) return false;
      const angleSpan = d.x1 - d.x0;
      const radialSpan = d.y1 - d.y0;
      const footprint = angleSpan * radialSpan;
      if (d.depth === 1) return footprint > 0.02;
      if (d.depth === 2) return footprint > 0.03;
      return footprint > 0.055;
    };

    const labelTransform = (d) => {
      const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
      const radius = ((d.y0 + d.y1) / 2) * radiusStep;
      const rotate = angle - 90;
      const flip = angle >= 180 ? 180 : 0;
      return `rotate(${rotate}) translate(${radius},0) rotate(${flip})`;
    };

    const labelText = (d) => {
      if (d.depth === 1) return d.data.name;
      if (!d.children) {
        const meta = courseMap.get(d.data.id || d.data.code || d.data.name);
        return meta?.code || d.data.name;
      }
      return d.data.name;
    };

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
      .padRadius(arcRadius * 1.4)
      .innerRadius((d) => Math.max(0, d.y0 * radiusStep))
      .outerRadius((d) => Math.max(0, d.y1 * radiusStep - 2));

    const defs = svg.append('defs');
    const glow = defs
      .append('filter')
      .attr('id', 'cw-glow')
      .attr('x', '-150%')
      .attr('y', '-150%')
      .attr('width', '300%')
      .attr('height', '300%');
    glow.append('feGaussianBlur').attr('stdDeviation', 8).attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const path = g
      .append('g')
      .attr('class', 'cw-arcs')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('class', (d) => `cw-arc depth-${d.depth} ${d.children ? 'branch' : 'leaf'}`)
      .attr('fill', (d) => {
        const cat = topCategory(d);
        const base = colourFor(cat);
        const t = d.children ? (d.depth === 1 ? 0.55 : 0.7) : 0.85;
        return blendWithSurface(base, t);
      })
      .attr('fill-opacity', (d) => (arcVisible(d.current) ? (d.children ? 0.95 : 1) : 0))
      .attr('stroke', (d) => blendWithSurface(colourFor(topCategory(d)), d.children ? 0.32 : 0.22))
      .attr('stroke-width', (d) => (d.children ? 0.75 : 0.6))
      .attr('d', (d) => arc(d.current))
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'))
      .on('click', (event, d) => {
        event.stopPropagation();
        hideTooltip(tooltip);
        if (!d.children) return;
        clicked(d);
      })
      .on('mouseenter', (event, d) => {
        if (d.children) {
          hideTooltip(tooltip);
          return;
        }
        const meta = courseMap.get(d.data.id || d.data.code || d.data.name);
        const html = formatCourseTooltip(meta);
        if (!html) return;
        const align = tooltipAlignment(event.currentTarget, svg.node());
        showTooltip(tooltip, event.currentTarget.getBoundingClientRect(), html, align);
        d3.select(event.currentTarget).classed('is-hovered', true).attr('filter', 'url(#cw-glow)');
      })
      .on('mouseleave', (event) => {
        hideTooltip(tooltip);
        d3.select(event.currentTarget).classed('is-hovered', false).attr('filter', null);
      });

    const labels = g
      .append('g')
      .attr('class', 'cw-labels')
      .attr('pointer-events', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('class', 'cw-label')
      .attr('dy', '0.32em')
      .attr('fill-opacity', (d) => (labelVisible(d.current) ? 1 : 0))
      .attr('transform', (d) => labelTransform(d.current))
      .text((d) => labelText(d));

    const center = g
      .append('g')
      .attr('class', 'cw-center-group')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .datum(root);

    const parentCircle = center
      .append('circle')
      .datum(root)
      .attr('class', 'cw-center')
      .attr('r', Math.max(36, radiusStep * 0.9))
      .attr('fill', blendWithSurface('#1e293b', darkMode ? 0.35 : 0.2))
      .attr('stroke', blendWithSurface('#334155', 0.45))
      .attr('stroke-width', 1.4);

    const parentLabel = center
      .append('text')
      .attr('class', 'cw-center-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.36em')
      .text('Coursework');

    center.on('click', (_, d) => {
      if (!d) return;
      hideTooltip(tooltip);
      clicked(d);
    });

    let focus = root;
    svg.on('click', () => {
      if (focus.parent) {
        hideTooltip(tooltip);
        clicked(focus.parent);
      }
    });

    function clicked(p) {
      focus = p;
      const parentNode = p.parent || root;
      center.datum(parentNode);
      parentCircle.datum(parentNode);
      parentLabel.text(p === root ? 'Coursework' : p.data.name);

      root.each((d) => {
        d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        };
      });

      const transition = svg.transition().duration(750);

      path
        .transition(transition)
        .tween('data', (d) => {
          const i = d3.interpolate(d.current, d.target);
          return (t) => {
            d.current = i(t);
          };
        })
        .filter(function (d) {
          const visible = arcVisible(d.target);
          return +this.getAttribute('fill-opacity') || visible;
        })
        .attr('fill-opacity', (d) => (arcVisible(d.target) ? (d.children ? 0.95 : 1) : 0))
        .attrTween('d', (d) => () => arc(d.current));

      labels
        .filter(function (d) {
          const visible = labelVisible(d.target);
          return +this.getAttribute('fill-opacity') || visible;
        })
        .transition(transition)
        .attr('fill-opacity', (d) => (labelVisible(d.target) ? 1 : 0))
        .attrTween('transform', (d) => () => labelTransform(d.current));
    }

    clicked(root);
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

    const fallbackWidth = viewportWidth ? Math.max(Math.min(viewportWidth - 96, 1100), 320) : 960;

    let candidate = Math.max(measured, fallbackWidth);

    if (viewportHeight) {
      const heightCap = Math.max(Math.min(viewportHeight - 240, 760), 420);
      candidate = Math.min(candidate, heightCap);
    }

    const upperBound = 1120;
    const lowerBound = viewportWidth < 640 ? 320 : 480;
    return Math.max(Math.min(candidate, upperBound), lowerBound);
  }

  function blendWithSurface(color, weight) {
    return d3.interpolateLab(surfaceColour, color)(weight);
  }

  function tooltipAlignment(element, svg) {
    if (!element || !svg) return 'right';
    const elementRect = element.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const center = svgRect.left + svgRect.width / 2;
    return elementRect.left >= center ? 'left' : 'right';
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
