const cfg = window.INVITE || {};
const startsAt = new Date(cfg.startsAt || "2027-09-18T18:00:00+09:00");

const cover = document.getElementById("cover");
const openBtn = document.getElementById("open");
const music = document.getElementById("music");
const soundBtn = document.getElementById("sound");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Обложка и музыка ---------- */

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
  if (cover.classList.contains("is-open")) return;
  playMusic();
  // 1) печать исчезает, 2) клапан откидывается, 3) письмо выезжает, 4) обложка уходит
  cover.classList.add("is-open");
  if (typeof onOpen === "function") onOpen();
  const reveal = reduceMotion ? 200 : 2300;
  window.setTimeout(() => {
    cover.classList.add("is-gone");
    document.body.classList.remove("is-locked");
    document.body.classList.add("is-live");
    window.scrollTo(0, 0);
  }, reveal);
  window.setTimeout(() => {
    cover.hidden = true;
  }, reveal + 1300);
});

soundBtn.addEventListener("click", () => {
  if (music.paused) {
    music.play().then(() => setSound(true)).catch(() => setSound(false));
  } else {
    music.pause();
    setSound(false);
  }
});

// Музыка не играет, пока гость свернул страницу.
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

/* ---------- Календарь ---------- */

function buildCalendar() {
  const el = document.getElementById("cal");
  if (!el) return;
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

/* ---------- Таймер: клетки создаются один раз ---------- */

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
    if (!el.classList.contains("is-over")) {
      el.classList.add("is-over");
      el.textContent = "Торжество началось";
    }
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
    showHint(answer === "yes" ? "Благодарим! Ваше место за столом уже ждёт." : "Очень жаль. Спасибо, что предупредили.");
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

/* ---------- Появление блоков: только через IntersectionObserver ---------- */

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
    { threshold: 0.14 }
  );
  revealItems.forEach((el) => io.observe(el));
}

buildCalendar();
tick();
window.setInterval(tick, 1000);
