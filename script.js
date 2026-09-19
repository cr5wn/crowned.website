const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const mobile = matchMedia('(max-width: 700px)');
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const ease = 'cubic-bezier(.22,1,.36,1)';
let revealObserver;


function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '#' + id);
  svg.append(use);
  return svg;
}

function animate(element, frames, options = {}) {
  if (!element?.animate) return null;

  const animation = element.animate(frames, {
    duration: 560,
    easing: ease,
    fill: 'both',
    ...options
  });

  animation.finished.then(() => animation.cancel()).catch(() => {});
  return animation;
}

function wait(animation) {
  return animation ? animation.finished.catch(() => {}) : Promise.resolve();
}

function finish(animations) {
  for (const animation of animations) {
    try {
      animation.finish();
    } catch {
      animation.cancel();
    }
  }
}

function setupNav() {
  const header = $('.header');
  const nav = $('.nav');
  const menu = $('.menu-toggle');
  const links = all('a', nav);
  const indicator = $('.nav-indicator');
  const sections = all('main section[id]');
  const hero = $('.hero');
  const pattern = $('.hero-pattern');
  let preview;
  let open = false;
  let menuAnimations = [];
  let scrollFrame = 0;

  nav.classList.add('has-indicator');
  nav.inert = mobile.matches;

  function moveIndicator() {
    if (mobile.matches) return;
    const link = preview || $('a.active', nav);
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.height = link.offsetHeight + 'px';
    indicator.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    requestAnimationFrame(() => indicator.classList.add('is-positioned'));
  }

  async function setMenu(next, restoreFocus = false) {
    open = next && mobile.matches;
    menuAnimations.forEach(animation => animation?.cancel());
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.replaceChildren(icon(open ? 'i-close' : 'i-menu'));
    nav.inert = mobile.matches && !open;
    if (restoreFocus) menu.focus({ preventScroll: true });

    if (!mobile.matches) {
      nav.classList.toggle('is-open', open);
      return;
    }

    if (open) {
      nav.classList.add('is-open');
      menuAnimations = [animate(nav, [
        { opacity: 0, transform: 'translateY(-10px)', clipPath: 'inset(0 0 90% 0 round 18px)' },
        { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0 round 18px)' }
      ], { duration: 340 })];
      links.forEach((link, index) => menuAnimations.push(animate(link, [
        { opacity: 0, translate: '-9px 0' }, { opacity: 1, translate: '0 0' }
      ], { duration: 300, delay: 70 + index * 24 })));
    } else if (nav.classList.contains('is-open')) {
      const closing = animate(nav, [
        { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }
      ], { duration: 150 });
      menuAnimations = [closing];
      await wait(closing);
      if (!open) nav.classList.remove('is-open');
    }
  }

  function update() {
    scrollFrame = 0;
    header.classList.toggle('is-scrolled', scrollY > 20);
    let active = 'home';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 180) active = section.id;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 30) active = 'contact';

    links.forEach(link => {
      const selected = link.hash === '#' + active;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    moveIndicator();

    if (!mobile.matches && scrollY < hero.offsetHeight) {
      pattern.style.setProperty('--pattern-y', Math.min(70, scrollY * .12) + 'px');
    }
  }

  menu.addEventListener('click', event => {
    setMenu(!open);
    if (open && event.detail === 0) links[0].focus();
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a') && mobile.matches) setMenu(false);
  });
  links.forEach(link => {
    for (const event of ['pointerenter', 'focus']) {
      link.addEventListener(event, () => { preview = link; moveIndicator(); });
    }
  });
  nav.addEventListener('pointerleave', () => { preview = null; moveIndicator(); });
  nav.addEventListener('focusout', event => {
    if (!nav.contains(event.relatedTarget)) { preview = null; moveIndicator(); }
  });
  document.addEventListener('click', event => {
    if (open && !event.composedPath().includes(header)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) setMenu(false, true);
  });
  mobile.addEventListener('change', () => { setMenu(false); preview = null; update(); });
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(update);
  }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(moveIndicator).observe(nav);
  return update;
}

function setupReveals() {
  const elements = all('.reveal');
  if (!('IntersectionObserver' in window)) return;

  revealObserver = new IntersectionObserver(entries => {
    const groups = new Map();
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      const tech = element.classList.contains('tech-card');
      const index = groups.get(element.parentElement) || 0;
      const delay = Math.min(index * (tech ? 42 : 85), 420);
      groups.set(element.parentElement, index + 1);
      element.classList.remove('waiting');
      revealObserver.unobserve(element);

      animate(element, [
        { opacity: 0, translate: `0 ${tech ? 20 : 32}px` },
        { opacity: 1, translate: '0 0' }
      ], { duration: tech ? 580 : 760, delay });
      if (tech) animate($('.tech-icon', element), [
        { transform: 'rotate(-14deg) scale(.8)' },
        { transform: 'rotate(3deg) scale(1.05)', offset: .65 },
        { transform: 'rotate(0) scale(1)' }
      ], { duration: 690, delay: delay + 30 });
    }
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });

  elements.forEach(element => {
    if (element.getBoundingClientRect().bottom > 0) element.classList.add('waiting');
    revealObserver.observe(element);
  });
}

