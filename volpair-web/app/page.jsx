'use client';

import { useEffect, useRef, useState } from 'react';
import './landing.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qmdewocktouqoibbqurh.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KwkQawb1Kv2jOk1Wud0xUg_mPQxPqmL';

const SCENES = ['hero', 'hook', 'how', 'score', 'vibe', 'safety', 'join'];

// Deterministic decorative elements (no Math.random → no hydration mismatch).
const PARTICLES = [
  { l: 8, t: 70, s: 6, d: 14, delay: 0 }, { l: 18, t: 30, s: 4, d: 18, delay: 3 },
  { l: 28, t: 80, s: 8, d: 16, delay: 1 }, { l: 40, t: 20, s: 5, d: 20, delay: 5 },
  { l: 52, t: 60, s: 7, d: 15, delay: 2 }, { l: 63, t: 35, s: 4, d: 19, delay: 4 },
  { l: 72, t: 75, s: 6, d: 17, delay: 0 }, { l: 82, t: 25, s: 9, d: 22, delay: 6 },
  { l: 90, t: 55, s: 5, d: 16, delay: 2 }, { l: 35, t: 90, s: 5, d: 21, delay: 3 },
  { l: 58, t: 12, s: 6, d: 18, delay: 1 }, { l: 12, t: 45, s: 7, d: 23, delay: 5 },
];
const STREAKS = [{ t: 22, r: -8 }, { t: 48, r: 6 }, { t: 70, r: -4 }, { t: 86, r: 10 }];
const STARS = [
  [6, 12], [14, 28], [22, 8], [31, 22], [38, 14], [46, 30], [54, 10], [61, 24],
  [69, 16], [77, 9], [84, 26], [91, 18], [9, 40], [27, 44], [44, 48], [58, 42],
  [73, 46], [88, 40], [18, 18], [50, 20], [66, 34], [82, 12],
];

const STEPS = [
  { ico: '💘', h: 'Volley', p: 'Send a spark to someone you fancy. Two Volleys back and it’s a Match.' },
  { ico: '👋', h: 'Connect', p: 'Looking for a doubles partner? Connect with players on your level.' },
  { ico: '🎾', h: 'Play again', p: 'Loved the game? Rematch someone you’ve already played with.' },
  { ico: '💬', h: 'Serve', p: 'Break the ice with a Serve — your first message, your move.' },
];

const SCORE_BARS = [
  { label: 'Skill match', v: 88 },
  { label: 'Play style', v: 81 },
  { label: 'Availability', v: 76 },
  { label: 'Location', v: 94 },
];

const SAFETY = [
  { ico: '🛡️', h: 'Verified profiles', p: 'Real players, real courts. We keep the community genuine.' },
  { ico: '🚫', h: 'Block & report', p: 'Full control, always. Block or report anyone in a tap.' },
  { ico: '🇬🇧', h: 'Privacy by design', p: 'UK-built, GDPR-first. Your data is yours — never sold.' },
];

const R = 52;
const CIRC = 2 * Math.PI * R;

