/*
 * Runs the exact CRM/picker/config functions extracted from a published bundle.
 * React elements are genuine react/jsx-runtime elements. Hooks, geometry and
 * providers are local test adapters; this is not a DOM/browser/auth test.
 * No full bundle execution, API, persistent storage or save operation occurs.
 */
'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const dependencyRequire = require('node:module').createRequire(require('node:path').resolve(__dirname, '../package.json'));
const parser = dependencyRequire('@babel/parser');
const traverse = dependencyRequire('@babel/traverse').default;
const jsxRuntime = dependencyRequire('react/jsx-runtime');
const React = dependencyRequire('react');

const bundlePath = process.argv[2];
if (!bundlePath) throw new Error('Usage: node scripts/test-pipeline-trigger-entrypoints.cjs <bundle> [--expect-broken]');
const expectBroken = process.argv.includes('--expect-broken');
const code = fs.readFileSync(bundlePath, 'utf8');
const ast = parser.parse(code, { sourceType: 'module' });
const declarations = new Map();
const targets = new Map();
traverse(ast, {
  Program(path) {
    for (const [name, binding] of Object.entries(path.scope.bindings)) {
      declarations.set(name, binding.path.node);
    }
  },
  StringLiteral(path) {
    const role = {
      'Gatilhos dentro da própria pipeline': 'workspace',
      'Adicionar gatilho · ': 'picker',
      'Escolher SalesBot': 'panel',
    }[path.node.value];
    if (!role) return;
    const parent = path.findParent(item => item.isFunctionDeclaration() && item.parentPath.isProgram());
    if (parent) targets.set(role, parent.node.id.name);
  },
});
for (const role of ['workspace', 'picker', 'panel']) {
  assert.ok(targets.has(role), 'Published component must be found: ' + role);
}

// These bindings are the catalog and pure helpers used by the bundle functions.
// Providers/hooks/styles are deliberately supplied below, not loaded from app.
const fallbackVariant = targets.get('workspace') === 'NO';
const extractedNames = [
  ...(fallbackVariant
    ? ['Of', 'yO', 'U_', '_O', 'EO', 'q_', 'P_', 'L_', 'bO', 'jO']
    : ['Lf', 'C1', '$_', 'k1', 'B1', 'H_', 'q_', 'z_', 'T1', 'R1']),
  targets.get('workspace'), targets.get('picker'), targets.get('panel'),
];
const extracted = extractedNames.map(name => {
  const node = declarations.get(name);
  assert.ok(node, 'Expected bundle binding exists: ' + name);
  return (node.type === 'VariableDeclarator' ? 'const ' : '') + code.slice(node.start, node.end) + ';';
}).join('\n');

const pipeline = Object.freeze({ id: 'isolated-pipeline', name: 'Funil isolado', active: true, order: 0 });
const stage = Object.freeze({ id: 'isolated-stage', pipelineId: pipeline.id, name: 'Etapa isolada', order: 0 });
const initialSnapshot = Object.freeze({
  pipelines: [pipeline], stages: [stage], leads: [], tags: [],
  customFieldDefinitions: [], customFieldValues: [], tasks: [], history: [],
});
const report = [];
let forbiddenCalls = 0;