function setupHero() {
  const letters = all('.name-letter');
  let waving = false;

  $('.name-letters').addEventListener('pointerenter', async () => {
    if (!mouse.matches || waving || scrollY > 350) return;
    waving = true;
    await Promise.all(letters.map((letter, index) => wait(animate(letter, [
      { transform: 'translateY(0) rotate(0)' },
      { transform: `translateY(-11px) rotate(${index % 2 ? 3 : -3}deg)`, offset: .38 },
      { transform: 'translateY(2px) rotate(0)', offset: .72 },
      { transform: 'translateY(0) rotate(0)' }
    ], { duration: 600, delay: index * 38 }))));
    waving = false;
  });

  if (location.hash && !['#home', '#main'].includes(location.hash)) return;
  letters.forEach((letter, index) => animate(letter, [
    { opacity: 0, transform: 'translateY(72%) rotateX(-75deg) rotateZ(-6deg)' },
    { opacity: 1, transform: 'translateY(-4%) rotateX(0deg) rotateZ(1deg)', offset: .74 },
    { opacity: 1, transform: 'translateY(0) rotateX(0deg) rotateZ(0deg)' }
  ], { duration: 930, delay: 70 + index * 55 }));
  all('.hero-word').forEach((word, index) => animate(word, [
    { transform: 'translateY(115%) rotate(3deg)' }, { transform: 'translateY(0) rotate(0)' }
  ], { duration: 850, delay: 300 + index * 80 }));
  animate($('.hero-description'), [
    { opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }
  ], { duration: 650, delay: 660 });
  all('.hero-buttons .button').forEach((button, index) => animate(button, [
    { opacity: 0, transform: 'translateY(20px) scale(.95)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' }
  ], { duration: 620, delay: 740 + index * 75 }));
  all('.hero-socials a').forEach((link, index) => animate(link, [
    { opacity: 0, transform: 'translateY(16px) scale(.7)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' }
  ], { duration: 560, delay: 880 + index * 55 }));
  animate($('.hero-pattern'), [{ opacity: 0 }, { opacity: .65 }], { duration: 1500 });
}

function setupFilters() {
  const filters = $('.stack-filters');
  const buttons = all('button', filters);
  const indicator = $('.filter-indicator');
  const grid = $('.stack-grid');
  const cards = all('.tech-card');
  let selected = 'all';
  let shown = 'all';
  let busy = false;
  const matches = (card, category) => category === 'all' || card.dataset.category === category;
  filters.classList.add('has-indicator');

  function moveIndicator() {
    const button = $('button.active', filters);
    indicator.style.width = button.offsetWidth + 'px';
    indicator.style.transform = `translate(${button.offsetLeft}px, ${button.offsetTop + button.offsetHeight - 2}px)`;
    requestAnimationFrame(() => indicator.classList.add('is-positioned'));
  }

  async function filter() {
    if (busy) return;
    busy = true;
    grid.classList.add('is-filtering');
    grid.setAttribute('aria-busy', 'true');
    cards.forEach(card => {
      revealObserver?.unobserve(card);
      card.classList.remove('waiting');
    });

    try {
      while (shown !== selected) {
        const target = selected;
        const visible = cards.filter(card => !card.hidden);
        const leaving = visible.filter(card => !matches(card, target));
        await Promise.all(leaving.map(card => wait(animate(card, [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(.93) translateY(-8px)' }
        ], { duration: 135, easing: 'ease-in' }))));

        const before = new Map(visible.map(card => [card, card.getBoundingClientRect()]));
        const oldHeight = grid.offsetHeight;
        cards.forEach(card => { card.hidden = !matches(card, target); });
        const after = cards.filter(card => !card.hidden);
        const animations = [];
        if (oldHeight !== grid.offsetHeight) {
          animations.push(animate(grid, [
            { height: oldHeight + 'px' }, { height: grid.offsetHeight + 'px' }
          ], { duration: 510 }));
        }

        after.forEach((card, index) => {
          const old = before.get(card);
          const next = card.getBoundingClientRect();
          if (old) {
            const x = old.left - next.left;
            const y = old.top - next.top;
            if (Math.abs(x) > .5 || Math.abs(y) > .5) {
              animations.push(animate(card, [
                { transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }
              ], { duration: 510 }));
            }
          } else {
            animations.push(animate(card, [
              { opacity: 0, transform: 'translateY(20px) scale(.94)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], { duration: 410, delay: Math.min(index * 27, 190) }));
          }
        });
        shown = target;
        await Promise.all(animations.map(wait));
        if (selected === target) $('.filter-result').textContent = `${after.length} technologies shown.`;
      }
    } finally {
      busy = false;
      grid.classList.remove('is-filtering');
      grid.removeAttribute('aria-busy');
      updateNav();
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.filter;
    buttons.forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    moveIndicator();
    filter();
  }));
  if ('ResizeObserver' in window) new ResizeObserver(moveIndicator).observe(filters);
  return moveIndicator;
}

function setupHover() {
  all('.service-card, .github-card, .button').forEach(element => {
    const button = element.classList.contains('button');
    let frame = 0;
    let point;

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      ['--rx', '--ry', '--mx', '--my'].forEach(property => element.style.removeProperty(property));
    }

    element.addEventListener('pointermove', event => {
      if (!mouse.matches || event.pointerType === 'touch') return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!mouse.matches) return reset();
        const rect = element.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (point.x - rect.left) / rect.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (point.y - rect.top) / rect.height * 2 - 1));
        if (button) {
          element.style.setProperty('--mx', x * 3 + 'px');
          element.style.setProperty('--my', y * 2 + 'px');
        } else {
          element.style.setProperty('--rx', -y * 2 + 'deg');
          element.style.setProperty('--ry', x * 2.3 + 'deg');
        }
      });
    }, { passive: true });
    ['pointerleave', 'pointercancel', 'blur'].forEach(event => element.addEventListener(event, reset));
  });
}

