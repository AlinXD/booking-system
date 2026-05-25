/* =====================================================
   MINITOPIA — Shared script.js
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {

  // ---- THEME TOGGLE ----
  const themeBtn = document.querySelector('.theme-toggle');

  // Verificăm tema salvată la încărcarea paginii
  if (localStorage.getItem('minitopia-theme') === 'light') {
    document.body.classList.add('light');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('minitopia-theme',
        document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }

  // ---- HAMBURGER MOBILE ----
  const hb = document.getElementById('hamburger');
  const mob = document.getElementById('mobileNav');
  if (hb && mob) {
    hb.addEventListener('click', () => {
      hb.classList.toggle('open');
      mob.classList.toggle('open');
    });
    mob.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hb.classList.remove('open');
        mob.classList.remove('open');
      });
    });
  }

  // ---- BACK TO TOP ----
  const bt = document.getElementById('backTop');
  window.addEventListener('scroll', () => {
    if (bt) bt.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
  if (bt) bt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ---- SCROLL REVEAL ----
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
    io.observe(el);
  });

});

/* helper used by forms */
function shakeEl(el) {
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = 'shake .4s ease';
  setTimeout(() => el.style.animation = '', 450);
}