function createHarness({ canManage = true, automations = [] } = {}) {
  const instances = new Map();
  let activeInstance;
  let dirty = false;
  let effectQueue = [];
  let tree = [];
  let confirmationCalls = 0;
  const forbid = name => () => {
    forbiddenCalls++;
    throw new Error('Forbidden call in isolated click test: ' + name);
  };
  const sameDeps = (before, after) => Array.isArray(before) && Array.isArray(after)
    && before.length === after.length && before.every((value, index) => Object.is(value, after[index]));
  const nextSlot = () => {
    assert.ok(activeInstance, 'A hook must execute inside an extracted component');
    const index = activeInstance.cursor++;
    return { instance: activeInstance, index, prior: activeInstance.hooks[index] };
  };
  const hooks = {
    useState(initial) {
      const { instance, index, prior } = nextSlot();
      if (!prior) instance.hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      const slot = instance.hooks[index];
      return [slot.value, next => {
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; }
      }];
    },
    useMemo(factory, deps) {
      const { instance, index, prior } = nextSlot();
      if (!prior || !sameDeps(prior.deps, deps)) instance.hooks[index] = { value: factory(), deps };
      return instance.hooks[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useRef(value) { return hooks.useMemo(() => ({ current: value }), []); },
    useEffect(callback, deps) {
      const { instance, index, prior } = nextSlot();
      if (!prior || !sameDeps(prior.deps, deps)) {
        const entry = { deps, cleanup: prior?.cleanup };
        instance.hooks[index] = entry;
        effectQueue.push(() => { entry.cleanup?.(); entry.cleanup = callback(); });
      }
    },
    useLayoutEffect(callback, deps) { hooks.useEffect(callback, deps); },
  };
  const service = new Proxy({
    snapshot: () => initialSnapshot,
    getStages: id => id === pipeline.id ? [stage] : [],
  }, { get: (target, key) => key in target ? target[key] : forbid('service.' + String(key)) });
  const fakeWindow = {
    innerWidth: 1280, innerHeight: 900,
    addEventListener() {}, removeEventListener() {},
    confirm() { confirmationCalls++; return false; },
    prompt: forbid('window.prompt'), open: forbid('window.open'),
    localStorage: new Proxy({}, { get: (_, key) => forbid('localStorage.' + String(key)) }),
    location: new Proxy({}, { get: (_, key) => forbid('location.' + String(key)) }),
  };
  const fakeDocument = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-stage-id]');
      return [{ dataset: { stageId: stage.id }, getBoundingClientRect: () => ({ top: 100, right: 320 }) }];
    },
  };
  const context = vm.createContext({
    _: hooks, s: jsxRuntime,
    X: new Proxy({}, { get: (_, key) => String(key) }),
    Q: new Proxy({}, { get: (_, key) => String(key) }),
    bn: () => ({ navigate: forbid('navigate') }),
    hn: () => ({ navigate: forbid('navigate') }),
    wr() {}, qI: () => automations, pa: () => [], ga: () => [],
    yi() {}, Dk: () => automations, ca: () => [], da: () => [],
    Yf: forbid('CrmService constructor'), tl: forbid('BrowserCrmRepository constructor'),
    Hf: forbid('CrmService constructor'), Xo: forbid('BrowserCrmRepository constructor'),
    HI: forbid('updatePipelineAutomationConfirmed'), zI: forbid('createPipelineAutomationConfirmed'),
    Pk: forbid('updatePipelineAutomationConfirmed'), Mk: forbid('createPipelineAutomationConfirmed'),
    $I: forbid('deletePipelineAutomation'), GI: forbid('deletePipelineAutomationsForPipeline'),
    VI: forbid('deletePipelineAutomationsForStage'),
    Bk: forbid('deletePipelineAutomation'), Uk: forbid('deletePipelineAutomationsForPipeline'),
    Lk: forbid('deletePipelineAutomationsForStage'),
    Fe: false, Ge: false, rt: null,
    L1: forbid('LeadCard'), U1: forbid('LeadDrawer'),
    CO: forbid('LeadCard'), TO: forbid('LeadDrawer'),
    window: fakeWindow, document: fakeDocument,
    fetch: forbid('fetch'), XMLHttpRequest: forbid('XMLHttpRequest'), WebSocket: forbid('WebSocket'),
    FormData: forbid('FormData/save'), console,
  });
  vm.runInContext(extracted + '\nglobalThis.TestWorkspace = ' + targets.get('workspace') + ';', context, { timeout: 3000 });

  function resolve(element, path, parent) {
    if (element === null || element === undefined || typeof element === 'boolean') return [];
    if (Array.isArray(element)) return element.flatMap((child, index) => resolve(child, path + ':' + index, parent));
    if (typeof element === 'string' || typeof element === 'number') {
      return [{ type: '#text', text: String(element), props: {}, children: [], parent }];
    }
    assert.ok(React.isValidElement(element), 'Extracted code returns valid React elements');
    if (element.type === React.Fragment) return resolve(element.props.children, path + ':fragment', parent);
    if (typeof element.type === 'function') {
      const identity = path + ':' + element.type.name + ':' + (element.key ?? '');
      if (!instances.has(identity)) instances.set(identity, { hooks: [], cursor: 0 });
      const instance = instances.get(identity);
      instance.cursor = 0;
      const previous = activeInstance;
      activeInstance = instance;
      const rendered = element.type(element.props);
      activeInstance = previous;
      return resolve(rendered, identity + ':output', parent);
    }
    assert.equal(typeof element.type, 'string', 'Only host elements remain');
    const node = { type: element.type, props: element.props, children: [], parent };
    node.children = resolve(element.props.children, path + ':children', node);
    return [node];
  }
  function flush() {
    let passes = 0;
    do {
      assert.ok(++passes <= 12, 'Hook updates converge');
      dirty = false;
      effectQueue = [];
      tree = resolve(jsxRuntime.jsx(context.TestWorkspace, { service, canManage, assignees: [] }), 'root', null);
      const pending = effectQueue;
      effectQueue = [];
      pending.forEach(effect => effect());
    } while (dirty);
  }
  function all(predicate) {
    const matches = [];
    const walk = node => { if (predicate(node)) matches.push(node); node.children.forEach(walk); };
    tree.forEach(walk);
    return matches;
  }
  const text = node => node.type === '#text' ? node.text : node.children.map(text).join('');
  const byClass = className => all(node => String(node.props.className || '').split(' ').includes(className));
  const byText = (type, value) => all(node => node.type === type && text(node).trim() === value);
  const pickerOpen = () => all(node => node.props.role === 'dialog' && node.props['aria-label'] === 'Adicionar gatilho em ' + stage.name).length === 1;
  const panelOpen = () => all(node => node.type === 'form' && node.props['aria-label'] === 'Configurar gatilho em ' + stage.name).length === 1;
  function click(node) {
    assert.ok(node, 'Click target exists');
    const event = {
      target: node, currentTarget: node, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.stopped = true; },
    };
    for (let current = node; current; current = current.parent) {
      event.currentTarget = current;
      if (!current.props.disabled && typeof current.props.onClick === 'function') current.props.onClick(event);
      if (event.stopped) break;
    }
    flush();
  }
  function activateAutomation() {
    const button = all(node => node.type === 'button' && /Automatize/.test(text(node)))[0];
    click(button);
    assert.equal(byClass('stageAutomationBody').length, 1, 'Automation mode renders stage body');
  }
  flush();
  return { all, text, byClass, byText, click, pickerOpen, panelOpen, activateAutomation,
    confirmations: () => confirmationCalls,
  };
}

