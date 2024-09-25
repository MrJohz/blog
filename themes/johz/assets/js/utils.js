const MODE = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "light"
  : "dark";

window.toggletheme = () => {
  document.body.classList.toggle(MODE);
};

function handleShare() {
  // N.B. this code is difficult to debug as it requires the right browser,
  // the right device _and_ must be served via a secure context.
  const share = {
    text: document.title,
    url: String(document.location),
    title: document.title,
  };

  document.body.append(`to share: ${JSON.stringify(share)}`);
  if (!navigator.canShare) return;
  if (!navigator.canShare(share)) return;
  const shareButton = document.getElementById("share");
  if (!shareButton) return;

  document.body.append("added class");
  document.body.classList.add("share-enabled");

  document.body.append("added click listener");
  shareButton.addEventListener("click", () => navigator.share(share));
}

try {
  handleShare();
} catch (e) {
  const pre = document.createElement("pre");
  pre.innerText = e.stack;
  document.body.append(pre);
}
