(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.getElementById('hero'), how = document.getElementById('how');
  var pill = document.getElementById('pill');
  var steps = [].slice.call(document.querySelectorAll('#steps li'));
  var scrs = [].slice.call(document.querySelectorAll('.scr'));
  var qts = [].slice.call(document.querySelectorAll('.qt'));
  var typed = document.getElementById('typed'), done = document.getElementById('done');
  var msg = "Happy birthday, muffin butt. Come visit before you're 32. \u2014 Em";
  var phone = document.querySelector('.phone');

  var navCta = document.querySelector('.nav-cta'), heroCopy = document.querySelector('.hero-copy');
  var drops=[].slice.call(document.querySelectorAll('[data-drop]')); var rack=document.getElementById('rack'), arts=document.getElementById('artists'); var band=document.getElementById('band'); var fillW=[].slice.call(document.querySelectorAll('#fill span')); var stamp=document.getElementById('sendStamp'), ctaCard=document.getElementById('ctaCard');
  if (reduce){ stamp.classList.add('on'); fillW.forEach(function(w){w.classList.add('lit')}); pill.classList.add('on'); if (navCta) navCta.classList.add('show'); typed.textContent = msg; qts.forEach(function(q){q.classList.add('in')}); return; }

  function prog(el){
    var r = el.getBoundingClientRect(), span = el.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / (span > 0 ? span : 1)));
  }
  var last = -1;
  function frame(){
    var hr = hero.getBoundingClientRect();
    var hp;
    if (window.innerWidth <= 860){
      var sb = document.querySelector('.stack-box').getBoundingClientRect();
      hp = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - sb.top) / (window.innerHeight * 0.75)));
    } else hp = prog(hero);
    hero.style.setProperty('--p', hp.toFixed(4));
    pill.classList.toggle('on', hp > (window.innerWidth <= 860 ? 0.3 : 0.12));
    if (navCta) navCta.classList.toggle('show', heroCopy.getBoundingClientRect().bottom < 90);

    var p = prog(how);
    var raw = p * 4, i = Math.min(3, Math.floor(raw)), local = Math.min(1, raw - i);
    phone.style.setProperty('--hp', p.toFixed(4));
    if (window.innerWidth <= 860){ var avail = window.innerHeight - 72 - 200; phone.style.setProperty('--pz', Math.max(0.6, Math.min(1, avail / 470)).toFixed(3)); } else phone.style.removeProperty('--pz');
    if (i !== last){
      steps.forEach(function(s, k){ s.classList.toggle('on', k === i); });
      scrs.forEach(function(s, k){ s.classList.toggle('on', k === i); });
      last = i;
    }
    steps[i].style.setProperty('--sp', local.toFixed(3));
    // 1: QTs slide in one by one
    qts.forEach(function(q, k){ q.classList.toggle('in', i > 0 || local > k * 0.16); });
    // 2: notification drops in
    scrs[1].style.setProperty('--np', i === 1 ? Math.min(1, local * 2.4).toFixed(3) : (i > 1 ? 1 : 0));
    scrs[1].style.setProperty('--nq', i === 1 ? Math.min(1, Math.max(0, (local - 0.38) * 2.4)).toFixed(3) : (i > 1 ? 1 : 0));
    // 3: typing follows the scroll
    var t = i === 2 ? Math.min(1, local / 0.8) : (i > 2 ? 1 : 0);
    typed.textContent = msg.slice(0, Math.round(t * msg.length));
    // 4: postcard drops into the envelope, then the stamp lands
    var m = i === 3 ? Math.min(1, local / 0.55) : 0;
    scrs[3].style.setProperty('--mp', m.toFixed(3));
    done.classList.toggle('on', i === 3 && local > 0.62);
    var vh = window.innerHeight;
    drops.forEach(function(el){
      var r = el.getBoundingClientRect();
      var e = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.42)));
      el.style.setProperty('--e', e.toFixed(3));
    });
    // artists rack slides sideways while the section crosses the screen
    var ar = rack.getBoundingClientRect();
    var rp = Math.min(1, Math.max(0, (vh * 0.85 - ar.top) / (vh * 0.75)));
    rack.style.setProperty('--rp', rp.toFixed(4));
    rack.style.setProperty('--rackw', rack.scrollWidth + 'px');
    // bleachers band: words light up in order
    var br = band.getBoundingClientRect();
    var bp = Math.min(1, Math.max(0, (vh - br.top) / (vh + br.height)));
    band.style.setProperty('--bp', bp.toFixed(4));
    var lit = Math.round(Math.min(1, Math.max(0, (bp - 0.28) / 0.3)) * fillW.length);
    fillW.forEach(function(w, k){ w.classList.toggle('lit', k < lit); });
    // final postcard gets stamped once it's in the middle of the screen
    var cr = ctaCard.getBoundingClientRect();
    if (cr.top + cr.height / 2 < vh * 0.78) stamp.classList.add('on');
    else if (cr.top > vh) stamp.classList.remove('on');
    ticking = false;
  }
  var ticking = false;
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll);
  frame();
})();

// ── Waitlist signup ─────────────────────────────────────────────
// Paste the form endpoint from your email tool here (see README).
// Leave it empty and the form only shows the thank-you note without saving anything.
const WAITLIST_ENDPOINT = '';

document.querySelectorAll('form.signup').forEach(function (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var input = form.querySelector('input[type=email]');
    if (!input.value || !input.checkValidity()) { input.focus(); input.reportValidity && input.reportValidity(); return; }
    var button = form.querySelector('button');
    if (WAITLIST_ENDPOINT) {
      button.disabled = true;
      try {
        var res = await fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });
        if (!res.ok) throw new Error('Signup failed');
      } catch (err) {
        button.disabled = false;
        alert('Hmm, that didn\u2019t go through. Mind trying again?');
        return;
      }
    }
    var msg = document.createElement('p');
    msg.className = 'thanks';
    msg.setAttribute('role', 'status');
    msg.innerHTML = '<b>You\u2019re on the list.</b> We\u2019ll email you the second QuteNote is ready.';
    form.replaceWith(msg);
  });
});