export default function Home() {
  const [active, setActive] = useState(0);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | invalid | loading | success | error
  const [score, setScore] = useState({ count: 0, offset: CIRC, bars: SCORE_BARS.map(() => 0) });
  const sceneRefs = useRef([]);

  // Mount: snap class + observers + parallax
  useEffect(() => {
    document.documentElement.classList.add('landing-active');

    const reveals = document.querySelectorAll('.reveal');
    const revealIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.15 }
    );
    reveals.forEach((el) => revealIO.observe(el));

    let scoreDone = false;
    const sceneIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = sceneRefs.current.indexOf(e.target);
          if (idx >= 0) setActive(idx);
          if (e.target.id === 'score' && !scoreDone) { scoreDone = true; runScore(); }
        });
      },
      { threshold: 0.5 }
    );
    sceneRefs.current.forEach((el) => el && sceneIO.observe(el));

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layers = Array.from(document.querySelectorAll('[data-parallax]'));
    let raf = 0;
    const onScroll = () => {
      if (reduce || raf) return;
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const mid = vh / 2;
        for (const el of layers) {
          const rect = el.getBoundingClientRect();
          const delta = rect.top + rect.height / 2 - mid;
          const speed = parseFloat(el.dataset.speed || '0');
          el.style.transform = `translate3d(0, ${(delta * speed).toFixed(1)}px, 0)`;
        }
        // Outgoing-page depth: as the next scene slides up to cover this pinned
        // one, ease it back with a slight scale-down + fade.
        const scenes = sceneRefs.current;
        for (let i = 0; i < scenes.length; i++) {
          const sc = scenes[i];
          if (!sc) continue;
          const nx = scenes[i + 1];
          const cover = nx ? Math.min(1, Math.max(0, 1 - nx.getBoundingClientRect().top / vh)) : 0;
          sc.style.transform = `scale(${(1 - 0.07 * cover).toFixed(4)})`;
          sc.style.opacity = (1 - 0.5 * cover).toFixed(3);
        }
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      document.documentElement.classList.remove('landing-active');
      revealIO.disconnect();
      sceneIO.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  function runScore() {
    const target = 92;
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore({
        count: Math.round(eased * target),
        offset: CIRC * (1 - (eased * target) / 100),
        bars: SCORE_BARS.map((b) => Math.round(eased * b.v)),
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function go(i) {
    sceneRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
  }

  async function joinWaitlist(e) {
    e?.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setStatus('invalid'); return; }
    setStatus('loading');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_email: email.trim(), p_source: 'landing' }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setEmail('');
    } catch { setStatus('error'); }
  }

  const setScene = (i) => (el) => { sceneRefs.current[i] = el; };

  return (
    <div className="lp">
      <div className="lp-ambient" />


      {/* Progress dots */}
      <div className="lp-dots">
        {SCENES.map((s, i) => (
          <button key={s} className={active === i ? 'on' : ''} aria-label={`Go to section ${i + 1}`} onClick={() => go(i)} />
        ))}
      </div>

      {/* 1 — HERO (layered parallax depth: back → front) */}
      <section id="hero" ref={setScene(0)} className="scene hero">
        {/* PLANE 1 · far background — skyline + stars (lags, slowest) */}
        <div className="hero-bg layer" data-parallax data-speed="-0.32" aria-hidden="true">
          <div className="stars">
            {STARS.map(([l, t], i) => (
              <span key={i} className="star" style={{ left: `${l}%`, top: `${t}%` }} />
            ))}
          </div>
          <svg className="skyline" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <path d="M0,220 V120 h60 v-30 h40 v50 h70 v-80 h50 v60 h60 V70 h40 v90 h80 v-50 h50 v30 h60 V40 h44 v120 h70 v-40 h50 v60 h80 V90 h40 v70 h70 v-30 h50 v40 h60 V60 h44 v100 h80 v-50 h50 v70 h120 V120 h60 v100 Z" />
          </svg>
          <svg className="skyline skyline-glow" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <path d="M0,120 h60 v-30 h40 v50 h70 v-80 h50 v60 h60 V70 h40 v90 h80 v-50 h50 v30 h60 V40 h44 v120 h70 v-40 h50 v60 h80 V90 h40 v70 h70 v-30 h50 v40 h60 V60 h44 v100 h80 v-50 h50 v70 h120 V120 h60" />
          </svg>
        </div>

        {/* PLANE 2 · deep midground — hero photo (replaces the padel ball) */}
        <div className="hero-photo layer" data-parallax data-speed="-0.06" aria-hidden="true" />

        {/* PLANE 3 · midground — neon court streaks */}
        <div className="streaks layer" data-parallax data-speed="0.14" aria-hidden="true">
          {STREAKS.map((s, i) => (
            <span key={i} className="streak" style={{ top: `${s.t}%`, transform: `rotate(${s.r}deg)` }} />
          ))}
        </div>

        {/* PLANE 4 · near — big blurred light orbs */}
        <div className="hero-orbs layer" data-parallax data-speed="0.30" aria-hidden="true">
          <span className="hero-orb orb-a" />
          <span className="hero-orb orb-b" />
        </div>

        {/* PLANE 5 · nearest — drifting particles (fastest) */}
        <div className="particles layer" data-parallax data-speed="0.50" aria-hidden="true">
          {PARTICLES.map((p, i) => (
            <span key={i} className="particle" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />
          ))}
        </div>

        {/* Foreground court-net silhouette (moves fast) */}
        <div className="hero-net layer" data-parallax data-speed="0.42" aria-hidden="true" />

        <div className="scene-inner">
          <div className="hero-wordmark reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" /> <span>volpair</span>
          </div>
          <h1 className="display reveal" data-d="1">Every rally starts with a match.</h1>
          <div className="reveal hero-cta" data-d="3">
            <button className="btn-primary" onClick={() => go(6)}>Join the waitlist →</button>
            <button className="btn-ghost" onClick={() => go(2)}>How it works</button>
          </div>
          <p className="hero-note reveal" data-d="4">iOS · Android · coming soon</p>
        </div>
      </section>

      {/* 2 — HOOK */}
      <section id="hook" ref={setScene(1)} className="scene hook">
        <div className="scene-inner">
          <div className="reveal">
            <span className="eyebrow">Tired of swiping?</span>
            <h2 className="h2">Swiping is dead.<br /><span className="grad">Play is back.</span></h2>
            <p className="lead" style={{ marginTop: 22 }}>
              Endless swipes and dead-end small talk go nowhere. Meet people doing
              what you love — on the court, then off it. Real chemistry starts with a rally.
            </p>
          </div>
          <div
            className="photo layer reveal" data-d="2" data-parallax data-speed="0.14"
            role="img" aria-label="Two couples enjoying a padel match, smiling on a glass court"
            style={{ aspectRatio: '4 / 3', backgroundImage: 'url(/images/couples.jpg), linear-gradient(135deg,#1b0746,#0b0220)', backgroundSize: 'cover, cover', backgroundPosition: 'center' }}
          >
            <div className="photo-glow" />
          </div>
        </div>
      </section>

      {/* 3 — HOW IT WORKS */}
      <section id="how" ref={setScene(2)} className="scene how">
        <div className="scene-inner">
          <span className="eyebrow reveal">How it works</span>
          <h2 className="h2 reveal" data-d="1">Volley. Connect. Play.</h2>
          <div className="how-grid">
            {STEPS.map((s, i) => (
              <div key={s.h} className="card reveal" data-d={i + 1}>
                <span className="ico">{s.ico}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — THE SCORE */}
      <section id="score" ref={setScene(3)} className="scene score">
        <div className="scene-inner">
          <div className="ring-wrap reveal">
            <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7A3CDC" />
                  <stop offset="100%" stopColor="#00C8FF" />
                </linearGradient>
              </defs>
              <circle className="track" cx="60" cy="60" r={R} />
              <circle className="bar" cx="60" cy="60" r={R} strokeDasharray={CIRC} strokeDashoffset={score.offset} />
            </svg>
            <div className="ring-num"><b>{score.count}</b><span>volpair Score</span></div>
          </div>
          <div className="reveal" data-d="1">
            <span className="eyebrow">The volpair Score</span>
            <h2 className="h2">Chemistry, measured.</h2>
            <p className="lead" style={{ marginTop: 18 }}>
              Every player gets a compatibility score built from real court chemistry —
              play style, skill, when you play and where. The better the fit, the higher you climb.
            </p>
            <div className="bars">
              {SCORE_BARS.map((b, i) => (
                <div className="bar-row" key={b.label}>
                  <div className="bar-top"><span>{b.label}</span><span>{score.bars[i]}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${score.bars[i]}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 — VIBE */}
      <section id="vibe" ref={setScene(4)} className="scene vibe">
        <div className="scene-inner">
          <span className="eyebrow reveal">The vibe</span>
          <h2 className="h2 reveal" data-d="1">More than a match.</h2>
          <p className="lead reveal" data-d="2" style={{ margin: '18px auto 0' }}>Join the early community of players.</p>
          <div className="vibe-grid">
            <div className="photo layer reveal" data-parallax data-speed="0.14" role="img" aria-label="Padel player mid-swing on a glass court at golden hour" style={{ backgroundImage: 'url(/images/vibe-1.jpg), linear-gradient(135deg,#1b0746,#0b0220)', backgroundSize: 'cover, cover', backgroundPosition: 'center' }}><div className="photo-glow" /></div>
            <div className="photo reveal" data-d="1" role="img" aria-label="Couple sharing a moment courtside" style={{ backgroundImage: 'url(/images/vibe-2.jpg), linear-gradient(135deg,#1b0746,#0b0220)', backgroundSize: 'cover, cover', backgroundPosition: 'center' }}><div className="photo-glow" /></div>
            <div className="photo layer reveal" data-d="2" data-parallax data-speed="-0.10" role="img" aria-label="Friends toasting in a neon-lit club" style={{ backgroundImage: 'url(/images/vibe-3.jpg), linear-gradient(135deg,#1b0746,#0b0220)', backgroundSize: 'cover, cover', backgroundPosition: 'center' }}><div className="photo-glow" /></div>
            <div className="photo reveal" data-d="3" role="img" aria-label="Confident padel player holding a racket" style={{ backgroundImage: 'url(/images/vibe-4.jpg), linear-gradient(135deg,#1b0746,#0b0220)', backgroundSize: 'cover, cover', backgroundPosition: 'center' }}><div className="photo-glow" /></div>
          </div>
        </div>
      </section>

      {/* 6 — SAFETY */}
      <section id="safety" ref={setScene(5)} className="scene safety">
        <div className="scene-inner">
          <span className="eyebrow reveal">Safety &amp; trust</span>
          <h2 className="h2 reveal" data-d="1">Play it safe.</h2>
          <div className="safety-grid">
            {SAFETY.map((s, i) => (
              <div key={s.h} className="card reveal" data-d={i + 1}>
                <span className="ico">{s.ico}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — FINAL CTA */}
      <section id="join" ref={setScene(6)} className="scene final">
        <div className="scene-inner">
          <h2 className="display reveal">Be first on the court.</h2>
          <p className="lead reveal" data-d="1" style={{ margin: '20px auto 0' }}>
            Every rally starts with a match. Yours starts here.
          </p>
          <form className="wait-form reveal" data-d="2" onSubmit={joinWaitlist}>
            <input
              type="email" inputMode="email" placeholder="you@email.com" value={email}
              onChange={(e) => { setEmail(e.target.value); if (status !== 'idle') setStatus('idle'); }}
              aria-label="Email address"
            />
            <button className="btn-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Joining…' : status === 'success' ? 'You’re in ✓' : 'Join the waitlist'}
            </button>
          </form>
          <div className={`wait-msg ${status === 'success' ? 'ok' : (status === 'error' || status === 'invalid') ? 'err' : ''}`}>
            {status === 'success' && 'You’re on the list — we’ll be in touch. 🎾'}
            {status === 'invalid' && 'Please enter a valid email address.'}
            {status === 'error' && 'Something went wrong — please try again.'}
          </div>
          <div className="badges reveal" data-d="3">
            <span className="badge"> Download on the App Store · soon</span>
            <span className="badge">▶ Get it on Google Play · soon</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-cols">
            <div>
              <div className="lp-foot-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" /> volpair
              </div>
              <p className="ft-muted" style={{ maxWidth: 260 }}>The padel dating app. Every rally starts with a match.</p>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="https://support.volpair.com/legal/terms">Terms of Service</a>
              <a href="https://support.volpair.com/legal/privacy">Privacy Policy</a>
              <a href="https://support.volpair.com/legal/community-guidelines">Community Guidelines</a>
              <a href="https://support.volpair.com/legal/cookies">Cookie Policy</a>
              <a href="https://support.volpair.com/legal/subscription-terms">Subscription &amp; Refunds</a>
              <a href="https://support.volpair.com/legal/complaints">Complaints</a>
            </div>
            <div>
              <h4>Help &amp; Safety</h4>
              <a href="https://support.volpair.com/help">Help Centre</a>
              <a href="https://support.volpair.com/safety">Safety Centre</a>
              <a href="https://support.volpair.com/contact">Contact us</a>
            </div>
            <div>
              <h4>Contact</h4>
              <a href="mailto:support@volpair.com">support@volpair.com</a>
            </div>
          </div>
          <p className="lp-foot-base">© {new Date().getFullYear()} volpair · volpair Ltd (UK). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
