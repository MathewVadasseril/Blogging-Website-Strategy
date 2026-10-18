// Customisations for the /admin editor (Sveltia CMS):
//  1. Widgets that can be inserted into any rich-text field from the toolbar's "+" menu.
//  2. Previews that show the entry inside the real website design.

/* ------------------------------------------------------------------ 1. Toolbar widgets
   Each widget is saved in the Markdown as a fenced block the website knows how to draw:

     ```msv-block
     {"type":"callout","heading":"The Analogy","text":"..."}
     ```
*/
const fence = data => '```msv-block\n' + JSON.stringify(data) + '\n```';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A compact card shown inside the editor where the widget sits in the text.
const editorCard = (title, lines) => `
  <div style="border:1px solid #fdba74;background:#fff7ed;color:#1c1b19;border-radius:12px;padding:10px 14px;font:14px/1.5 system-ui,sans-serif">
    <div style="font-weight:600;color:#c2410c;margin-bottom:4px">${escapeHtml(title)}</div>
    ${lines.filter(Boolean).map(l => `<div>${escapeHtml(l)}</div>`).join('')}
  </div>`;

// Formatted text box with a compact toolbar (bold, italic, strikethrough, link, code).
const richText = (name, label) => ({
  name, label, widget: 'markdown', minimal: true,
  buttons: ['bold', 'italic', 'strikethrough', 'link', 'code'], editor_components: [],
});

const iconField = (fallback, label = 'Icon (Font Awesome name, e.g. fa-bolt)') =>
  ({ name: 'icon', label, widget: 'string', required: false, default: fallback });

const WIDGETS = [
  {
    id: 'callout', label: 'Callout box',
    fields: [
      { name: 'heading', label: 'Label', widget: 'string', required: false, default: 'The Analogy' },
      iconField('fa-comment-dots'),
      richText('text', 'Text'),
    ],
    summary: d => [d.heading, d.text],
  },
  {
    id: 'cards', label: 'Cards',
    fields: [{
      name: 'items', label: 'Cards', label_singular: 'Card', widget: 'list',
      fields: [iconField('fa-bolt'), { name: 'title', label: 'Title', widget: 'string' }, richText('text', 'Text')],
    }],
    summary: d => (d.items || []).map(i => `• ${i.title ?? ''}`),
  },
  {
    id: 'table', label: 'Table',
    fields: [
      { name: 'title', label: 'Table title', widget: 'string', required: false },
      { name: 'headers', label: 'Column headers', widget: 'list', field: { name: 'header', label: 'Header', widget: 'string' } },
      { name: 'rows', label: 'Rows (separate cells with |)', widget: 'list', field: { name: 'row', label: 'Row', widget: 'string' } },
    ],
    summary: d => [d.title, (d.headers || []).join(' | '), `${(d.rows || []).length} rows`],
  },
  {
    id: 'metrics', label: 'Number tiles',
    fields: [{
      name: 'items', label: 'Tiles', label_singular: 'Tile', widget: 'list',
      fields: [{ name: 'value', label: 'Number (e.g. $95, 250+)', widget: 'string' }, { name: 'label', label: 'Label', widget: 'string' }],
    }],
    summary: d => [(d.items || []).map(i => `${i.value ?? ''} ${i.label ?? ''}`).join('  ·  ')],
  },
  {
    id: 'timeline', label: 'Timeline',
    fields: [
      { name: 'title', label: 'Heading', widget: 'string', required: false },
      {
        name: 'steps', label: 'Steps', label_singular: 'Step', widget: 'list',
        fields: [{ name: 'phase', label: 'Step title', widget: 'string' }, richText('text', 'Description')],
      },
    ],
    summary: d => [d.title, ...(d.steps || []).map((s, i) => `${i + 1}. ${s.phase ?? ''}`)],
  },
  {
    id: 'listbox', label: 'List box',
    fields: [
      { name: 'title', label: 'Heading', widget: 'string', required: false },
      iconField('fa-check', 'Bullet icon (Font Awesome name)'),
      { name: 'items', label: 'Items', widget: 'list', field: richText('item', 'Item') },
    ],
    summary: d => [d.title, ...(d.items || []).map(i => `✓ ${i}`)],
  },
];

for (const w of WIDGETS) {
  CMS.registerEditorComponent({
    id: `msv-${w.id}`,
    label: w.label,
    fields: w.fields,
    // Matches a fence whose JSON starts with this widget's type.
    pattern: new RegExp('^```msv-block\\n(\\{"type":"' + w.id + '"[^\\n]*)\\n```$', 'm'),
    fromBlock: match => {
      try { const { type, ...data } = JSON.parse(match[1]); return data; } catch (_) { return {}; }
    },
    toBlock: data => fence({ type: w.id, ...data }),
    toPreview: data => editorCard(w.label, w.summary(data || {})),
  });
}

