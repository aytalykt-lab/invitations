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
];
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
