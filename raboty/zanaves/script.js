const cfg = window.INVITE || {};
const startsAt = new Date(cfg.startsAt || "2027-07-10T16:00:00+09:00");

const curtain = document.getElementById("curtain");
const openBtn = document.getElementById("open");
const music = document.getElementById("music");
const soundBtn = document.getElementById("sound");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Занавес и музыка ---------- */

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
  if (curtain.classList.contains("is-open")) return;
  playMusic();
  curtain.classList.add("is-open");
  document.body.classList.remove("is-locked");
  document.body.classList.add("is-live");
  window.scrollTo(0, 0);
  window.setTimeout(() => {
    curtain.hidden = true;
  }, reduceMotion ? 300 : 2600);
});

soundBtn.addEventListener("click", () => {
  if (music.paused) {
    music.play().then(() => setSound(true)).catch(() => setSound(false));
  } else {
    music.pause();
    setSound(false);
  }
});

// Музыка не должна играть, когда гость свернул страницу.
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

  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = вс
  const offset = (first + 6) % 7; // понедельник — первый
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

/* ---------- Таймер ---------- */

function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

function tick() {
  const el = document.getElementById("countdown");
  if (!el) return;
  const diff = startsAt.getTime() - Date.now();
  if (diff <= 0) {
    el.textContent = "Занавес поднят — праздник начался";
    el.classList.add("is-over");
    return;
  }
  const s = Math.floor(diff / 1000);
  const units = [
    [Math.floor(s / 86400), ["день", "дня", "дней"]],
    [Math.floor((s % 86400) / 3600), ["час", "часа", "часов"]],
    [Math.floor((s % 3600) / 60), ["минута", "минуты", "минут"]],
    [s % 60, ["секунда", "секунды", "секунд"]],
  ];
  el.replaceChildren(
    ...units.map(([value, forms]) => {
      const cell = document.createElement("div");
      const num = document.createElement("b");
      num.textContent = String(value).padStart(2, "0");
      const cap = document.createElement("span");
      cap.textContent = plural(value, forms);
      cell.append(num, cap);
      return cell;
    })
  );
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
      showHint("Напишите имя и фамилию, чтобы мы знали, чьё это место.", true);
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
        ? "Место за вами. До встречи в зале!"
        : "Жаль, что не получится. Спасибо, что предупредили."
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
    { threshold: 0.18 }
  );
  revealItems.forEach((el) => io.observe(el));
}

buildCalendar();
tick();
window.setInterval(tick, 1000);
