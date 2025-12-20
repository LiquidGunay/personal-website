// Coursework treemap visualisation powered by D3
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

  const state = {
    selectedId: null,
    focusedSubject: null,
  };

  fetch('/static/courses.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data) => init(data))
    .catch((err) => {
      console.error('Failed to load coursework data', err);
      mount.textContent = 'Failed to load visualization.';
    });

  function init(data) {
    const courseMap = buildCourseMap(data.hierarchy);

    const treemapEl = mount.querySelector('[data-viz="treemap"]');
    const legendEl = mount.querySelector('[data-cw-legend]');
    const detailsEl = mount.querySelector('[data-cw-details]');
    const clearBtn = mount.querySelector('[data-cw-clear]');

    if (!treemapEl) return;

    if (detailsEl) {
      detailsEl.setAttribute('aria-live', 'polite');
    }

    const subjects = (data.hierarchy && Array.isArray(data.hierarchy.children) ? data.hierarchy.children : [])
      .map((s) => s && s.name)
      .filter(Boolean);

    if (legendEl) {
      renderLegend(legendEl, subjects, state, (subject) => {
        state.focusedSubject = subject;
        const selectedMeta = state.selectedId ? courseMap.get(state.selectedId) : null;
        if (selectedMeta && state.focusedSubject && selectedMeta.category !== state.focusedSubject) {
          state.selectedId = null;
        }
        syncClearButton(clearBtn, state.selectedId);
        renderDetails(detailsEl, state.selectedId ? courseMap.get(state.selectedId) : null);
        render(true);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.selectedId = null;
        syncClearButton(clearBtn, state.selectedId);
        renderDetails(detailsEl, null);
        updateSelection(treemapEl, state.selectedId);
      });
    }

    syncClearButton(clearBtn, state.selectedId);
    renderDetails(detailsEl, null);

    let lastWidth = 0;
    let lastHeight = 0;
    let lastFocus = state.focusedSubject;

    const measure = () => {
      const rect = treemapEl.getBoundingClientRect();
      const width = Math.round(rect.width || treemapEl.clientWidth || 0);
      const height = Math.round(rect.height || treemapEl.clientHeight || 0);
      return { width, height };
    };

    const render = (force = false) => {
      const { width, height } = measure();
      if (!width || !height) return;
      const focusChanged = state.focusedSubject !== lastFocus;
      if (!force && !focusChanged && Math.abs(width - lastWidth) < 4 && Math.abs(height - lastHeight) < 4) return;
      renderTreemap(treemapEl, data.hierarchy, courseMap, detailsEl, clearBtn, width, height);
      lastWidth = width;
      lastHeight = height;
      lastFocus = state.focusedSubject;
    };

    render();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(() => render());
      });
      observer.observe(treemapEl);
    } else {
      window.addEventListener(
        'resize',
        debounce(() => render(), 160),
      );
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
        const year = formatYear(node.data.year, code);
        const description = typeof node.data.description === 'string' ? node.data.description : '';
        map.set(id, { id, code, name, full, category, year, description });
      }
    });
    return map;
  }

  function structuredCloneSafe(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function colourFor(category) {
    return palette.get(category) || '#475569';
  }

  function blendWithSurface(color, weight) {
    return d3.interpolateLab(surfaceColour, color)(weight);
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

  function inferYearFromCode(code) {
    if (!code) return null;
    const match = String(code).match(/(\d{3})/);
    if (!match) return null;
    const num = Number.parseInt(match[1], 10);
    if (!Number.isFinite(num) || num <= 0) return null;
    const year = Math.floor(num / 100);
    if (year <= 0) return null;
    return `Year ${year}`;
  }

  function formatYear(value, code) {
    if (value == null || value === '') return inferYearFromCode(code);
    if (typeof value === 'number' && Number.isFinite(value)) return `Year ${value}`;
    const str = String(value).trim();
    if (!str) return inferYearFromCode(code);
    if (/^\d+$/.test(str) && Number.parseInt(str, 10) <= 12) return `Year ${str}`;
    return str;
  }

  function ensureTooltip(parent) {
    const existing = parent.querySelector('.cw-tooltip');
    if (existing) return existing;
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
      const top = clamp(baseTop, 8, containerRect.height - tipRect.height - 8);
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
    if (!tip) return;
    tip.removeAttribute('data-visible');
    tip.style.visibility = 'hidden';
    tip.style.display = 'none';
  }

  function tooltipAlignment(element, svg) {
    if (!element || !svg) return 'right';
    const elementRect = element.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const center = svgRect.left + svgRect.width / 2;
    return elementRect.left >= center ? 'left' : 'right';
  }

  function formatCourseTooltip(meta) {
    if (!meta) return '';
    const title = escapeHtml(meta.code ? `${meta.code} · ${meta.name}` : meta.name);
    const parts = [`<div class="cw-tip-title">${title}</div>`];
    const metaChips = [];
    if (meta.code) metaChips.push(`<span>${escapeHtml(meta.code)}</span>`);
    metaChips.push(`<span>${escapeHtml(meta.category)}</span>`);
    if (meta.year) metaChips.push(`<span>${escapeHtml(meta.year)}</span>`);
    parts.push(`<div class="cw-tip-meta">${metaChips.join('')}</div>`);
    if (meta.description) {
      parts.push(`<p class="cw-tip-desc">${escapeHtml(meta.description)}</p>`);
    } else {
      parts.push('<p class="cw-tip-empty">Description coming soon.</p>');
    }
    parts.push('<p class="cw-tip-empty">Click to pin details →</p>');
    return parts.join('');
  }

  function truncateTspanToWidth(tspan, width, addEllipsis) {
    const node = tspan.node();
    if (!node) return;
    const raw = tspan.text();
    if (!raw) return;
    const suffix = addEllipsis ? '…' : '';
    let text = raw;

    const setText = (value) => {
      tspan.text(addEllipsis ? `${value}${suffix}` : value);
    };

    setText(text);
    while (node.getComputedTextLength() > width && text.length > 1) {
      text = text.slice(0, -1);
      setText(text);
    }
  }

  function addEllipsisToTspan(tspan, width) {
    const node = tspan.node();
    if (!node) return;
    let text = tspan.text().replace(/…$/, '');
    if (!text) return;
    tspan.text(`${text}…`);
    while (node.getComputedTextLength() > width && text.length > 1) {
      const trimmed = text.replace(/\s+\S+$/, '');
      if (trimmed && trimmed !== text) {
        text = trimmed;
      } else {
        text = text.slice(0, -1);
      }
      tspan.text(`${text}…`);
    }
  }

  function wrapTextIntoTspans(textEl, value, width, maxLines, className, startDyEm) {
    const words = String(value || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return;

    const x = Number(textEl.attr('x')) || 0;
    const lineHeightEm = 1.18;
    let line = [];
    let lineNumber = 0;
    let tspan = textEl
      .append('tspan')
      .attr('x', x)
      .attr('dy', startDyEm ? `${startDyEm}em` : 0)
      .attr('class', className);

    for (let idx = 0; idx < words.length; idx += 1) {
      const word = words[idx];
      line.push(word);
      tspan.text(line.join(' '));

      const node = tspan.node();
      if (!node) continue;
      if (node.getComputedTextLength() <= width) continue;

      line.pop();
      if (line.length === 0) {
        tspan.text(word);
        truncateTspanToWidth(tspan, width, idx < words.length - 1);
        return;
      }

      tspan.text(line.join(' '));

      if (lineNumber >= maxLines - 1) {
        addEllipsisToTspan(tspan, width);
        return;
      }

      line = [word];
      lineNumber += 1;
      tspan = textEl
        .append('tspan')
        .attr('x', x)
        .attr('dy', `${lineHeightEm}em`)
        .attr('class', className)
        .text(word);
    }
  }

  function renderTileLabel(textEl, meta, width, height, showName) {
    if (!meta) return;
    textEl.selectAll('tspan').remove();

    const x = Number(textEl.attr('x')) || 0;
    const code = meta.code ? String(meta.code) : '';
    const name = meta.name ? String(meta.name) : '';

    if (!showName) {
      const label = code || name;
      if (!label) return;
      const tspan = textEl
        .append('tspan')
        .attr('x', x)
        .attr('dy', 0)
        .attr('class', code ? 'cw-tile-code' : 'cw-tile-name')
        .text(label);
      truncateTspanToWidth(tspan, width, !code);
      return;
    }

    let usedLines = 0;
    if (code) {
      const codeTspan = textEl
        .append('tspan')
        .attr('x', x)
        .attr('dy', 0)
        .attr('class', 'cw-tile-code')
        .text(code);
      truncateTspanToWidth(codeTspan, width, false);
      usedLines += 1;
    }

    const availableLines = Math.max(1, Math.min(4 - usedLines, Math.floor((height - 28) / 18)));
    wrapTextIntoTspans(textEl, name, width, availableLines, 'cw-tile-name', usedLines ? 1.25 : 0);
  }

  function flattenToSubjectTreemap(tree, focusedSubject) {
    const base = structuredCloneSafe(tree);
    const root = { name: base.name || 'Coursework', children: [] };
    for (const subject of base.children || []) {
      if (focusedSubject && subject.name !== focusedSubject) continue;
      const children = [];
      for (const group of subject.children || []) {
        for (const course of group.children || []) {
          children.push(course);
        }
      }
      root.children.push({ name: subject.name, children });
    }
    return root;
  }

  function clearSvg(parent) {
    const svg = parent.querySelector('svg');
    if (svg) svg.remove();
  }

  function renderLegend(container, subjects, localState, onFocusChange) {
    container.innerHTML = '';

    const makeButton = (label, subject, swatch) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cw-legend-btn';
      btn.setAttribute('aria-pressed', String(localState.focusedSubject === subject));
      btn.dataset.cwSubject = subject == null ? '' : subject;

      if (swatch) {
        const sw = document.createElement('span');
        sw.className = 'cw-legend-swatch';
        sw.style.background = swatch;
        btn.appendChild(sw);
      }

      btn.appendChild(document.createTextNode(label));
      btn.addEventListener('click', () => {
        const next = subject == null ? null : subject;
        if (localState.focusedSubject === next) {
          onFocusChange(null);
        } else {
          onFocusChange(next);
        }
        for (const other of container.querySelectorAll('.cw-legend-btn')) {
          const val = other.dataset.cwSubject || '';
          const current = val === '' ? null : val;
          other.setAttribute('aria-pressed', String(localState.focusedSubject === current));
        }
      });
      return btn;
    };

    container.appendChild(makeButton('All', null, null));
    for (const subject of subjects) {
      container.appendChild(makeButton(subject, subject, colourFor(subject)));
    }
  }

  function syncClearButton(button, selectedId) {
    if (!button) return;
    button.hidden = !selectedId;
  }

  function renderDetails(detailsEl, meta) {
    if (!detailsEl) return;
    if (!meta) {
      detailsEl.innerHTML =
        '<p class="cw-details-empty">Select a course tile to see its year and description.</p>';
      return;
    }

    const title = escapeHtml(meta.code ? `${meta.code} · ${meta.name}` : meta.name);
    const subtitle = escapeHtml(meta.category);
    const year = meta.year ? escapeHtml(meta.year) : '—';
    const description = meta.description ? escapeHtml(meta.description) : 'Description coming soon.';

    detailsEl.innerHTML = `
      <div>
        <p class="cw-detail-title">${title}</p>
        <p class="cw-detail-subtitle">${subtitle}</p>
      </div>
      <div class="cw-detail-section">
        <h3>Year</h3>
        <p>${year}</p>
      </div>
      <div class="cw-detail-section">
        <h3>Description</h3>
        <p>${description}</p>
      </div>
    `;
  }

  function updateSelection(container, selectedId) {
    const svg = container.querySelector('svg');
    if (!svg) return;
    for (const tile of svg.querySelectorAll('.cw-tile')) {
      const id = tile.getAttribute('data-cw-id');
      tile.classList.toggle('is-selected', Boolean(selectedId && id === selectedId));
    }
  }

  function renderTreemap(container, hierarchyData, courseMap, detailsEl, clearBtn, width, height) {
    clearSvg(container);
    const tooltip = ensureTooltip(container);
    hideTooltip(tooltip);

    const flat = flattenToSubjectTreemap(hierarchyData, state.focusedSubject);

    const root = d3
      .hierarchy(flat)
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const subjectHeader = 28;
    const paddingOuter = 14;
    const paddingInner = 8;

    d3
      .treemap()
      .tile(d3.treemapSquarify.ratio(1.15))
      .size([width, height])
      .paddingOuter(paddingOuter)
      .paddingInner(paddingInner)
      .paddingTop((d) => (d.depth === 1 ? subjectHeader : 0))
      .round(true)(root);

    const svg = d3
      .select(container)
      .insert('svg', ':first-child')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Coursework treemap');

    const subjects = root.children || [];

    svg
      .append('g')
      .attr('class', 'cw-subjects')
      .selectAll('g')
      .data(subjects)
      .join('g')
      .attr('class', 'cw-subject')
      .each(function (d) {
        const g = d3.select(this);
        const w = Math.max(0, d.x1 - d.x0);
        const h = Math.max(0, d.y1 - d.y0);
        const base = colourFor(d.data.name);
        g.append('rect')
          .attr('class', 'cw-subject-bg')
          .attr('x', d.x0)
          .attr('y', d.y0)
          .attr('width', w)
          .attr('height', h)
          .attr('rx', 18)
          .attr('fill', blendWithSurface(base, darkMode ? 0.18 : 0.12));

        g.append('text')
          .attr('class', 'cw-subject-label')
          .attr('x', d.x0 + 14)
          .attr('y', d.y0 + 20)
          .text(d.data.name);
      });

    const leafNodes = root.leaves();
    const clipId = (_, i) => `cw-tile-clip-${i}`;

    const defs = svg.append('defs');
    defs
      .selectAll('clipPath')
      .data(leafNodes)
      .join('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', (d) => d.x0 + 8)
      .attr('y', (d) => d.y0 + 8)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0 - 16))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - 16))
      .attr('rx', 10);

    const tileGroup = svg.append('g').attr('class', 'cw-tiles');

    const tiles = tileGroup
      .selectAll('g')
      .data(leafNodes)
      .join('g')
      .attr('class', 'cw-tile')
      .attr('data-cw-id', (d) => d.data.id || d.data.code || d.data.name)
      .attr('role', 'button')
      .attr('tabindex', '0')
      .attr('aria-label', (d) => {
        const id = d.data.id || d.data.code || d.data.name;
        const meta = courseMap.get(id);
        return meta ? meta.full : d.data.name;
      })
      .classed('is-selected', (d) => {
        const id = d.data.id || d.data.code || d.data.name;
        return Boolean(state.selectedId && id === state.selectedId);
      })
      .on('mouseenter', (event, d) => {
        const id = d.data.id || d.data.code || d.data.name;
        const meta = courseMap.get(id);
        const html = formatCourseTooltip(meta);
        if (!html) return;
        const align = tooltipAlignment(event.currentTarget, svg.node());
        showTooltip(tooltip, event.currentTarget.getBoundingClientRect(), html, align);
      })
      .on('mouseleave', () => hideTooltip(tooltip))
      .on('click', (event, d) => {
        event.stopPropagation();
        hideTooltip(tooltip);
        const id = d.data.id || d.data.code || d.data.name;
        state.selectedId = id;
        syncClearButton(clearBtn, state.selectedId);
        updateSelection(container, state.selectedId);
        renderDetails(detailsEl, courseMap.get(id));
      })
      .on('keydown', (event, d) => {
        const key = event.key;
        if (key !== 'Enter' && key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        hideTooltip(tooltip);
        const id = d.data.id || d.data.code || d.data.name;
        state.selectedId = id;
        syncClearButton(clearBtn, state.selectedId);
        updateSelection(container, state.selectedId);
        renderDetails(detailsEl, courseMap.get(id));
      });

    tiles
      .append('rect')
      .attr('class', 'cw-tile-rect')
      .attr('x', (d) => d.x0 + 3)
      .attr('y', (d) => d.y0 + 3)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0 - 6))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - 6))
      .attr('rx', 12)
      .attr('fill', (d) => {
        const subject = d.parent ? d.parent.data.name : 'Other';
        const base = colourFor(subject);
        return blendWithSurface(base, darkMode ? 0.62 : 0.74);
      });

    const focused = Boolean(state.focusedSubject);

    tiles
      .append('text')
      .attr('class', 'cw-tile-label')
      .attr('x', (d) => d.x0 + 12)
      .attr('y', (d) => d.y0 + 20)
      .attr('clip-path', (d, i) => `url(#${clipId(d, i)})`)
      .attr('opacity', 0)
      .each(function (d) {
        const id = d.data.id || d.data.code || d.data.name;
        const meta = courseMap.get(id);
        if (!meta) return;

        const innerWidth = d.x1 - d.x0 - 24;
        const innerHeight = d.y1 - d.y0 - 24;
        if (innerWidth < 36 || innerHeight < 18) return;

        const showName = focused && innerWidth >= 96 && innerHeight >= 64;

        const text = d3.select(this);
        text.attr('opacity', 1);
        renderTileLabel(text, meta, innerWidth, innerHeight, showName);
      });

    svg.on('click', () => {
      hideTooltip(tooltip);
      state.selectedId = null;
      syncClearButton(clearBtn, state.selectedId);
      updateSelection(container, state.selectedId);
      renderDetails(detailsEl, null);
    });
  }

  function buildFallbackList(tree) {
    const lines = [];
    const root = d3.hierarchy(structuredCloneSafe(tree));
    for (const category of root.children || []) {
      lines.push(`<h3>${escapeHtml(category.data.name)}</h3>`);
      for (const group of category.children || []) {
        lines.push(`<h4>${escapeHtml(group.data.name)}</h4>`);
        lines.push('<ul>');
        for (const leaf of group.leaves()) {
          const code = leaf.data.code ? `${escapeHtml(leaf.data.code)} · ` : '';
          lines.push(`<li>${code}${escapeHtml(leaf.data.name)}</li>`);
        }
        lines.push('</ul>');
      }
    }
    return lines.join('');
  }
})();
