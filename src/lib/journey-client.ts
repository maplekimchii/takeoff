// Interactive journey map (About page). Only the slider changes steps; the map
// itself has no pointer handlers, so it never blocks page scrolling.
import {
  H, VIS, W, cameraFor, formatKm, heading, legSamples, project, shortestDelta, toScreen,
  type Camera, type Pt,
} from './journey';

type City = { code: string; city: string; km: number; lon: number; lat: number; label: string };

const LIFT = [0, 7, 13, 13, 13, 13, 0];
const PITCH = [0, 5, 0, 0, 0, 0, 0];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initJourney(root: HTMLElement) {
  const cities: City[] = JSON.parse(root.dataset.journey!);
  const last = cities.length;
  const total = cities[last - 1].km;
  const legs = cities.slice(0, -1).map((_, i) => legSamples(cities, i));
  const world = root.querySelector<HTMLElement>('.world')!;
  const plane = root.querySelector<HTMLElement>('.plane')!;
  const pins = [...root.querySelectorAll<HTMLElement>('[data-pin]')];
  const labels = [...root.querySelectorAll<HTMLElement>('[data-label]')];
  const paths = [...root.querySelectorAll<SVGPathElement>('[data-leg]')];
  const track = root.querySelector<HTMLElement>('.track')!;
  const progress = root.querySelector<HTMLElement>('.progress')!;
  const stops = [...root.querySelectorAll<HTMLElement>('[data-stop]')];
  const thumb = root.querySelector<HTMLElement>('.thumb')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const distance = root.querySelector<HTMLElement>('[data-distance]')!;
  const nowLabel = root.querySelector<HTMLElement>('[data-now-label]')!;
  const now = root.querySelector<HTMLElement>('[data-now]')!;
  const live = root.querySelector<HTMLElement>('[data-live]')!;
  const stage = root.querySelector<HTMLElement>('.stage')!;

  const wide = matchMedia('(min-width: 1024px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visH = () => (wide.matches ? VIS : H);
  const cam = (k: number) => cameraFor(k, cities, legs, visH());
  const restAngle = (k: number) =>
    k === 1 ? heading(legs[0][0], legs[0][1]) : heading(legs[k - 2].at(-2)!, legs[k - 2].at(-1)!);
  const legOpacity = (k: number, i: number) => (i < k - 2 ? 0.55 : i === k - 2 ? 1 : 0);
  const pct = (km: number) => (km / total) * 100;

  let step = Number(root.dataset.step) || 1;
  let anim = 0;
  let planeAngle = restAngle(step);

  function place(el: HTMLElement, [x, y]: Pt) {
    el.style.left = `${(x / W) * 100}%`;
    el.style.top = `${(y / H) * 100}%`;
  }

  function drawFrame(c: Camera, planeAt: Pt, angle: number) {
    world.style.transform = `translate(${(c.tx / W) * 100}%, ${(c.ty / H) * 100}%) scale(${c.s})`;
    cities.forEach((city, i) => {
      const p = toScreen(project(city), c);
      place(pins[i], p);
      place(labels[i], p);
    });
    place(plane, toScreen(planeAt, c));
    plane.style.setProperty('--rot', `${angle}deg`);
  }

  function setMarkers(k: number) {
    cities.forEach((_, i) => {
      const state = i === k - 1 ? 'current' : i < k - 1 ? 'visited' : 'future';
      for (const el of [pins[i], labels[i]]) {
        el.classList.remove('current', 'visited', 'future');
        el.classList.add(state);
      }
      stops[i].classList.toggle('reached', i <= k - 1);
      stops[i].classList.toggle('current', i === k - 1);
    });
  }

  function setHud(k: number) {
    const c = cities[k - 1];
    distance.textContent = formatKm(c.km);
    nowLabel.textContent = k === last ? 'Current base' : 'Now at';
    now.textContent = c.city.toUpperCase();
    now.classList.toggle('base', k === last);
    hint.textContent = k === 1 ? 'Slide to take off →' : k === last ? 'Tap to replay ↺' : 'Slide to continue →';
    track.setAttribute('aria-valuenow', String(k));
    track.setAttribute('aria-valuetext', `${c.city}, ${c.km.toLocaleString('en-CA')} km`);
  }

  function setThumb(km: number, lift: number, pitch: number) {
    thumb.style.left = `${pct(km)}%`;
    progress.style.width = `${pct(km)}%`;
    thumb.style.setProperty('--lift', String(lift));
    thumb.style.setProperty('--pitch', String(pitch));
  }

  function renderStatic(k: number) {
    planeAngle = restAngle(k);
    drawFrame(cam(k), project(cities[k - 1]), planeAngle);
    paths.forEach((p, i) => (p.style.opacity = String(legOpacity(k, i))));
    setMarkers(k);
    setHud(k);
    setThumb(cities[k - 1].km, LIFT[k - 1], PITCH[k - 1]);
  }

  function goTo(target: number, { replay = false } = {}) {
    target = Math.max(1, Math.min(last, target));
    if (anim) {
      cancelAnimationFrame(anim);
      anim = 0;
      renderStatic(step);
    }
    if (target === step) return;
    const from = step;
    step = target;
    live.textContent = `${cities[target - 1].city}, ${cities[target - 1].km.toLocaleString('en-CA')} km flown`;
    track.setAttribute('aria-valuenow', String(target));
    track.setAttribute('aria-valuetext', `${cities[target - 1].city}, ${cities[target - 1].km.toLocaleString('en-CA')} km`);

    if (reduced.matches) {
      renderStatic(target);
      stage.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
      return;
    }

    // Plane route: concatenated legs between the two stops (reversed when going back).
    const forward = target > from;
    let route: Pt[] = [];
    if (!replay) {
      const [a, b] = forward ? [from - 1, target - 2] : [target - 1, from - 2];
      for (let i = a; i <= b; i++) route = route.concat(i === a ? legs[i] : legs[i].slice(1));
      if (!forward) route.reverse();
    }

    const c0 = cam(from);
    const c1 = cam(target);
    const o0 = paths.map((_, i) => legOpacity(from, i));
    const o1 = paths.map((_, i) => legOpacity(target, i));
    const km0 = cities[from - 1].km;
    const km1 = cities[target - 1].km;
    const angle0 = planeAngle;
    const duration = replay ? 1200 : from === 1 && target === 2 ? 1600 : 1300;

    // Leaving: the origin turns into a visited stop; hide stops beyond the target when going back.
    setMarkers(Math.min(from, target));
    if (forward) {
      pins[from - 1].classList.replace('current', 'visited');
      labels[from - 1].classList.replace('current', 'visited');
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - t0) / duration);
      const t = ease(raw);
      const c = { s: lerp(c0.s, c1.s, t), tx: lerp(c0.tx, c1.tx, t), ty: lerp(c0.ty, c1.ty, t) };

      let at: Pt;
      let angle: number;
      if (replay) {
        at = project(raw < 0.5 ? cities[from - 1] : cities[target - 1]);
        angle = raw < 0.5 ? angle0 : restAngle(target);
        plane.style.opacity = String(Math.abs(1 - raw * 2));
      } else {
        const f = t * (route.length - 1);
        const n = Math.min(route.length - 2, Math.floor(f));
        const u = f - n;
        at = [lerp(route[n][0], route[n + 1][0], u), lerp(route[n][1], route[n + 1][1], u)];
        // Heading follows the route; ease in from the previous heading by the shortest turn.
        const sc = (p: Pt) => toScreen(p, c);
        const pathAngle = heading(sc(route[n]), sc(route[n + 1]));
        const blend = Math.min(1, raw / 0.2);
        angle = angle0 + shortestDelta(angle0, pathAngle) * blend;
      }
      drawFrame(c, at, angle);
      paths.forEach((p, i) => (p.style.opacity = String(lerp(o0[i], o1[i], t))));
      const km = lerp(km0, km1, t);
      distance.textContent = formatKm(Math.round(km));
      const kmPos = km;
      const segFrac = (target - 1 - (from - 1)) * t + (from - 1);
      const lo = Math.floor(segFrac);
      const hi = Math.min(last - 1, lo + 1);
      const fr = segFrac - lo;
      setThumb(kmPos, lerp(LIFT[lo], LIFT[hi], fr), lerp(PITCH[lo], PITCH[hi], fr));

      if (raw < 1) {
        anim = requestAnimationFrame(tick);
      } else {
        anim = 0;
        plane.style.opacity = '';
        renderStatic(target);
      }
    };
    anim = requestAnimationFrame(tick);
  }

  // ---- Slider input: drag the thumb, click a stop or the track, arrow keys ----
  const nearestStop = (clientX: number) => {
    const r = track.getBoundingClientRect();
    const km = ((clientX - r.left) / r.width) * total;
    let best = 0;
    cities.forEach((c, i) => {
      if (Math.abs(c.km - km) < Math.abs(cities[best].km - km)) best = i;
    });
    return best + 1;
  };

  let dragging = false;
  let startX = 0;
  let moved = false;
  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    startX = e.clientX;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    if (moved) {
      const k = nearestStop(e.clientX);
      if (k !== step) goTo(k);
    }
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (moved) return;
    // A tap: on the last step it replays; otherwise jump to the tapped stop
    // (or advance one step when tapping the thumb itself).
    if (step === last) return goTo(1, { replay: true });
    const k = nearestStop(e.clientX);
    goTo(k === step ? step + 1 : k);
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', () => (dragging = false));

  track.addEventListener('keydown', (e) => {
    const keys: Record<string, number> = {
      ArrowRight: step + 1, ArrowUp: step + 1, ArrowLeft: step - 1, ArrowDown: step - 1, Home: 1, End: last,
    };
    if (e.key in keys) {
      e.preventDefault();
      goTo(keys[e.key]);
    } else if ((e.key === 'Enter' || e.key === ' ') && step === last) {
      e.preventDefault();
      goTo(1, { replay: true });
    }
  });

  wide.addEventListener('change', () => !anim && renderStatic(step));
  renderStatic(step);
}
