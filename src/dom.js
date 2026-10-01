// Small DOM helpers shared by the panels and the wall drawing tool.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'html') el.innerHTML = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A number field drawn like a strip of measuring tape. `live` applies valid values while typing;
// otherwise the value is applied on Enter or when the field loses focus. min/max may be functions.
export function measureField({ label, unit = 'cm', min, max, live = true, get, set }) {
  const lo = () => (typeof min === 'function' ? min() : min);
  const hi = () => (typeof max === 'function' ? max() : max);
  // Phone number pads have no minus key, so fields that take negatives get the full keyboard.
  const input = h('input', { type: 'number', inputmode: lo() < 0 ? null : 'numeric', step: 1 });
  const commit = () => {
    let v = Number(input.value);
    if (input.value === '' || !Number.isFinite(v)) v = get();
    v = clamp(Math.round(v), lo(), hi());
    input.value = v;
    if (v !== Math.round(get())) set(v);
  };
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (live && input.value !== '' && v >= lo() && v <= hi()) set(Math.round(v));
  });
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
  });
  const el = h(
    'label',
    { class: 'measure' },
    h('span', { class: 'measure__label' }, label),
    h('span', { class: 'measure__value' }, input, h('span', { class: 'measure__unit' }, unit)),
  );
  return {
    el,
    sync() {
      input.min = lo();
      input.max = hi();
      if (document.activeElement !== input) input.value = Math.round(get());
    },
  };
}
