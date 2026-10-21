// Precompute graph positions at build time, so the browser can draw the network instantly
// instead of running the force layout on every visit.
//
// Two layouts are stored: the default view ("Official sources only", all graph types, no theme or year
// filter) and the full network. The app uses a preset when the visible set matches one of them, and
// otherwise starts the force layout from these positions so it settles quickly.
// Results are cached in .cache/layout.json keyed by the graph's shape, so `npm run dev` rebuilds stay fast.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './lib.mjs';

// keep in sync with layoutGraph() in site/assets/app.js
const FCOSE = {
  name: 'fcose', quality: 'proof', randomize: true, animate: false, fit: true, padding: 40,
  nodeRepulsion: () => 9000, idealEdgeLength: () => 75, edgeElasticity: () => 0.4,
  gravity: 0.3, gravityRangeCompound: 1.5, numIter: 3000, nodeSeparation: 90, packComponents: true, tile: true,
  tilingPaddingVertical: 38, tilingPaddingHorizontal: 90,
};

export async function computeLayouts(entities, edges, adjDegree) {
  const nodes = entities.filter(e => e.type !== 'record' && e.type !== 'news');
  const ids = new Set(nodes.map(e => e.id));
  const links = edges.filter(x => x.kind !== 'mention' && ids.has(x.s) && ids.has(x.t));
  const sets = {
    official: new Set(nodes.filter(e => e.cred !== 'outside').map(e => e.id)),
    all: ids,
  };
  const key = crypto.createHash('sha1')
    .update(JSON.stringify([nodes.map(e => [e.id, e.cred === 'outside', adjDegree(e.id)]), links.map(x => [x.s, x.t])]))
    .digest('hex');
  const cacheFile = path.join(ROOT, '.cache', 'layout.json');
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (cached.key === key) return cached.layouts;
  } catch { /* no cache yet */ }

  let cytoscape, fcose;
  try {
    cytoscape = (await import('cytoscape')).default;
    fcose = (await import('cytoscape-fcose')).default;
  } catch {
    return null; // layout libraries not installed: the app falls back to laying out in the browser
  }
  cytoscape.use(fcose);
  const layouts = {};
  for (const [name, set] of Object.entries(sets)) {
    const cy = cytoscape({
      headless: true, styleEnabled: true,
      style: [{ selector: 'node', style: { width: 'data(size)', height: 'data(size)' } }],
      elements: [
        ...nodes.filter(e => set.has(e.id)).map(e => ({ data: { id: e.id, size: Math.min(48, 12 + Math.sqrt(adjDegree(e.id)) * 6) } })),
        ...links.filter(x => set.has(x.s) && set.has(x.t)).map((x, i) => ({ data: { id: 'e' + i, source: x.s, target: x.t } })),
      ],
    });
    cy.layout(FCOSE).run();
    layouts[name] = Object.fromEntries(cy.nodes().map(n => { const p = n.position(); return [n.id(), [Math.round(p.x), Math.round(p.y)]]; }));
  }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify({ key, layouts }));
  return layouts;
}
