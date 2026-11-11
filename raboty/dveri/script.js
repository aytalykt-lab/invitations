const cfg = window.INVITE || {};
const startsAt = new Date(cfg.startsAt || "2027-09-18T18:00:00+09:00");

const gate = document.getElementById("gate");
const openBtn = document.getElementById("open");
const music = document.getElementById("music");
const soundBtn = document.getElementById("sound");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GOLD = ["#f0dca6", "#c8a45c", "#e6c987", "#fff6dc", "#a8853f"];

/* ---------- Имя по буквам ---------- */

document.querySelectorAll(".split").forEach((el) => {
  const text = el.textContent;
  const base = Number(el.dataset.delay) || 0;
  el.setAttribute("aria-label", text);
  el.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.setAttribute("aria-hidden", "true");
    s.style.animationDelay = `${(1.9 + base + i * 0.07).toFixed(2)}s`;
    el.appendChild(s);
  });
});

/* ---------- Двери и музыка ---------- */

function setSound(playing) {
  soundBtn.hidden = false;
  soundBtn.setAttribute("aria-pressed", playing ? "true" : "false");
  soundBtn.setAttribute("aria-label", playing ? "Выключить музыку" : "Включить музыку");
  soundBtn.classList.toggle("is-off", !playing);
}

function playMusic() {
  music.volume = Number(cfg.volume) || 0.5;
  const p = music.play();
  if (p && typeof p.then === "function") {
    p.then(() => setSound(true)).catch(() => setSound(false));
  } else {
    setSound(!music.paused);
  }
}

openBtn.addEventListener("click", () => {
  if (gate.classList.contains("is-open")) return;
  playMusic();
  gate.classList.add("is-open");
  document.body.classList.remove("is-locked");
  document.body.classList.add("is-live");
  window.scrollTo(0, 0);
  if (!reduceMotion) {
    window.setTimeout(goldBurst, 700);
    startDust();
  }
  window.setTimeout(() => {
    gate.hidden = true;
  }, reduceMotion ? 300 : 3000);
});

soundBtn.addEventListener("click", () => {
  if (music.paused) {
    music.play().then(() => setSound(true)).catch(() => setSound(false));
  } else {
    music.pause();
    setSound(false);
  }
});

let pausedByTab = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !music.paused) {
    music.pause();
    pausedByTab = true;
  } else if (!document.hidden && pausedByTab) {
    pausedByTab = false;
    music.play().catch(() => setSound(false));
  }
});

/* ---------- Золотой салют при открытии дверей ---------- */

function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function goldBurst() {
  const canvas = document.getElementById("burst");
  if (!canvas) return;
  canvas.classList.add("is-on");
  const { ctx, w, h } = fitCanvas(canvas);
  const pieces = Array.from({ length: 110 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const speed = 5 + Math.random() * 9;
    return {
      x: w / 2,
      y: h * 0.56,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: GOLD[Math.floor(Math.random() * GOLD.length)],
      round: Math.random() < 0.35,
    };
  });
  const started = performance.now();
  const life = 3400;

  function frame(now) {
    const t = now - started;
    ctx.clearRect(0, 0, w, h);
    pieces.forEach((p) => {
      p.vy += 0.16;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    if (t < life) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
      canvas.classList.remove("is-on");
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- Золотая пыль на главном экране ---------- */

let dustStarted = false;
function startDust() {
  const canvas = document.getElementById("dust");
  if (!canvas || dustStarted) return;
  dustStarted = true;
  let { ctx, w, h } = fitCanvas(canvas);
  const motes = Array.from({ length: 46 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.6 + Math.random() * 1.8,
    vy: 0.12 + Math.random() * 0.35,
    drift: Math.random() * Math.PI * 2,
    blink: Math.random() * Math.PI * 2,
  }));
  let visible = true;

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) requestAnimationFrame(frame);
    }).observe(canvas);
  }
  window.addEventListener("resize", () => {
    ({ ctx, w, h } = fitCanvas(canvas));
  });

  function frame() {
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, w, h);
    motes.forEach((m) => {
      m.y += m.vy;
      m.drift += 0.01;
      m.blink += 0.03;
      m.x += Math.sin(m.drift) * 0.25;
      if (m.y > h + 4) {
        m.y = -4;
        m.x = Math.random() * w;
      }
      ctx.globalAlpha = 0.25 + (Math.sin(m.blink) + 1) * 0.3;
      ctx.fillStyle = "#f0dca6";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
}

/* ---------- Календарь ---------- */

function buildCalendar() {
  const el = document.getElementById("cal");
  if (!el) return;
  // День и месяц считаем по времени Якутска, а не по часам гостя.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yakutsk",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(startsAt);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const year = get("year");
  const month = get("month");
  const day = get("day");

  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (first + 6) % 7;
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const frag = document.createDocumentFragment();
  ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].forEach((name) => {
    const s = document.createElement("span");
    s.className = "cal-wd";
    s.textContent = name;
    frag.appendChild(s);
  });
  for (let i = 0; i < offset; i += 1) frag.appendChild(document.createElement("span"));
  for (let d = 1; d <= total; d += 1) {
    const s = document.createElement("span");
    s.textContent = String(d);
    if (d === day) s.className = "cal-day";
    frag.appendChild(s);
  }
  el.appendChild(frag);
}

