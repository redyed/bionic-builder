function initBtnPrimarySheen(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  document.querySelectorAll<HTMLElement>(".btn-primary").forEach((btn) => {
    btn.addEventListener("pointermove", (event) => {
      const rect = btn.getBoundingClientRect();

      btn.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      btn.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

initBtnPrimarySheen();
