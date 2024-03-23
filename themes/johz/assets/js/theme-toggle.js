const MODE = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "light"
  : "dark";

window.toggletheme = () => {
  document.body.classList.toggle(MODE);
};
