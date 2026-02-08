---
layout: default
title: Home
description: Automated banned product monitoring for regulatory agencies, manufacturers, importers, retailers, and non-profits. Stop wasting hours on manual marketplace searches and streamline your banned product management workflow.
---

<div class="hero-section">
  <div>
    <div class="section-kicker">Altitude Platform</div>
    <h1 class="hero-title">AI Powered Banned Product Monitoring</h1>
    <p class="hero-subtitle">
      Altitude turns scattered regulatory data into a coordinated monitoring workflow. Import banned product data, scan marketplaces,
      prioritize risk, and export compliance-ready reports—without the manual search grind.
    </p>
    <div class="hero-cta">
      <a href="{{ '/contact.html' | relative_url }}" class="btn-primary">Request Access</a>
      <a href="{{ '/contact.html' | relative_url }}" class="btn-secondary">View API Docs</a>
    </div>
  </div>
  <div class="hero-media">
    <img src="{{ '/assets/images/hero-abstract.svg' | relative_url }}" alt="Monitoring dashboard illustration">
  </div>
</div>

<div class="logo-strip">
  <span>Federal Agencies</span>
  <span>State Regulators</span>
  <span>Manufacturers</span>
  <span>Retailers</span>
  <span>Non‑Profits</span>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">Time Saved</div>
    <div class="stat-value">20+ hours/week</div>
    <p>Replace manual searches with automated investigations.</p>
  </div>
  <div class="stat-card">
    <div class="stat-label">Marketplaces</div>
    <div class="stat-value">6+ sources</div>
    <p>eBay, Amazon, Facebook Marketplace, Craigslist, OfferUp, Mercari.</p>
  </div>
  <div class="stat-card">
    <div class="stat-label">Coverage</div>
    <div class="stat-value">Import → Takedown</div>
    <p>Complete workflow with risk classification and reporting.</p>
  </div>
</div>


<div class="split-section section-surface">
  <div>
    <div class="section-kicker">Product</div>
    <h2>One platform, four critical workflows</h2>
    <p>
      Altitude brings compliance, investigation, and enforcement into a single workspace. Each workflow is designed to reduce
      manual triage and help teams focus on the highest-risk products first.
    </p>
  </div>
  <div class="split-card">
    <ul class="split-list">
      <li>Import structured banned product data from FDA, NHTSA, and state feeds.</li>
      <li>Schedule marketplace investigations across major platforms.</li>
      <li>Trigger alerts and risk classification as listings appear.</li>
      <li>Export takedown-ready evidence and compliance reports.</li>
    </ul>
  </div>
</div>

<h2>Complete Monitoring Workflow</h2>