function test(name, callback) {
  try {
    const skip = callback();
    report.push(skip ? { name, status: 'NOT_APPLICABLE', reason: skip } : { name, status: 'PASS' });
  }
  catch (error) { report.push({ name, status: 'FAIL', error: error.message }); }
}

for (const target of ['empty', 'title', 'background']) {
  test(target + ' click opens catalog' + (expectBroken ? ' (known baseline defect)' : ''), () => {
    const h = createHarness(); h.activateAutomation();
    const node = target === 'empty' ? h.byClass('stageTriggerEmpty')[0]
      : target === 'title' ? h.byText('strong', stage.name)[0] : h.byClass('stageAutomationBody')[0];
    h.click(node);
    assert.equal(h.pickerOpen(), !expectBroken, 'Click result matches expected published behavior');
  });
}

for (const action of ['SalesBot', 'Pausar SalesBot']) {
  test('+ Adicionar > ' + action + ' opens the matching configuration panel', () => {
    const h = createHarness(); h.activateAutomation();
    h.click(h.byText('button', '+ Adicionar gatilho')[0]);
    assert.equal(h.pickerOpen(), true, '+ Adicionar opens catalog');
    const title = h.byText('strong', action)[0];
    assert.ok(title, 'Actual bundle catalog contains ' + action);
    h.click(title);
    assert.equal(h.pickerOpen(), false, 'Choosing an action closes catalog');
    assert.equal(h.panelOpen(), true, 'Configuration panel is mounted');
    assert.equal(h.byText('strong', action === 'SalesBot' ? 'Escolher SalesBot' : 'Pausar SalesBot').length, 1);
    assert.equal(h.byText('button', 'Pronto').length, 1, 'Save control is present but never invoked');
    assert.equal(h.byText('option', 'Selecione o SalesBot').length, action === 'SalesBot' ? 1 : 0);
    h.click(h.byText('button', 'Cancelar')[0]);
    assert.equal(h.panelOpen(), false, 'Cancel closes panel without saving');
    assert.equal(h.pickerOpen(), false);
  });
}