/* ------------------------------------------------------------------ 2. Real-site previews
   The preview pane loads the website at index.html#preview and sends it the entry being
   edited, so what you see is exactly what readers will see. */
const SITE_URL = new URL('../index.html#preview', location.href).href;

// Swap image paths for addresses the preview can load, including images not yet saved.
function resolveImages(value, getAsset) {
  if (Array.isArray(value)) return value.map(v => resolveImages(v, getAsset));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => {
      if (k === 'image' && typeof v === 'string' && v && getAsset) {
        try {
          const url = String(getAsset(v) ?? '');
          if (url && !url.startsWith('[object')) return [k, url];
        } catch (_) { /* keep the original path */ }
      }
      return [k, resolveImages(v, getAsset)];
    }));
  }
  return value;
}

const sitePreview = kind => createClass({
  componentDidMount() { this.send(); },
  componentDidUpdate() { this.send(); },
  send() {
    const frame = this.frame;
    if (!frame || !this.loaded) return;
    let data = {};
    try {
      const raw = this.props.entry.getIn(['data']);
      data = raw && raw.toJS ? raw.toJS() : (raw || {});
    } catch (_) { /* leave empty */ }
    frame.contentWindow.postMessage({ type: 'msv-preview', kind, data: resolveImages(data, this.props.getAsset) }, location.origin);
  },
  render() {
    return h('iframe', {
      src: SITE_URL,
      title: 'Preview of the live site',
      ref: el => { this.frame = el; },
      onLoad: () => { this.loaded = true; this.send(); },
      style: { width: '100%', height: '100vh', border: 0, display: 'block' },
    });
  },
});

// Let the site fill the whole preview pane: no padding or white page around it.
CMS.registerPreviewStyle(`
  html, body { margin: 0; height: 100%; background: transparent !important; }
  body > div, [role="document"] { padding: 0 !important; height: 100%; }
`, { raw: true });

CMS.registerPreviewTemplate('posts', sitePreview('posts'));
CMS.registerPreviewTemplate('booklets', sitePreview('booklets'));
CMS.registerPreviewTemplate('site', sitePreview('settings'));

/* ------------------------------------------------------------------ 3. Bracketed notes
   Text in brackets in a field's name, such as "Icon (Font Awesome name, e.g. fa-bolt)",
   is shown smaller in a quieter style (see .apt-aside in editor.css) so the main label
   stands out. Only field names are touched: not headers, menus or anything you type. */
const ASIDE_SCOPE = 'section.field > header h4';
const HAS_BRACKETS = /\([^()]*\)/;
const added = new WeakMap();    // split text node -> the nodes added after it
const ownText = new WeakMap();  // split text node -> the text this script left in it

function splitBrackets(textNode) {
  added.get(textNode)?.forEach(n => n.remove());
  added.delete(textNode);
  ownText.delete(textNode);
  const text = textNode.data;
  if (!HAS_BRACKETS.test(text)) return;
  const parts = text.split(/(\([^()]*\))/).filter(Boolean);
  const nodes = parts.slice(1).map(part => {
    if (part.startsWith('(') && part.endsWith(')')) {
      const span = document.createElement('span');
      span.className = 'apt-aside';
      span.textContent = part;
      return span;
    }
    const t = document.createTextNode(part);
    t.aptAdded = true;
    return t;
  });
  textNode.data = parts[0];
  textNode.after(...nodes);
  added.set(textNode, nodes);
  ownText.set(textNode, parts[0]);
}

function styleBrackets() {
  for (const scope of document.querySelectorAll(ASIDE_SCOPE)) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.aptAdded || added.has(n) || n.parentElement?.closest('.apt-aside, input, textarea, [contenteditable="true"]')) continue;
      nodes.push(n);
    }
    nodes.forEach(splitBrackets);
  }
}

// If Sveltia redraws a label's text, re-split it; ignore the changes this script makes itself.
const changed = new Set();
let queued = false;
const asideObserver = new MutationObserver(records => {
  for (const r of records) {
    if (r.type === 'characterData' && added.has(r.target) && r.target.data !== ownText.get(r.target)) changed.add(r.target);
  }
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    asideObserver.disconnect();
    changed.forEach(n => (n.isConnected ? splitBrackets(n) : added.get(n)?.forEach(x => x.remove())));
    changed.clear();
    styleBrackets();
    asideObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
});
asideObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