<div class="workflow-section section-surface">
  <div class="workflow-dag" id="workflowDag"></div>

  <div class="workflow-mobile">
    <div class="workflow-mobile-step">
      <h4>Import & Normalize</h4>
      <p>Standardize banned product data, deduplicate sources, and prepare ingestion queues.</p>
      <div class="workflow-chip">AI Risk Classifier</div>
    </div>
    <div class="workflow-mobile-step">
      <h4>Investigate Marketplaces</h4>
      <p>AI matching and visual search across primary marketplaces, scheduled by risk.</p>
      <div class="workflow-chip">Agent Delegation</div>
    </div>
    <div class="workflow-mobile-step">
      <h4>Human + AI Review</h4>
      <p>Analysts supervise, validate, and reprioritize based on severity.</p>
      <div class="workflow-chip">Human Oversight</div>
    </div>
    <div class="workflow-mobile-step">
      <h4>Notify & Takedown</h4>
      <p>Export evidence, issue takedowns, and log compliance outcomes.</p>
      <div class="workflow-chip">Audit Trail</div>
    </div>
  </div>


  <div class="workflow-stage">
    <div class="workflow-label">Parallel Loop</div>
    <div>
      <div class="workflow-title">AI risk classification runs during ingestion</div>
      <p>As new banned products arrive, models score severity, hazards, and units affected—feeding priority queues before investigations begin.</p>
    </div>
  </div>

  <div class="workflow-stage">
    <div class="workflow-label">Delegation</div>
    <div>
      <div class="workflow-title">AI agents investigate with human command</div>
      <div class="workflow-duo">
        <div class="workflow-pill">Agents run broad marketplace scans, capture evidence, and surface matches for review.</div>
        <div class="workflow-pill">Analysts direct agent focus, validate findings, and coordinate takedown actions by risk.</div>
      </div>
    </div>
  </div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
  (function() {
    const data = {
      nodes: [
        { id: 'import', label: 'Import & Normalize', subtitle: 'Banned product ingestion', state: 'green', details: 'Normalize identifiers, deduplicate sources, and prepare ingestion queue.' },
        { id: 'risk', label: 'AI Risk Classifier', subtitle: 'Severity + hazard scoring', type: 'loop', state: 'yellow', details: 'Scores risk, flags high-severity hazards, feeds priority queues.' },
        { id: 'investigate', label: 'Investigate Marketplaces', subtitle: 'AI matching + visual search', state: 'yellow', details: 'Marketplace crawls, similarity matching, and listing capture.' },
        { id: 'agents', label: 'AI Agent Delegation', subtitle: 'Parallel investigations', type: 'branch', state: 'green', details: 'Agents run targeted investigations with human supervision.' },
        { id: 'review', label: 'Human + AI Review', subtitle: 'Supervision + reprioritization', state: 'yellow', details: 'Analysts validate evidence and reprioritize by severity.' },
        { id: 'takedown', label: 'Notify & Takedown', subtitle: 'Evidence + compliance export', state: 'red', details: 'Issue takedowns, notify stakeholders, archive audit trail.' }
      ],
      links: [
        { source: 'import', target: 'risk', type: 'active' },
        { source: 'import', target: 'investigate', type: 'main' },
        { source: 'risk', target: 'import', type: 'loop' },
        { source: 'investigate', target: 'agents', type: 'active' },
        { source: 'agents', target: 'review', type: 'main' },
        { source: 'review', target: 'takedown', type: 'main' }
      ]
    };

    const container = document.getElementById('workflowDag');
    if (!container || !window.d3) return;

    const width = Math.min(container.clientWidth, 1000);
    const height = 360;
    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Workflow DAG showing AI risk loop and agent delegation');

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8a96a3');

    const positions = {
      import: { x: 90, y: 140 },
      risk: { x: 90, y: 50 },
      investigate: { x: 340, y: 140 },
      agents: { x: 590, y: 70 },
      review: { x: 590, y: 220 },
      takedown: { x: 860, y: 140 }
    };

    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'dag-tooltip');

    tooltip.append('div')
      .attr('class', 'dag-tooltip-card')
      .html('<div class="dag-tooltip-title"></div><div class="dag-tooltip-text"></div>');

    const linkGroup = svg.append('g');
    linkGroup.selectAll('path')
      .data(data.links)
      .enter()
      .append('path')
      .attr('class', d => `dag-link ${d.type === 'active' ? 'active' : ''} ${d.type === 'loop' ? 'loop' : ''}`)
      .attr('marker-end', 'url(#arrow)')
      .attr('d', d => {
        const s = positions[d.source];
        const t = positions[d.target];
        const midX = (s.x + t.x) / 2;
        return `M ${s.x} ${s.y} C ${midX} ${s.y}, ${midX} ${t.y}, ${t.x} ${t.y}`;
      });

    const nodeGroup = svg.append('g');
    const node = nodeGroup.selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${positions[d.id].x - 90}, ${positions[d.id].y - 36})`)
      .on('mouseenter', function(event, d) {
        d3.select(this).select('rect').classed('highlight', true);
        tooltip.classed('show', true);
        tooltip.select('.dag-tooltip-title').text(d.label);
        tooltip.select('.dag-tooltip-text').text(d.details);
      })
      .on('mousemove', function(event) {
        const bounds = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - bounds.left + 16}px`);
        tooltip.style('top', `${event.clientY - bounds.top + 16}px`);
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect').classed('highlight', false);
        tooltip.classed('show', false);
      });

    node.append('rect')
      .attr('class', d => `dag-node state-${d.state}`)
      .attr('width', 180)
      .attr('height', 72)
      .attr('rx', 12);

    node.append('text')
      .attr('class', 'dag-label')
      .attr('x', 16)
      .attr('y', 28)
      .text(d => d.label);

    node.append('text')
      .attr('class', 'dag-subtitle')
      .attr('x', 16)
      .attr('y', 48)
      .text(d => d.subtitle);

    node.filter(d => d.type === 'loop' || d.type === 'branch')
      .append('rect')
      .attr('class', 'dag-pill')
      .attr('x', 16)
      .attr('y', 52)
      .attr('width', 120)
      .attr('height', 16)
      .attr('rx', 999);

    node.filter(d => d.type === 'loop' || d.type === 'branch')
      .append('text')
      .attr('class', 'dag-pill-text')
      .attr('x', 24)
      .attr('y', 64)
      .text(d => (d.type === 'loop' ? 'Feedback Loop' : 'Parallel'));
  })();
