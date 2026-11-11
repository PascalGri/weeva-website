/* Lightweight navigation and theme controls for static content pages. */
(() => {
  'use strict';
  document.body.classList.add('js-enabled');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const main = document.querySelector('main');
  const footer = document.querySelector('.site-footer');
  const themeButtons = [...document.querySelectorAll('.theme-toggle, .footer-theme')];
  const headerLinks = [...document.querySelectorAll('.site-header a')];
  let menuOpen = false;

  function setMenu(open, returnFocus = false) {
    menuOpen = open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    menuButton.querySelector('use').setAttribute('href', `assets/icons.svg#${open ? 'x' : 'menu'}`);
    mobileNav.classList.toggle('is-open', open);
    mobileNav.inert = !open;
    document.body.classList.toggle('menu-open', open);
    main.inert = open;
    footer.inert = open;
    headerLinks.forEach(link => { link.inert = open; });
    document.querySelector('.floating-theme').inert = open;
    if (open) mobileNav.querySelector('a').focus({ preventScroll: true });
    else if (returnFocus) menuButton.focus({ preventScroll: true });
  }
  setMenu(false);
  menuButton.addEventListener('click', () => setMenu(!menuOpen, menuOpen));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (!menuOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key !== 'Tab') return;
    const last = [...mobileNav.querySelectorAll('a')].at(-1);
    if (event.shiftKey && document.activeElement === menuButton) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); menuButton.focus(); }
  });
  matchMedia('(min-width: 768px)').addEventListener('change', event => {
    if (event.matches && menuOpen) setMenu(false);
  });

  function updateTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    themeButtons.forEach(button => {
      button.setAttribute('aria-label', `Zum ${light ? 'dunklen' : 'hellen'} Design wechseln`);
      if (button.classList.contains('theme-toggle')) button.setAttribute('aria-pressed', String(light));
      button.querySelector('use')?.setAttribute('href', `assets/icons.svg#${light ? 'moon' : 'sun'}`);
    });
    document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#fafafb' : '#08090d');
  }
  themeButtons.forEach(button => button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('weeva-theme', theme); } catch { /* Browsing without storage works too. */ }
    updateTheme();
  }));
  window.addEventListener('storage', event => {
    if (event.key !== 'weeva-theme') return;
    document.documentElement.dataset.theme = event.newValue === 'light' ? 'light' : 'dark';
    updateTheme();
  });
  updateTheme();
  document.querySelector('#year').textContent = new Date().getFullYear();

  // Opening a shared FAQ link also opens its answer; native details work without JS.
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const details = target?.closest('details');
    if (details) details.open = true;
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);

  const tocLinks = [...document.querySelectorAll('.page-toc a')];
  if ('IntersectionObserver' in window && tocLinks.length) {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.isIntersecting);
      if (!entry) return;
      tocLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-100px 0px -65% 0px' });
    tocLinks.forEach(link => {
      const section = document.getElementById(link.hash.slice(1));
      if (section) observer.observe(section);
    });
  }
})();