function setupFaq() {
  const items = all('.faq details');
  const states = new Map(items.map(item => [item, { open: item.open }]));
  $('.faq').classList.add('enhanced');

  async function toggle(item, open) {
    const state = states.get(item);
    const content = $('div', item);
    const height = item.getBoundingClientRect().height;
    const opacity = getComputedStyle(content).opacity;
    state.animation?.cancel();
    state.fade?.cancel();
    state.open = open;
    item.classList.toggle('is-expanded', open);

    item.open = true;
    const next = open ? item.getBoundingClientRect().height : $('summary', item).offsetHeight + 1;
    const animation = animate(item, [{ height: height + 'px' }, { height: next + 'px' }], { duration: 360 });
    state.animation = animation;
    state.fade = animate(content, [
      { opacity: open && height <= next / 2 ? 0 : opacity }, { opacity: open ? 1 : 0 }
    ], { duration: 220, delay: open ? 50 : 0 });
    await wait(animation);
    if (state.animation === animation) {
      item.open = state.open;
      state.animation = null;
    }
  }

  items.forEach(item => {
    item.classList.toggle('is-expanded', item.open);
    $('summary', item).addEventListener('click', event => {
      event.preventDefault();
      const open = !states.get(item).open;
      if (open) {
        items.forEach(other => {
          if (other !== item && states.get(other).open) toggle(other, false);
        });
      }
      toggle(item, open);
    });
  });
}

function setupDialog() {
  const dialog = $('.service-dialog');
  let trigger;
  let closing = false;

  async function close() {
    if (!dialog.open || closing) return;
    closing = true;
    finish(dialog.getAnimations({ subtree: true }));
    dialog.classList.add('is-closing');
    await wait(animate(dialog, [
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(12px) scale(.975)' }
    ], { duration: 170, easing: 'ease-in' }));
    dialog.close();
    dialog.classList.remove('is-closing');
    closing = false;
  }

  all('.service-more').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('.service-card');
    const items = all('.service-data li', card).map(item => item.textContent.trim());
    trigger = button;
    $('#service-dialog-title').textContent = $('h3', card).textContent;
    $('.service-dialog-description').textContent = $('p', card).textContent;
    $('.service-dialog-icon').replaceChildren($('.service-icon .icon', card).cloneNode(true));
    $('.service-includes').replaceChildren(...items.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    document.body.classList.add('dialog-open');
    dialog.showModal();
    $('.dialog-close', dialog).focus({ preventScroll: true });
    animate(dialog, [
      { opacity: 0, transform: 'translateY(24px) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 400 });
    all('.service-includes li').forEach((item, index) => animate(item, [
      { opacity: 0, translate: '-9px 0' }, { opacity: 1, translate: '0 0' }
    ], { duration: 400, delay: 90 + index * 55 }));
  }));

  $('.dialog-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    trigger?.focus({ preventScroll: true });
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.className = 'clipboard-input';
  input.setAttribute('readonly', '');
  document.body.append(input);
  input.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    input.remove();
  }
}

function setupCopy() {
  const button = $('.copy-handle');
  const toast = $('.toast');
  let resetTimer;
  let toastTimer;

  button.addEventListener('click', async () => {
    const handle = $('strong', button.closest('.social-row')).textContent.replace(/^@/, '');
    const copied = await copyText(handle);
    button.focus({ preventScroll: true });
    if (copied) {
      const check = icon('i-check');
      check.classList.add('copy-check');
      button.replaceChildren(check);
      button.classList.add('is-copied');
      button.setAttribute('aria-label', 'Discord username copied');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.replaceChildren(icon('i-copy'));
        button.classList.remove('is-copied');
        button.setAttribute('aria-label', 'Copy Discord username');
      }, 2200);
    }
    toast.textContent = copied ? 'Copied @' + handle : 'My Discord username is @' + handle;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
  });
}


const updateNav = setupNav();
const updateFilter = setupFilters();
setupReveals();
setupHover();
setupFaq();
setupDialog();
setupCopy();
setupHero();

function updateLayout() {
  updateNav();
  updateFilter();
}

addEventListener('resize', updateLayout, { passive: true });
document.fonts.ready.then(updateLayout);
updateLayout();