</script>


<h2>Product Capabilities</h2>

<div class="feature-row">
  <div>
    <div class="icon-chip"><i class="fas fa-satellite-dish"></i></div>
    <h3>Automated Monitoring</h3>
    <p>Continuously scan marketplaces with configurable cadence, visual search, and keyword matching.</p>
  </div>
  <div>
    <ul>
      <li>Daily, weekly, or monthly investigations</li>
      <li>Marketplace coverage across major platforms</li>
      <li>Automated listing discovery and evidence capture</li>
    </ul>
  </div>
</div>

<div class="feature-row">
  <div>
    <div class="icon-chip"><i class="fas fa-triangle-exclamation"></i></div>
    <h3>Risk Intelligence</h3>
    <p>Rank banned products by severity so teams can act on high-risk items first.</p>
  </div>
  <div>
    <ul>
      <li>Automated HIGH/MEDIUM/LOW classification</li>
      <li>Hazard-based prioritization</li>
      <li>Risk analytics and exportable reports</li>
    </ul>
  </div>
</div>

<div class="feature-row">
  <div>
    <div class="icon-chip"><i class="fas fa-plug-circle-bolt"></i></div>
    <h3>API & Integrations</h3>
    <p>Connect Altitude to internal systems, automation scripts, or compliance workflows.</p>
  </div>
  <div>
    <ul>
      <li>REST API and MCP server support</li>
      <li>Webhook-based notifications</li>
      <li>Batch import/export pipelines</li>
    </ul>
  </div>
</div>

<h2>Who Altitude Serves</h2>

<div class="feature-row">
  <div>
    <h3>Regulatory Agencies</h3>
    <p>Coordinate banned product surveillance across jurisdictions with a single, auditable workflow.</p>
  </div>
  <div>
    <ul>
      <li>Federal and state banned product ingestion</li>
      <li>Evidence capture for enforcement</li>
      <li>Compliance-ready reporting</li>
    </ul>
  </div>
</div>

<div class="feature-row">
  <div>
    <h3>Manufacturers & Importers</h3>
    <p>Detect unauthorized listings and prove corrective actions with structured audit trails.</p>
  </div>
  <div>
    <ul>
      <li>Marketplace scan scheduling</li>
      <li>Takedown tracking and escalation</li>
      <li>Risk-based prioritization</li>
    </ul>
  </div>
</div>

<div class="feature-row">
  <div>
    <h3>Retailers & Marketplaces</h3>
    <p>Prevent non-compliant inventory from reaching customers and reduce exposure.</p>
  </div>
  <div>
    <ul>
      <li>Bulk listing review</li>
      <li>Automated alerting for high-risk items</li>
      <li>Operational handoff to compliance teams</li>
    </ul>
  </div>
</div>

<div class="feature-row">
  <div>
    <h3>Non‑Profits & Watchdogs</h3>
    <p>Expand monitoring capacity without expanding headcount.</p>
  </div>
  <div>
    <ul>
      <li>Multi-marketplace visibility</li>
      <li>Shareable reports for stakeholders</li>
      <li>Trend insights over time</li>
    </ul>
  </div>
</div>

<h2>Risk Classification You Can Act On</h2>

Altitude classifies imported banned products across a low‑to‑high hazard spectrum using the most accurate AI models available, factoring in severity signals, hazards, and units affected. The result is a prioritized queue that aligns investigations and takedown actions to the highest‑risk products first while keeping lower‑risk items visible and auditable.

<div class="risk-viz" id="riskViz">
  <div class="risk-tooltip" id="riskVizTooltip" aria-hidden="true">
    <div class="risk-tooltip-card">
      <div class="risk-tooltip-title" id="riskVizTooltipTitle">Classifying…</div>
      <div class="risk-tooltip-body" id="riskVizTooltipBody">Ingesting banned products and scoring hazard risk.</div>
      <div class="risk-chip" id="riskVizTooltipChip">Random Forest Model</div>
    </div>
  </div>
</div>