test('canManage=false cannot open catalog from stage, empty card or background', () => {
  const h = createHarness({ canManage: false }); h.activateAutomation();
  assert.equal(h.byText('button', '+ Adicionar gatilho').length, 0);
  for (const locate of [() => h.byClass('stageTriggerEmpty')[0], () => h.byText('strong', stage.name)[0], () => h.byClass('stageAutomationBody')[0]]) {
    h.click(locate());
    assert.equal(h.pickerOpen(), false);
    assert.equal(h.panelOpen(), false);
  }
});

test('Bulk mode stage name does not open trigger catalog', () => {
  const h = createHarness(); h.activateAutomation();
  if (fallbackVariant && h.byText('button', 'Ações em massa').length === 0) {
    return 'This older fallback bundle has no bulk mode. Main bundle bulk guard is tested separately.';
  }
  h.click(h.byText('button', 'Ações em massa')[0]);
  assert.equal(h.byClass('stageAutomationBody').length, 0);
  h.click(h.byText('strong', stage.name)[0]);
  assert.equal(h.pickerOpen(), false);
  assert.equal(h.panelOpen(), false);
});

test('Background handler ignores a child element click', () => {
  const h = createHarness(); h.activateAutomation();
  h.click(h.byClass('stageTriggerList')[0]);
  assert.equal(h.pickerOpen(), false);
  assert.equal(h.panelOpen(), false);
});

test('Existing trigger Edit opens only its configuration; Delete cancellation opens no catalog', () => {
  const automation = {
    id: 'isolated-trigger', name: 'Gatilho isolado', status: 'active', origin: 'pipeline',
    pipeline: { pipelineId: pipeline.id, stageId: stage.id, event: 'created_or_moved', action: 'pause_salesbot' },
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const h = createHarness({ automations: [automation] }); h.activateAutomation();
  h.click(h.byText('button', 'Editar')[0]);
  assert.equal(h.panelOpen(), true);
  assert.equal(h.pickerOpen(), false);
  h.click(h.byText('button', 'Cancelar')[0]);
  h.click(h.byText('button', 'Excluir')[0]);
  assert.equal(h.confirmations(), 1, 'Delete is cancelled at confirmation');
  assert.equal(h.panelOpen(), false);
  assert.equal(h.pickerOpen(), false);
});

test('Local flow makes no API, save, persistent storage or navigation call', () => {
  assert.equal(forbiddenCalls, 0);
});

const result = {
  bundle: bundlePath,
  sha256: crypto.createHash('sha256').update(code).digest('hex'),
  mode: 'isolated React element runtime; stub hooks/providers/geometry, no DOM, API or authenticated browser',
  extractedComponents: Object.fromEntries(targets),
  expectBroken,
  tests: report,
  forbiddenCalls,
  pass: report.every(item => item.status !== 'FAIL'),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
