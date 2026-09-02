(() => {
  const nativeConsole = {...window.console};
  const objectNames = new WeakMap();
  let nextObjectId = 1;

  class DevtoolsConsole {
    constructor(root) {
      this.root = root;
      this.install();
    }

    clear() {
      this.root.replaceChildren();
    }

    write(level, values) {
      const row = document.createElement('div');
      row.className = `console-row console-row--${level}`;
      row.setAttribute('role', level === 'error' || level === 'warn' ? 'alert' : 'listitem');

      const marker = document.createElement('span');
      marker.className = 'console-marker';
      marker.textContent = level === 'error' ? '×' : level === 'warn' ? '!' : level === 'info' ? 'i' : '›';

      const content = document.createElement('div');
      content.className = 'console-values';
      values.forEach((value, index) => {
        if (index) content.append(' ');
        content.append(renderValue(value, new Set()));
      });

      row.append(marker, content);
      this.root.append(row);
      row.scrollIntoView({block: 'nearest'});
    }

    install() {
      for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
        window.console[level] = (...values) => {
          this.write(level === 'debug' ? 'log' : level, values);
          nativeConsole[level]?.(...values);
        };
      }
      window.console.clear = () => this.clear();
      window.console.table = value => this.write('log', [value]);
      window.addEventListener('error', event => this.write('error', [event.error || event.message]));
      window.addEventListener('unhandledrejection', event => this.write('error', ['Uncaught (in promise)', event.reason]));
    }
  }

  function renderValue(value, ancestors) {
    if (value === null) return token('null', 'null');
    if (value === undefined) return token('undefined', 'undefined');
    if (typeof value === 'string') return token(value, 'string');
    if (typeof value === 'number') return token(String(value), 'number');
    if (typeof value === 'bigint') return token(`${value}n`, 'number');
    if (typeof value === 'boolean') return token(String(value), 'boolean');
    if (typeof value === 'symbol') return token(String(value), 'symbol');
    if (typeof value === 'function') return token(`ƒ ${value.name || 'anonymous'}()`, 'function');
    if (value instanceof Date) return token(value.toISOString(), 'string');
    if (value instanceof RegExp) return token(String(value), 'regexp');
    if (value instanceof Error) return renderError(value, ancestors);
    if (ancestors.has(value)) return token(`[Circular *${objectId(value)}]`, 'special');
    return renderObject(value, ancestors);
  }

  function renderObject(value, ancestors) {
    const details = document.createElement('details');
    details.className = 'object-tree';
    const summary = document.createElement('summary');
    summary.append(token(preview(value), 'object-preview'));
    details.append(summary);

    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.loaded) return;
      details.dataset.loaded = 'true';
      const children = document.createElement('div');
      children.className = 'object-children';
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(value);

      for (const [key, descriptor] of entries(value)) {
        const row = document.createElement('div');
        row.className = 'object-property';
        row.append(token(String(key), 'property'), ': ');
        if ('value' in descriptor) {
          row.append(renderValue(descriptor.value, nextAncestors));
        } else {
          row.append(token(descriptor.get && descriptor.set ? '[Getter/Setter]' : descriptor.get ? '[Getter]' : '[Setter]', 'special'));
        }
        children.append(row);
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype) {
        const row = document.createElement('div');
        row.className = 'object-property object-prototype';
        row.append(token('[[Prototype]]', 'property'), ': ', renderValue(prototype, nextAncestors));
        children.append(row);
      }
      if (!children.childNodes.length) children.append(token('No properties', 'muted'));
      details.append(children);
    });
    return details;
  }

  function renderError(error, ancestors) {
    const wrapper = document.createElement('span');
    wrapper.className = 'error-value';
    wrapper.append(renderObject(error, ancestors));
    const summary = wrapper.querySelector('summary .object-preview');
    if (summary) summary.textContent = `${error.name}: ${error.message}`;
    return wrapper;
  }

  function entries(value) {
    if (value instanceof Map) {
      return [...value.entries()].map(([key, item], index) => [`${index}: ${preview(key)}`, {value: item, enumerable: true, configurable: true, writable: true}]);
    }
    if (value instanceof Set) {
      return [...value.values()].map((item, index) => [index, {value: item, enumerable: true, configurable: true, writable: true}]);
    }
    try {
      return Reflect.ownKeys(value).map(key => [key, Object.getOwnPropertyDescriptor(value, key)]).filter((entry) => entry[1]);
    } catch (error) {
      return [['<inspection error>', {value: error, enumerable: true, configurable: true, writable: true}]];
    }
  }

  function preview(value) {
    if (Array.isArray(value)) return `Array(${value.length}) [${value.slice(0, 3).map(shortValue).join(', ')}${value.length > 3 ? ', …' : ''}]`;
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    const name = value?.constructor?.name && value.constructor.name !== 'Object' ? value.constructor.name : '';
    let descriptors;
    try { descriptors = Object.getOwnPropertyDescriptors(value); } catch { return `${name || 'Object'} {…}`; }
    const keys = Reflect.ownKeys(descriptors).slice(0, 3);
    const body = keys.map(key => {
      const descriptor = descriptors[key];
      return `${String(key)}: ${descriptor && 'value' in descriptor ? shortValue(descriptor.value) : '[Getter]'}`;
    }).join(', ');
    return `${name}${name ? ' ' : ''}{${body}${Reflect.ownKeys(descriptors).length > 3 ? ', …' : ''}}`;
  }

  function shortValue(value) {
    if (typeof value === 'string') return JSON.stringify(value.length > 30 ? `${value.slice(0, 30)}…` : value);
    if (value === null || typeof value !== 'object') return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    return value.constructor?.name || 'Object';
  }

  function objectId(value) {
    if (!objectNames.has(value)) objectNames.set(value, nextObjectId++);
    return objectNames.get(value);
  }

  function token(text, kind) {
    const span = document.createElement('span');
    span.className = `token token--${kind}`;
    span.textContent = text;
    return span;
  }

  window.devtoolsConsole = new DevtoolsConsole(document.querySelector('.console-output'));
})();
