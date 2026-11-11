const cfg = window.INVITE || {};
const startsAt = new Date(cfg.startsAt || "2027-06-26T15:00:00+09:00");

const gate = document.getElementById("gate");
const openBtn = document.getElementById("open");
const music = document.getElementById("music");
const soundBtn = document.getElementById("sound");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    s.style.animationDelay = `${(2.1 + base + i * 0.09).toFixed(2)}s`;
    el.appendChild(s);
  });
});

/* ---------- Пробка и музыка ---------- */

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
    window.setTimeout(goldBurst, 450);
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

/* ---------- Пузырьки: всплеск при открытии и лёгкая игра на главном экране ---------- */

function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function drawBubble(ctx, x, y, r, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 244, 236, 0.22)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 236, 214, 0.95)";
  ctx.stroke();
  // блик
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, Math.max(0.6, r * 0.18), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();
}

// Пена и пузырьки вылетают из горлышка бутылки вместе с пробкой.
function goldBurst() {
  const canvas = document.getElementById("burst");
  if (!canvas) return;
  canvas.classList.add("is-on");
  const { ctx, w, h } = fitCanvas(canvas);
  const pieces = Array.from({ length: 150 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 4 + Math.random() * 13;
    return {
      x: w / 2 + (Math.random() - 0.5) * 16,
      y: h * 0.42,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 2 + Math.random() * 9,
      wob: Math.random() * Math.PI * 2,
    };
  });
  const started = performance.now();
  const life = 3600;

  function frame(now) {
    const t = now - started;
    ctx.clearRect(0, 0, w, h);
    pieces.forEach((p) => {
      p.vy = p.vy * 0.97 - 0.05; // пузырьки замедляются и всплывают
      p.vx *= 0.97;
      p.wob += 0.08;
      p.x += p.vx + Math.sin(p.wob) * 0.6;
      p.y += p.vy;
      drawBubble(ctx, p.x, p.y, p.r, Math.max(0, 1 - t / life));
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

let dustStarted = false;
function startDust() {
  const canvas = document.getElementById("dust");
  if (!canvas || dustStarted) return;
  dustStarted = true;
  let { ctx, w, h } = fitCanvas(canvas);
  const motes = Array.from({ length: 34 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1.5 + Math.random() * 5,
    vy: 0.25 + Math.random() * 0.7,
    wob: Math.random() * Math.PI * 2,
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
      m.y -= m.vy;
      m.wob += 0.03;
      m.x += Math.sin(m.wob) * 0.35;
      if (m.y < -10) {
        m.y = h + 10;
        m.x = Math.random() * w;
      }
      drawBubble(ctx, m.x, m.y, m.r, 0.55);
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
    el.textContent = "Девичник начался!";
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
      showHint("Напиши, пожалуйста, имя и фамилию.", true);
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
        ? "Ура! Бокал с твоим именем уже охлаждается."
        : "Жаль! Будем скучать и пришлём фото."
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