/* ---------- Таймер: цифра «перелистывается» при смене ---------- */

function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

const UNITS = [
  ["день", "дня", "дней"],
  ["час", "часа", "часов"],
  ["минута", "минуты", "минут"],
  ["секунда", "секунды", "секунд"],
];
let cells = null;

function tick() {
  const el = document.getElementById("countdown");
  if (!el) return;
  const diff = startsAt.getTime() - Date.now();
  if (diff <= 0) {
    el.textContent = "Торжество началось";
    el.classList.add("is-over");
    return;
  }
  const s = Math.floor(diff / 1000);
  const values = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];

  if (!cells) {
    cells = values.map(() => {
      const cell = document.createElement("div");
      const num = document.createElement("b");
      const cap = document.createElement("span");
      cell.append(num, cap);
      el.appendChild(cell);
      return { num, cap, last: null };
    });
  }
  values.forEach((value, i) => {
    const c = cells[i];
    if (c.last === value) return;
    c.last = value;
    c.num.textContent = String(value).padStart(2, "0");
    c.cap.textContent = plural(value, UNITS[i]);
    if (!reduceMotion) {
      c.num.classList.remove("flip");
      void c.num.offsetWidth;
      c.num.classList.add("flip");
    }
  });
}

/* ---------- Анкета гостя ---------- */

const guest = document.getElementById("guest");
const hint = document.getElementById("hint");

function showHint(text, isError) {
  hint.hidden = false;
  hint.textContent = text;
  hint.classList.toggle("is-error", Boolean(isError));
}

document.querySelectorAll("[data-answer]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = guest.value.trim();
    if (name.length < 3) {
      showHint("Пожалуйста, напишите имя и фамилию.", true);
      guest.focus();
      return;
    }
    const answer = btn.dataset.answer;
    const url = String(cfg.sheetsUrl || "").trim();
    if (url) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ name, answer, at: new Date().toISOString() }),
      }).catch(() => {});
    }
    showHint(
      answer === "yes"
        ? "Благодарим! Ваше место за столом уже ждёт."
        : "Очень жаль. Спасибо, что предупредили."
    );
  });
});

/* ---------- Группа MAX ---------- */

const maxLink = document.getElementById("max-link");
const maxHref = String(cfg.maxGroupLink || "").trim();
if (maxLink && maxHref.startsWith("http")) {
  maxLink.href = maxHref;
  maxLink.target = "_blank";
  maxLink.rel = "noreferrer";
  maxLink.hidden = false;
}

/* ---------- Появление блоков при прокрутке ---------- */

const revealItems = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );
  revealItems.forEach((el) => io.observe(el));
}

buildCalendar();
tick();
window.setInterval(tick, 1000);