<script>
  (function () {
    const container = document.getElementById('riskViz');
    if (!container || !window.d3) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tooltipEl = document.getElementById('riskVizTooltip');
    const tooltipTitleEl = document.getElementById('riskVizTooltipTitle');
    const tooltipBodyEl = document.getElementById('riskVizTooltipBody');

    const RISK = {
      low: {
        key: 'low',
        title: '● LOW RISK',
        bodyHtml:
          'Banned products with no injuries and fewer than 1,000 units affected. Minor defects, labeling issues. ' +
          '<strong>Action:</strong> Monthly investigations or manual searches when needed.'
      },
      medium: {
        key: 'medium',
        title: '● MEDIUM RISK',
        bodyHtml:
          'Banned products with minor injuries or 1,000-10,000 units affected. Hazards include cuts, burns, falls, tip-over. ' +
          '<strong>Action:</strong> Weekly or biweekly investigations usually sufficient.'
      },
      high: {
        key: 'high',
        title: '● HIGH RISK',
        bodyHtml:
          'Banned products with deaths, serious injuries, or 10,000+ units affected. Hazards include fire, electrocution, choking, lead poisoning, strangulation. ' +
          '<strong>Action:</strong> Schedule daily investigations immediately.'
      },
      critical: {
        key: 'critical',
        title: '● SEVERE / CRITICAL',
        bodyHtml:
          'Banned products indicating imminent harm or catastrophic outcomes (e.g., multiple deaths or life-threatening hazards). ' +
          '<strong>Action:</strong> Immediate investigation, rapid takedown coordination, and continuous monitoring until resolved.'
      }
    };

    const riskKeys = [RISK.low, RISK.medium, RISK.high, RISK.critical];

    function showTooltip(risk) {
      if (!tooltipEl || !tooltipTitleEl || !tooltipBodyEl) return;
      tooltipTitleEl.textContent = risk.title;
      tooltipBodyEl.innerHTML = risk.bodyHtml;
      tooltipEl.classList.add('show');
      tooltipEl.setAttribute('aria-hidden', 'false');
    }

    function hideTooltip() {
      if (!tooltipEl) return;
      tooltipEl.classList.remove('show');
      tooltipEl.setAttribute('aria-hidden', 'true');
    }

    const svg = window.d3
      .select(container)
      .append('svg')
      .attr('viewBox', '0 0 1000 420')
      .attr('role', 'img')
      .attr('aria-label', 'Animated random forest risk classifier for ingested banned products');

    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'riskArrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8a96a3');

    const layout = {
      ingest: { x: 120, y: 170, w: 170, h: 86 },
      forest: { x: 330, y: 90, w: 360, h: 240 },
      buckets: {
        low: { x: 740, y: 70 },
        medium: { x: 740, y: 155 },
        high: { x: 740, y: 240 },
        critical: { x: 740, y: 325 }
      }
    };

    svg
      .append('text')
      .attr('class', 'rf-label')
      .attr('x', layout.ingest.x)
      .attr('y', layout.ingest.y - 18)
      .text('Ingestion');

    svg
      .append('rect')
      .attr('x', layout.ingest.x)
      .attr('y', layout.ingest.y)
      .attr('width', layout.ingest.w)
      .attr('height', layout.ingest.h)
      .attr('rx', 16)
      .attr('class', 'risk-bucket')
      .attr('opacity', 0.9);

    svg
      .append('text')
      .attr('x', layout.ingest.x + 16)
      .attr('y', layout.ingest.y + 34)
      .attr('class', 'risk-bucket-label')
      .text('Import');

    svg
      .append('text')
      .attr('x', layout.ingest.x + 16)
      .attr('y', layout.ingest.y + 56)
      .attr('class', 'risk-bucket-sub')
      .text('Banned products');

    svg
      .append('text')
      .attr('class', 'rf-label')
      .attr('x', layout.forest.x)
      .attr('y', layout.forest.y - 18)
      .text('Random Forest Model');

    svg
      .append('rect')
      .attr('x', layout.forest.x)
      .attr('y', layout.forest.y)
      .attr('width', layout.forest.w)
      .attr('height', layout.forest.h)
      .attr('rx', 18)
      .attr('class', 'risk-bucket')
      .attr('opacity', 0.8);

    // Primary pipeline arrow: Ingest -> Forest
    svg
      .append('path')
      .attr('class', 'rf-link')
      .attr('marker-end', 'url(#riskArrow)')
      .attr(
        'd',
        `M ${layout.ingest.x + layout.ingest.w} ${layout.ingest.y + layout.ingest.h / 2} ` +
          `C ${layout.ingest.x + layout.ingest.w + 70} ${layout.ingest.y + layout.ingest.h / 2}, ` +
          `${layout.forest.x - 70} ${layout.forest.y + layout.forest.h / 2}, ` +
          `${layout.forest.x} ${layout.forest.y + layout.forest.h / 2}`
      );

    // Forest -> buckets fan-out
    const bucketRects = {};
    const bucketGroup = svg.append('g');
    riskKeys.forEach((risk) => {
      const b = layout.buckets[risk.key];
      bucketRects[risk.key] = bucketGroup
        .append('rect')
        .attr('x', b.x)
        .attr('y', b.y)
        .attr('width', 220)
        .attr('height', 64)
        .attr('rx', 16)
        .attr('class', `risk-bucket ${risk.key}`)
        .on('mouseenter', () => showTooltip(risk))
        .on('mouseleave', () => hideTooltip());

      bucketGroup
        .append('text')
        .attr('x', b.x + 16)
        .attr('y', b.y + 28)
        .attr('class', 'risk-bucket-label')
        .text(risk.title.replace('● ', ''));

      bucketGroup
        .append('text')
        .attr('x', b.x + 16)
        .attr('y', b.y + 48)
        .attr('class', 'risk-bucket-sub')
        .text('Priority queue');

      svg
        .append('path')
        .attr('class', 'rf-link')
        .attr('marker-end', 'url(#riskArrow)')
        .attr(
          'd',
          `M ${layout.forest.x + layout.forest.w} ${layout.forest.y + layout.forest.h / 2} ` +
            `C ${layout.forest.x + layout.forest.w + 40} ${layout.forest.y + layout.forest.h / 2}, ` +
            `${b.x - 40} ${b.y + 32}, ` +
            `${b.x} ${b.y + 32}`
        );
    });

    // Draw a small forest: 4 simplified trees
    const forestGroup = svg.append('g').attr('transform', `translate(${layout.forest.x + 26}, ${layout.forest.y + 24})`);
    const trees = [];

    function makeTree(originX, originY) {
      // Fixed tiny decision tree layout (root -> 2 -> 4 leaves)
      const nodes = [
        { id: 'r', x: originX, y: originY },
        { id: 'a', x: originX - 34, y: originY + 56 },
        { id: 'b', x: originX + 34, y: originY + 56 },
        { id: 'a1', x: originX - 54, y: originY + 112 },
        { id: 'a2', x: originX - 14, y: originY + 112 },
        { id: 'b1', x: originX + 14, y: originY + 112 },
        { id: 'b2', x: originX + 54, y: originY + 112 }
      ];
      const links = [
        ['r', 'a'],
        ['r', 'b'],
        ['a', 'a1'],
        ['a', 'a2'],
        ['b', 'b1'],
        ['b', 'b2']
      ];
      return { nodes, links };
    }

    const treeOrigins = [
      { x: 70, y: 28 },
      { x: 155, y: 28 },
      { x: 240, y: 28 },
      { x: 325, y: 28 }
    ];

    treeOrigins.forEach((o, idx) => {
      const t = makeTree(o.x, o.y);
      const g = forestGroup.append('g').attr('data-tree', String(idx));
      const nodeById = new Map(t.nodes.map((n) => [n.id, n]));
      const linkSel = g
        .selectAll('path')
        .data(t.links)
        .enter()
        .append('path')
        .attr('class', 'rf-link')
        .attr('d', ([s, d]) => {
          const a = nodeById.get(s);
          const b = nodeById.get(d);
          return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        });

      const nodeSel = g
        .selectAll('circle')
        .data(t.nodes)
        .enter()
        .append('circle')
        .attr('class', 'rf-node')
        .attr('r', 5)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);

      trees.push({ g, nodes: t.nodes, links: t.links, nodeSel, linkSel });
    });

    const productLayer = svg.append('g');
    let tokenCounter = 0;
    let tooltipOwner = 0;
    let activeTreeOwner = 0;

    function pickRisk() {
      // Bias toward lower risk but allow spikes.
      const r = Math.random();
      if (r < 0.55) return RISK.low;
      if (r < 0.8) return RISK.medium;
      if (r < 0.95) return RISK.high;
      return RISK.critical;
    }

    function setActiveTree(treeIndex, on) {
      trees.forEach((t, idx) => {
        const active = on && idx === treeIndex;
        t.nodeSel.classed('active', active);
        t.linkSel.classed('active', active);
      });
    }

    function flashBucket(riskKey) {
      const rect = bucketRects[riskKey];
      if (!rect) return;
      rect.interrupt();
      rect
        .transition()
        .duration(120)
        .attr('stroke-width', 3)
        .transition()
        .duration(220)
        .attr('stroke-width', 1.5);
    }

    function spawnProduct() {
      const chosenRisk = pickRisk();
      const treeIndex = Math.floor(Math.random() * trees.length);
      const token = ++tokenCounter;

      const entry = { x: 40, y: 213 + (Math.random() * 40 - 20) };
      const ingest = { x: layout.ingest.x + 26, y: layout.ingest.y + layout.ingest.h / 2 };
      const forestRoot = {
        x: layout.forest.x + 26 + treeOrigins[treeIndex].x,
        y: layout.forest.y + 24 + treeOrigins[treeIndex].y
      };
      const forestLeaf = {
        x: forestRoot.x + (Math.random() > 0.5 ? 54 : -54),
        y: forestRoot.y + 112
      };
      const bucket = layout.buckets[chosenRisk.key];
      const bucketPoint = { x: bucket.x + 18, y: bucket.y + 32 };

      const dot = productLayer
        .append('circle')
        .attr('class', 'risk-product')
        .attr('r', 6)
        .attr('fill', 'currentColor')
        .attr('cx', entry.x)
        .attr('cy', entry.y);

      // Color the product by current risk prediction.
      const riskFill = {
        low: '#2aa86f',
        medium: '#d39b3b',
        high: '#e06b2d',
        critical: '#d24a4a'
      }[chosenRisk.key];
      dot.attr('fill', riskFill);

      if (!prefersReducedMotion) {
        dot
          .transition()
          .duration(700)
          .ease(window.d3.easeCubicOut)
          .attr('cx', ingest.x)
          .attr('cy', ingest.y)
          .transition()
          .duration(850)
          .ease(window.d3.easeCubicInOut)
          .attr('cx', forestRoot.x)
          .attr('cy', forestRoot.y)
          .on('start', () => {
            activeTreeOwner = token;
            tooltipOwner = token;
            setActiveTree(treeIndex, true);
            showTooltip(chosenRisk);
          })
          .transition()
          .duration(850)
          .ease(window.d3.easeCubicInOut)
          .attr('cx', forestLeaf.x)
          .attr('cy', forestLeaf.y)
          .transition()
          .duration(950)
          .ease(window.d3.easeCubicInOut)
          .attr('cx', bucketPoint.x)
          .attr('cy', bucketPoint.y)
          .on('end', () => {
            if (activeTreeOwner === token) setActiveTree(-1, false);
            flashBucket(chosenRisk.key);
            if (tooltipOwner === token) hideTooltip();
            dot.remove();
          });
      }
    }

    if (prefersReducedMotion) {
      // Static: show a default tooltip and skip animation.
      showTooltip(RISK.medium);
      return;
    }

    // Drive an animation cycle with a 30s loop.
    const LOOP_MS = 30000;
    const SPAWN_MS = 1600;
    let cycleStart = performance.now();

    function cycleTick(now) {
      if (now - cycleStart > LOOP_MS) {
        cycleStart = now;
        productLayer.selectAll('*').remove();
        setActiveTree(-1, false);
        hideTooltip();
      }
    }

    window.d3.interval(() => spawnProduct(), SPAWN_MS);
    window.d3.timer((now) => cycleTick(now));
  })();
</script>

<h2>Roadmap Priorities</h2>

<div class="section-surface roadmap-section">
  <div class="roadmap-grid">
    <div class="roadmap-card blue">
      <div class="icon-chip"><i class="fas fa-bullhorn"></i></div>
      <h3>Public Submission API</h3>
      <p><strong>Open intake</strong> for external tip lines and watchdog reporting, routed into the review queue with audit trails.</p>
    </div>

    <div class="roadmap-card blue">
      <div class="icon-chip"><i class="fas fa-search"></i></div>
      <h3>Browser Extension</h3>
      <p><strong>One‑click capture</strong> while browsing marketplaces, sending evidence directly into takedown workflows.</p>
    </div>

    <div class="roadmap-card blue">
      <div class="icon-chip"><i class="fas fa-camera"></i></div>
      <h3>Mobile Field Toolkit</h3>
      <p><strong>On‑site scanning</strong> for inspectors: photo capture, barcode checks, and instant risk matching.</p>
    </div>
  </div>

  <div class="premium-features-cta">
    <p>
      Interested in early access or shaping the roadmap?
    </p>
    <a href="{{ '/contact.html' | relative_url }}" class="btn-primary">Contact Us</a>
  </div>
</div>
