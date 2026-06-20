// Coursework treemap visualisation powered by D3
(function () {
  let bootAttempts = 0;
  let d3LoadStarted = false;

  function showLoadFailure(mount) {
    const target = mount && (mount.querySelector('[data-viz="treemap"]') || mount);
    if (target) target.textContent = 'Failed to load visualization.';
  }

  function ensureD3(mount) {
    if (typeof window.d3 !== 'undefined' || d3LoadStarted) return;
    d3LoadStarted = true;

    const existing = document.querySelector('script[src*="/static/vendor/d3.v7.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => window.setTimeout(boot, 0), { once: true });
      existing.addEventListener('error', () => showLoadFailure(mount), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/static/vendor/d3.v7.min.js';
    script.async = true;
    script.onload = () => window.setTimeout(boot, 0);
    script.onerror = () => showLoadFailure(mount);
    document.head.appendChild(script);
  }

  function boot() {
    const mount = document.getElementById('cw-viz');
    if (!mount) {
      bootAttempts += 1;
      if (bootAttempts < 120) window.setTimeout(boot, 100);
      return;
    }

    if (typeof window.d3 === 'undefined') {
      ensureD3(mount);
      bootAttempts += 1;
      if (bootAttempts < 120) window.setTimeout(boot, 100);
      else showLoadFailure(mount);
      return;
    }

    if (mount.dataset.cwInitialised === 'true') return;
    mount.dataset.cwInitialised = 'true';


  const palette = new Map([
    ['Physics', '#285ca8'],
    ['Electronics', '#b9472f'],
    ['Mathematics', '#1f6f5f'],
    ['Computer Science', '#5e6f83'],
    ['Economics', '#9a6b22'],
    ['Other', '#676056'],
  ]);

  function isDarkMode() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const explicitTheme = document.documentElement.dataset.theme;
    return explicitTheme === 'dark' || (!explicitTheme && prefersDark);
  }

  function surfaceColour() {
    return isDarkMode() ? '#11130f' : '#f7f5ee';
  }

  const state = {
    selectedId: null,
    focusedSubject: null,
    query: '',
    yearFilter: null,
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
    const searchEl = mount.querySelector('[data-cw-search]');
    const yearsEl = mount.querySelector('[data-cw-years]');
    const statsEl = mount.querySelector('[data-cw-stats]');
    const detailsEl = mount.querySelector('[data-cw-details]');
    const clearBtn = mount.querySelector('[data-cw-clear]');

    if (!treemapEl) return;

    if (detailsEl) {
      detailsEl.setAttribute('aria-live', 'polite');
    }

    const subjects = (data.hierarchy && Array.isArray(data.hierarchy.children) ? data.hierarchy.children : [])
      .map((s) => s && s.name)
      .filter(Boolean);
    const yearOptions = collectYearOptions(courseMap);

    const normalizeSelection = () => {
      if (!state.selectedId) return;
      const selectedMeta = courseMap.get(state.selectedId);
      if (!selectedMeta || !isMetaVisible(selectedMeta, state)) {
        state.selectedId = null;
      }
    };

    if (legendEl) {
      renderLegend(legendEl, subjects, courseMap, state, (subject) => {
        state.focusedSubject = subject;
        normalizeSelection();
        syncClearButton(clearBtn, state.selectedId);
        renderDetails(detailsEl, state.selectedId ? courseMap.get(state.selectedId) : null);
        render(true);
      });
    }

    if (yearsEl) {
      renderYearFilters(yearsEl, yearOptions, state, (yearToken) => {
        state.yearFilter = yearToken;
        normalizeSelection();
        syncClearButton(clearBtn, state.selectedId);
        renderDetails(detailsEl, state.selectedId ? courseMap.get(state.selectedId) : null);
        render(true);
      });
    }

    if (searchEl) {
      searchEl.addEventListener(
        'input',
        debounce(() => {
          state.query = searchEl.value.trim().toLowerCase();
          normalizeSelection();
          syncClearButton(clearBtn, state.selectedId);
          renderDetails(detailsEl, state.selectedId ? courseMap.get(state.selectedId) : null);
          render(true);
        }, 90),
      );
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
    let lastSignature = `${state.focusedSubject || ''}|${state.yearFilter || ''}|${state.query || ''}`;

    const measure = () => {
      const rect = treemapEl.getBoundingClientRect();
      const width = Math.round(rect.width || treemapEl.clientWidth || 0);
      const height = Math.round(rect.height || treemapEl.clientHeight || 0);
      return { width, height };
    };

    const render = (force = false) => {
      const { width, height } = measure();
      if (!width || !height) return;
      const signature = `${state.focusedSubject || ''}|${state.yearFilter || ''}|${state.query || ''}`;
      const signatureChanged = signature !== lastSignature;
      if (!force && !signatureChanged && Math.abs(width - lastWidth) < 4 && Math.abs(height - lastHeight) < 4) return;
      const summary = renderTreemap(treemapEl, data.hierarchy, courseMap, detailsEl, clearBtn, width, height, state);
      renderStats(statsEl, summary, courseMap.size, state);
      lastWidth = width;
      lastHeight = height;
      lastSignature = signature;
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

    window.addEventListener('personal-site:theme-change', () => {
      window.requestAnimationFrame(() => render(true));
    });

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
        const group = node.ancestors().find((a) => a.depth === 2);
        const category = top ? top.data.name : 'Other';
        const track = group ? group.data.name : '';
        const id = node.data.id || node.data.code || node.data.name;
        const code = node.data.code || null;
        const name = node.data.name;
        const full = code ? `${code} · ${name}` : name;
        const year = formatYear(node.data.year, code);
        const yearToken = normaliseYearToken(year);
        const credits = Number.isFinite(Number(node.data.credits)) ? Number(node.data.credits) : null;
        const description = typeof node.data.description === 'string' ? node.data.description : '';
        const searchIndex = [code, name, category, track, year, credits != null ? `${credits} credits` : null, description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        map.set(id, { id, code, name, full, category, track, year, yearToken, credits, description, searchIndex });
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
    return d3.interpolateLab(surfaceColour(), color)(weight);
  }

  function ledgerTileFill(category) {
    const base = colourFor(category);
    return blendWithSurface(base, isDarkMode() ? 0.42 : 0.26);
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

  function normaliseYearToken(value) {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    const match = text.match(/(\d{1,2})/);
    if (/^semester\b/i.test(text) && match) return `Semester ${Number.parseInt(match[1], 10)}`;
    if (/^year\b/i.test(text) && match) return `Year ${Number.parseInt(match[1], 10)}`;
    if (/^\d{1,2}$/.test(text)) return `Year ${Number.parseInt(text, 10)}`;
    return text;
  }

  function formatCredits(value) {
    if (value == null || !Number.isFinite(Number(value))) return null;
    const credits = Number(value);
    return `${credits} credit${credits === 1 ? '' : 's'}`;
  }

  function collectYearOptions(courseMap) {
    const counts = new Map();
    for (const meta of courseMap.values()) {
      if (!meta.yearToken) continue;
      counts.set(meta.yearToken, (counts.get(meta.yearToken) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => {
        const rank = (token) => (/^semester\b/i.test(token) ? 0 : /^year\b/i.test(token) ? 1 : 2);
        const rankDiff = rank(a.token) - rank(b.token);
        if (rankDiff !== 0) return rankDiff;
        const aMatch = a.token.match(/(\d{1,2})/);
        const bMatch = b.token.match(/(\d{1,2})/);
        if (aMatch && bMatch) return Number.parseInt(aMatch[1], 10) - Number.parseInt(bMatch[1], 10);
        if (aMatch) return -1;
        if (bMatch) return 1;
        return a.token.localeCompare(b.token);
      });
  }

  function hasActiveFilter(localState) {
    return Boolean(localState.focusedSubject || localState.yearFilter || localState.query);
  }

  function isMetaVisible(meta, localState) {
    if (!meta) return false;
    if (localState.focusedSubject && meta.category !== localState.focusedSubject) return false;
    if (localState.yearFilter && meta.yearToken !== localState.yearFilter) return false;
    if (localState.query && !meta.searchIndex.includes(localState.query)) return false;
    return true;
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
    if (meta.track) metaChips.push(`<span>${escapeHtml(meta.track)}</span>`);
    if (meta.year) metaChips.push(`<span>${escapeHtml(meta.year)}</span>`);
    const credits = formatCredits(meta.credits);
    if (credits) metaChips.push(`<span>${escapeHtml(credits)}</span>`);
    parts.push(`<div class="cw-tip-meta">${metaChips.join('')}</div>`);
    if (meta.description) {
      parts.push(`<p class="cw-tip-desc">${escapeHtml(meta.description)}</p>`);
    } else {
      parts.push('<p class="cw-tip-empty">Description coming soon.</p>');
    }
    parts.push('<p class="cw-tip-empty">Click or press Enter to pin details →</p>');
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

  function wrapTextIntoTspans(
    textEl,
    value,
    width,
    maxLines,
    className,
    startDyEm,
    lineHeightEm = 1.18,
    allowBreakWord = false,
  ) {
    const words = String(value || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return;

    const x = Number(textEl.attr('x')) || 0;
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
        if (allowBreakWord && maxLines > 1 && lineNumber < maxLines - 1 && word.length > 6) {
          const mid = Math.ceil(word.length / 2);
          const first = word.slice(0, mid);
          const second = word.slice(mid);
          tspan.text(first);
          lineNumber += 1;
          tspan = textEl
            .append('tspan')
            .attr('x', x)
            .attr('dy', `${lineHeightEm}em`)
            .attr('class', className)
            .text(second);
          truncateTspanToWidth(tspan, width, idx < words.length - 1);
          return;
        }
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

  function subjectLabelForWidth(name, width) {
    if (width >= 92) return name;
    const short = new Map([
      ['Computer Science', 'CS'],
      ['Mathematics', 'Math'],
      ['Electronics', 'EE'],
      ['Economics', 'Econ'],
      ['Physics', 'Physics'],
      ['Other', 'Other'],
    ]);
    return short.get(name) || name;
  }

  function renderTileLabel(textEl, meta, width, height, showName) {
    if (!meta) return;
    textEl.selectAll('tspan').remove();

    const x = Number(textEl.attr('x')) || 0;
    const code = meta.code ? String(meta.code) : '';
    const name = meta.name ? String(meta.name) : '';

    const renderCode = () => {
      if (!code) return 0;
      const compact = String(code).trim().replace(/\s+/g, ' ');
      if (!compact) return 0;
      const single = textEl
        .append('tspan')
        .attr('x', x)
        .attr('dy', 0)
        .attr('class', 'cw-tile-code')
        .text(compact);
      truncateTspanToWidth(single, width, false);
      if (single.text() === compact) return 1;
      single.remove();

      const parts = compact.split(/\s+/).filter(Boolean);
      let lines = 0;
      for (let idx = 0; idx < parts.length; idx += 1) {
        const part = parts[idx];
        const tspan = textEl
          .append('tspan')
          .attr('x', x)
          .attr('dy', lines === 0 ? 0 : '1.02em')
          .attr('class', 'cw-tile-code')
          .text(part);
        truncateTspanToWidth(tspan, width, false);
        lines += 1;
      }
      return lines;
    };

    if (code) {
      renderCode();
      return;
    }
    if (!name) return;
    const tspan = textEl
      .append('tspan')
      .attr('x', x)
      .attr('dy', 0)
      .attr('class', 'cw-tile-name')
      .text(name);
    truncateTspanToWidth(tspan, width, true);
  }

  function renderSubjectLabel(group, node, width) {
    const text = group
      .append('text')
      .attr('class', 'cw-subject-label')
      .attr('x', node.x0 + 14)
      .attr('y', node.y0 + 16);

    const maxWidth = Math.max(0, width - 24);
    if (!maxWidth) return;

    const label = subjectLabelForWidth(node.data.name, maxWidth);
    wrapTextIntoTspans(text, label, maxWidth, 1, 'cw-subject-label-line', 0, 1.1, false);
  }

  function flattenToSubjectTreemap(tree, courseMap, localState) {
    const base = structuredCloneSafe(tree);
    const root = { name: base.name || 'Coursework', children: [] };
    for (const subject of base.children || []) {
      if (localState.focusedSubject && subject.name !== localState.focusedSubject) continue;
      const children = [];
      for (const group of subject.children || []) {
        for (const course of group.children || []) {
          const id = course.id || course.code || course.name;
          const meta = courseMap.get(id);
          if (!isMetaVisible(meta, localState)) continue;
          children.push(course);
        }
      }
      if (!children.length) continue;

      root.children.push({ name: subject.name, children });
    }
    return root;
  }

  function clearSvg(parent) {
    const svg = parent.querySelector('svg');
    if (svg) svg.remove();
  }

  function renderLegend(container, subjects, courseMap, localState, onFocusChange) {
    container.innerHTML = '';
    const subjectCounts = new Map();
    for (const meta of courseMap.values()) {
      subjectCounts.set(meta.category, (subjectCounts.get(meta.category) || 0) + 1);
    }
    const totalCount = courseMap.size;

    const makeButton = (label, subject, swatch, count) => {
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

      const text = document.createElement('span');
      text.className = 'cw-legend-label';
      text.textContent = label;
      btn.appendChild(text);
      if (typeof count === 'number') {
        const badge = document.createElement('span');
        badge.className = 'cw-legend-count';
        badge.textContent = String(count);
        btn.appendChild(badge);
      }
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

    container.appendChild(makeButton('All', null, null, totalCount));
    for (const subject of subjects) {
      container.appendChild(makeButton(subject, subject, colourFor(subject), subjectCounts.get(subject) || 0));
    }
  }

  function renderYearFilters(container, options, localState, onYearChange) {
    container.innerHTML = '';

    const makeButton = (token, label, count) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cw-year-chip';
      btn.dataset.cwYear = token || '';
      btn.setAttribute('aria-pressed', String(localState.yearFilter === token));

      const text = document.createElement('span');
      text.className = 'cw-year-label';
      text.textContent = label;
      btn.appendChild(text);

      if (typeof count === 'number') {
        const badge = document.createElement('span');
        badge.className = 'cw-year-count';
        badge.textContent = String(count);
        btn.appendChild(badge);
      }

      btn.addEventListener('click', () => {
        const next = localState.yearFilter === token ? null : token;
        onYearChange(next);
        for (const other of container.querySelectorAll('.cw-year-chip')) {
          const value = other.dataset.cwYear || null;
          other.setAttribute('aria-pressed', String(localState.yearFilter === value));
        }
      });
      return btn;
    };

    const total = options.reduce((acc, entry) => acc + entry.count, 0);
    container.appendChild(makeButton(null, 'All semesters', total));

    for (const option of options) {
      container.appendChild(makeButton(option.token, option.token, option.count));
    }
  }

  function renderStats(statsEl, summary, totalCount, localState) {
    if (!statsEl) return;
    const visible = summary && typeof summary.visibleCount === 'number' ? summary.visibleCount : totalCount;
    const subjectCount = summary && typeof summary.subjectCount === 'number' ? summary.subjectCount : 0;
    const filters = [];
    if (localState.focusedSubject) filters.push(localState.focusedSubject);
    if (localState.yearFilter) filters.push(localState.yearFilter);
    if (localState.query) filters.push(`"${localState.query}"`);
    const filterText = filters.length ? ` Filters: ${filters.join(' · ')}.` : '';
    const subjectText = subjectCount ? ` Across ${subjectCount} subject${subjectCount === 1 ? '' : 's'}.` : '';
    statsEl.textContent = `${visible} of ${totalCount} courses visible.${subjectText}${filterText}`;
  }

  function syncClearButton(button, selectedId) {
    if (!button) return;
    button.hidden = !selectedId;
  }

  function revealDetailsOnStackedLayout(detailsEl) {
    if (!detailsEl || !window.matchMedia('(max-width: 1120px)').matches) return;
    const target = detailsEl.closest('.cw-details') || detailsEl;
    window.requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.72) {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  }

  function renderDetails(detailsEl, meta) {
    if (!detailsEl) return;
    if (!meta) {
      detailsEl.innerHTML =
        '<p class="cw-details-empty">Select a course tile to see its semester and description.</p>';
      return;
    }

    const title = escapeHtml(meta.code ? `${meta.code} · ${meta.name}` : meta.name);
    const subtitle = escapeHtml(meta.category);
    const track = meta.track ? escapeHtml(meta.track) : null;
    const year = meta.year ? escapeHtml(meta.year) : '&mdash;';
    const credits = formatCredits(meta.credits);
    const description = meta.description ? escapeHtml(meta.description) : 'Description coming soon.';
    const chips = [`<span>${escapeHtml(meta.category)}</span>`];
    if (track) chips.push(`<span>${track}</span>`);
    if (meta.year) chips.push(`<span>${escapeHtml(meta.year)}</span>`);
    if (credits) chips.push(`<span>${escapeHtml(credits)}</span>`);

    detailsEl.innerHTML = `
      <div>
        <p class="cw-detail-title">${title}</p>
        <p class="cw-detail-subtitle">${subtitle}${track ? ` · ${track}` : ''}</p>
        <div class="cw-detail-chips">${chips.join('')}</div>
      </div>
      <div class="cw-detail-section">
        <h3>Semester</h3>
        <p>${year}</p>
      </div>
      ${credits ? `<div class="cw-detail-section"><h3>Credits</h3><p>${escapeHtml(credits)}</p></div>` : ''}
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

  function clearEmptyState(container) {
    const empty = container.querySelector('.cw-empty-state');
    if (empty) empty.remove();
  }

  function renderEmptyState(container, localState) {
    clearEmptyState(container);
    const empty = document.createElement('div');
    empty.className = 'cw-empty-state';
    empty.innerHTML = `
      <p>No matching courses found.</p>
      <p>Try clearing subject, semester, or text filters.</p>
      ${localState.query ? `<p class="cw-empty-query">Query: "${escapeHtml(localState.query)}"</p>` : ''}
    `;
    container.appendChild(empty);
  }

  function renderTreemap(container, hierarchyData, courseMap, detailsEl, clearBtn, width, height, localState) {
    clearSvg(container);
    clearEmptyState(container);
    const tooltip = ensureTooltip(container);
    hideTooltip(tooltip);

    const flat = flattenToSubjectTreemap(hierarchyData, courseMap, localState);
    if (!flat.children.length) {
      renderEmptyState(container, localState);
      if (mount) {
        mount.classList.toggle('cw-focused', Boolean(localState.focusedSubject));
        mount.classList.toggle('cw-filtering', hasActiveFilter(localState));
      }
      return { visibleCount: 0, subjectCount: 0 };
    }

    const root = d3
      .hierarchy(flat)
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const subjectHeader = width < 520 ? 28 : 34;
    const paddingOuter = 0;
    const paddingInner = width < 520 ? 3 : 5;

    d3
      .treemap()
      .tile(d3.treemapSquarify.ratio(1))
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

    const subjectLayer = svg
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
          .attr('rx', 0)
          .attr('fill', blendWithSurface(base, isDarkMode() ? 0.22 : 0.1));

        g.append('rect')
          .attr('class', 'cw-subject-rule')
          .attr('x', d.x0)
          .attr('y', d.y0)
          .attr('width', w)
          .attr('height', 3)
          .attr('fill', base);

        renderSubjectLabel(g, d, w);
      });
    subjectLayer.attr('opacity', 1);

    const tileNodes = root.leaves().map((node) => {
      const subject = node.ancestors().find((ancestor) => ancestor.depth === 1);
      node.subject = subject ? subject.data.name : 'Other';
      return node;
    });
    const clipId = (_, i) => `cw-tile-clip-${i}`;
    const tileClipInset = width < 520 ? 3 : 4;
    const labelInset = width < 520 ? 8 : 10;

    const defs = svg.append('defs');
    defs
      .selectAll('clipPath')
      .data(tileNodes)
      .join('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', (d) => d.x0 + tileClipInset)
      .attr('y', (d) => d.y0 + tileClipInset)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0 - tileClipInset * 2))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - tileClipInset * 2))
      .attr('rx', 0);

    const tileGroup = svg.append('g').attr('class', 'cw-tiles');

    const tiles = tileGroup
      .selectAll('g')
      .data(tileNodes)
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
        return Boolean(localState.selectedId && id === localState.selectedId);
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
      .on('focus', (event, d) => {
        const id = d.data.id || d.data.code || d.data.name;
        const meta = courseMap.get(id);
        const html = formatCourseTooltip(meta);
        if (!html) return;
        const align = tooltipAlignment(event.currentTarget, svg.node());
        showTooltip(tooltip, event.currentTarget.getBoundingClientRect(), html, align);
      })
      .on('blur', () => hideTooltip(tooltip))
      .on('click', (event, d) => {
        event.stopPropagation();
        hideTooltip(tooltip);
        const id = d.data.id || d.data.code || d.data.name;
        localState.selectedId = id;
        syncClearButton(clearBtn, localState.selectedId);
        updateSelection(container, localState.selectedId);
        renderDetails(detailsEl, courseMap.get(id));
        revealDetailsOnStackedLayout(detailsEl);
      })
      .on('keydown', (event, d) => {
        const key = event.key;
        if (key === 'Escape') {
          localState.selectedId = null;
          syncClearButton(clearBtn, localState.selectedId);
          updateSelection(container, localState.selectedId);
          renderDetails(detailsEl, null);
          hideTooltip(tooltip);
          return;
        }
        if (key !== 'Enter' && key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        hideTooltip(tooltip);
        const id = d.data.id || d.data.code || d.data.name;
        localState.selectedId = id;
        syncClearButton(clearBtn, localState.selectedId);
        updateSelection(container, localState.selectedId);
        renderDetails(detailsEl, courseMap.get(id));
        revealDetailsOnStackedLayout(detailsEl);
      });

    tiles.attr('opacity', 1).attr('transform', 'translate(0, 0)');

    tiles
      .append('rect')
      .attr('class', 'cw-tile-rect')
      .attr('x', (d) => d.x0 + 3)
      .attr('y', (d) => d.y0 + 3)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0 - 6))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - 6))
      .attr('rx', 0)
      .attr('fill', (d) => ledgerTileFill(d.subject));

    tiles
      .append('rect')
      .attr('class', 'cw-tile-rule')
      .attr('x', (d) => d.x0 + 3)
      .attr('y', (d) => d.y0 + 3)
      .attr('width', 3)
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - 6))
      .attr('fill', (d) => colourFor(d.subject));

    const focused = Boolean(localState.focusedSubject);
    if (mount) {
      mount.classList.toggle('cw-focused', focused);
      mount.classList.toggle('cw-filtering', hasActiveFilter(localState));
    }

    tiles
      .append('text')
      .attr('class', 'cw-tile-label')
      .attr('x', (d) => d.x0 + labelInset)
      .attr('y', (d) => d.y0 + 18)
      .attr('clip-path', (d, i) => `url(#${clipId(d, i)})`)
      .attr('opacity', 0)
      .each(function (d) {
        const id = d.data.id || d.data.code || d.data.name;
        const meta = courseMap.get(id);
        if (!meta) return;

        const text = d3.select(this);
        const innerWidth = Math.max(0, d.x1 - d.x0 - labelInset * 2);
        const innerHeight = Math.max(0, d.y1 - d.y0 - labelInset * 2);
        const minLabelWidth = width < 520 ? 22 : 24;
        const minLabelHeight = width < 520 ? 16 : 18;
        if (innerWidth < minLabelWidth || innerHeight < minLabelHeight) return;

        text.attr('opacity', 1);
        renderTileLabel(text, meta, innerWidth, innerHeight, false);
      });

    svg.on('click', () => {
      hideTooltip(tooltip);
      localState.selectedId = null;
      syncClearButton(clearBtn, localState.selectedId);
      updateSelection(container, localState.selectedId);
      renderDetails(detailsEl, null);
    });

    return {
      visibleCount: tileNodes.length,
      subjectCount: subjects.length,
    };
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

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
