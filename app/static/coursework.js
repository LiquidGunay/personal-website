// Zoomable circle packing visualization for coursework
(function () {
  const el = document.getElementById('cw-viz');
  if (!el) return;

  // Styles scoped to the viz
  const style = document.createElement('style');
  style.textContent = `
    .cw { position: relative; width: 100%; max-width: 900px; margin: 1rem 0; }
    .cw svg { width: 100%; height: auto; display: block; }
    .cw .label { fill: currentColor; font: 12px/1.2 var(--font-sans); text-anchor: middle; pointer-events: none; }
    .cw .node { cursor: pointer; }
    .cw .node:hover { filter: brightness(1.1); }
    .cw .tooltip { position: absolute; pointer-events: none; background: color-mix(in oklab, var(--bg) 85%, #000 15%); color: var(--fg); border: 1px solid var(--border); padding: .35rem .5rem; border-radius: .375rem; font-size: .9rem; white-space: nowrap; transform: translate(-50%, -120%); }
  `;
  document.head.appendChild(style);

  fetch('/static/courses.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((data) => render(data))
    .catch((err) => {
      el.textContent = 'Failed to load visualization.';
      console.error(err);
    });

  function render(data) {
    const width = Math.min(900, el.clientWidth || 900);
    const height = width; // square viewport

    const color = d3.scaleLinear().domain([0, 5]).range(["#8ec5ff", "#3b82f6"]).interpolate(d3.interpolateHcl);

    const pack = d3
      .pack()
      .size([width, height])
      .padding(3);

    const root = d3
      .hierarchy(data)
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const nodes = pack(root).descendants();

    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', [0, 0, width, height])
      .attr('aria-label', 'Zoomable circle packing of coursework');

    const g = svg.append('g');
    let focus = root;
    let view;

    const circle = g
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', (d) => (d.parent ? (d.children ? 'node' : 'node node--leaf') : 'node node--root'))
      .style('fill', (d) => (d.children ? color(d.depth) : 'color-mix(in oklab, var(--accent) 60%, var(--bg) 40%)'))
      .on('click', (event, d) => (focus !== d ? (zoom(event, d), event.stopPropagation()) : null));

    const label = g
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .style('fill-opacity', (d) => (d.parent === root ? 1 : 0))
      .style('display', (d) => (d.parent === root ? 'inline' : 'none'))
      .text((d) => d.data.name);

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    el.appendChild(tooltip);

    svg.on('click', (event) => zoom(event, root));

    // Hover tooltip for leaf nodes
    circle
      .on('mousemove', (event, d) => {
        if (d.children) {
          tooltip.style.display = 'none';
          return;
        }
        const pt = d3.pointer(event, el);
        tooltip.textContent = d.data.name;
        tooltip.style.left = pt[0] + 'px';
        tooltip.style.top = pt[1] + 'px';
        tooltip.style.display = 'block';
      })
      .on('mouseleave', () => {
        tooltip.style.display = 'none';
      });

    zoomTo([root.x, root.y, root.r * 2]);

    function zoomTo(v) {
      const k = width / v[2];
      view = v;
      label.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      circle.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      circle.attr('r', (d) => d.r * k);
    }

    function zoom(event, d) {
      focus = d;

      const transition = svg.transition().duration(event?.altKey ? 10000 : 700).tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return (t) => zoomTo(i(t));
      });

      label
        .filter(function (n) {
          return n.parent === focus || this.style.display === 'inline';
        })
        .transition(transition)
        .style('fill-opacity', (n) => (n.parent === focus ? 1 : 0))
        .on('start', function (n) {
          if (n.parent === focus) this.style.display = 'inline';
        })
        .on('end', function (n) {
          if (n.parent !== focus) this.style.display = 'none';
        });
    }

    // Build a simple non-JS fallback list if <noscript> content placeholder exists
    const fallbackEl = document.getElementById('cw-fallback');
    if (fallbackEl) {
      const parts = [];
      for (const cat of data.children || []) {
        parts.push(`<h3>${cat.name}</h3>`);
        parts.push('<ul>');
        for (const c of cat.children || []) parts.push(`<li>${c.name}</li>`);
        parts.push('</ul>');
      }
      fallbackEl.innerHTML = parts.join('');
    }
  }
})();

