const studio = window.STUDIO || {};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Название направления — из config.js */
if (studio.name) {
  document.querySelectorAll("[data-studio-name]").forEach((el) => {
    el.textContent = studio.name;
  });
}

/* Кнопки связи: показываем только заполненные */
const channels = [
  ["telegram", "Написать в Telegram"],
  ["whatsapp", "Написать в WhatsApp"],
  ["max", "Написать в MAX"],
  ["kwork", "Заказать на Kwork"],
];

/* Отзывы: блок появляется, только когда в config.js есть записи */
const reviews = Array.isArray(studio.reviews) ? studio.reviews.filter((r) => r && String(r.text || "").trim()) : [];
const reviewsSection = document.getElementById("reviews");
const quotes = document.getElementById("quotes");
if (reviews.length && reviewsSection && quotes) {
  reviews.forEach((r) => {
    const fig = document.createElement("figure");
    fig.className = "quote";
    const text = document.createElement("blockquote");
    text.textContent = String(r.text).trim();
    const cap = document.createElement("figcaption");
    const who = document.createElement("strong");
    who.textContent = String(r.name || "").trim();
    cap.appendChild(who);
    if (String(r.event || "").trim()) {
      const ev = document.createElement("span");
      ev.textContent = String(r.event).trim();
      cap.appendChild(ev);
    }
    fig.append(text, cap);
    quotes.appendChild(fig);
  });
  reviewsSection.hidden = false;
}
const box = document.getElementById("contact-btns");
const empty = document.getElementById("contact-empty");
let shown = 0;
channels.forEach(([key, label]) => {
  const href = String(studio[key] || "").trim();
  if (!href.startsWith("http")) return;
  const a = document.createElement("a");
  a.className = shown === 0 ? "btn" : "btn btn-ghost";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  const span = document.createElement("span");
  span.textContent = label;
  a.appendChild(span);
  box.appendChild(a);
  shown += 1;
});
if (shown === 0 && empty) empty.hidden = false;

/* Появление блоков при прокрутке */
const items = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  items.forEach((el) => el.classList.add("is-in"));
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
  items.forEach((el) => io.observe(el));
}

/* Веер телефонов на обложке слегка раскрывается при прокрутке */
const fan = document.querySelector(".fan");
if (fan && !reduceMotion) {
  let ticking = false;
  const update = () => {
    const p = Math.min(1, window.scrollY / 500);
    fan.style.setProperty("--open", p.toFixed(3));
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
}
