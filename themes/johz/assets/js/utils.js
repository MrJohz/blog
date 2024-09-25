const MODE = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "light"
  : "dark";

window.toggletheme = () => {
  document.body.classList.toggle(MODE);
};

function handleShare() {
  // N.B. this code is difficult to debug as it requires the right browser,
  // the right device _and_ must be served via a secure context.
  if (!navigator.canShare) return;
  if (!navigator.canShare({ text: "???" })) return;
  const shareButton = document.getElementById("share");
  if (!shareButton) return;

  document.body.classList.add("share-enabled");

  shareButton.addEventListener("click", () => {
    console.log("clicked!");
    console.log(
      navigator.share({
        text: document.title,
        url: String(document.location),
        title: document.title,
      })
    );
  });
}
