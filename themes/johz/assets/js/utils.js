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

  if (!navigator.canShare) return;
  if (!navigator.canShare(share)) return;
  const shareButton = document.getElementById("share");
  if (!shareButton) return;

  document.body.classList.add("share-enabled");

  shareButton.addEventListener("click", () => navigator.share(share));
}

handleShare();

function handleEmailSubstitution() {
  const emailElements = document.getElementsByClassName("email");
  for (const el of emailElements) {
    const email = Array.from(el.childNodes)
      .filter((each) => each.nodeType === Node.TEXT_NODE)
      .map((each) => each.textContent)
      .join("");

    const node = document.createElement("a");
    node.href = `mailto:${email}`;
    node.appendChild(new Text(email));
    el.replaceWith(node);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  handleEmailSubstitution();
  handleShare();
});
