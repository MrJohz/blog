const MODE = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "light"
  : "dark";

window.toggletheme = () => {
  document.body.classList.toggle(MODE);
};

function handleShare() {
  document.body.append(`can share? ${navigator.canShare}`);
  if (!navigator.canShare) return;
  document.body.append(`can share 2? ${navigator.canShare({ text: "???" })}`);
  if (!navigator.canShare({ text: "???" })) return;
  document.body.append(`has element? ${document.getElementById("share")}`);
  const shareButton = document.getElementById("share");
  if (!shareButton) return;

  document.body.append("added class");
  document.body.classList.add("share-enabled");

  document.body.append("added click listener");
  shareButton.addEventListener("click", () => {
    console.log("clicked!");
    console.log(
      navigator.share({
        text: "???",
      })
    );
  });
}

try {
  handleShare();
} catch (e) {
  const pre = document.createElement("pre");
  pre.innerText = e.stack;
  document.body.append(pre);
}
