import { QRCode } from "vendored/qrcode.min";

const ASSASSIN_ICON = `<svg viewBox="0 0 24 24" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-miterlimit:10;stroke-width:1.91px;}</style></defs><path class="cls-1" d="M14.86,13.91A2.86,2.86,0,1,0,10.09,16v1.7h3.82V16A2.85,2.85,0,0,0,14.86,13.91Z"/><line class="cls-1" x1="16.77" y1="19.64" x2="13.91" y2="16.77"/><line class="cls-1" x1="9.56" y1="12.42" x2="7.23" y2="10.09"/><line class="cls-1" x1="16.77" y1="10.09" x2="14.44" y2="12.42"/><line class="cls-1" x1="10.09" y1="16.77" x2="7.23" y2="19.64"/><path class="cls-1" d="M14.86,6.27V1.5H9.14V6.27L5.37,7.53a2.86,2.86,0,0,0-2,2.72v9.39A2.86,2.86,0,0,0,6.27,22.5H17.73a2.86,2.86,0,0,0,2.86-2.86V10.25a2.86,2.86,0,0,0-2-2.72Z"/><line class="cls-1" x1="7.23" y1="1.5" x2="16.77" y2="1.5"/></svg>`;
const AGENT_ICON = `<svg viewBox="0 0 24 24" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-miterlimit:10;stroke-width:1.91px;}</style></defs><path class="cls-1" d="M21,17.07l-5.27,1.17a17.09,17.09,0,0,1-3.77.42h0a17.09,17.09,0,0,1-3.77-.42L3,17.07A1.86,1.86,0,0,1,1.5,15.26h0a1.86,1.86,0,0,1,2.27-1.82l4.46,1a17.7,17.7,0,0,0,3.77.41h0a17.7,17.7,0,0,0,3.77-.41l4.46-1a1.86,1.86,0,0,1,2.27,1.82h0A1.86,1.86,0,0,1,21,17.07Z"/><path class="cls-1" d="M5.34,10l2.89.64A17.7,17.7,0,0,0,12,11a17.7,17.7,0,0,0,3.77-.41L18.66,10"/><path class="cls-1" d="M4.73,13.65l1.2-7.23A2.48,2.48,0,0,1,8.38,4.34a2.45,2.45,0,0,1,1.39.42L12,6.25l2.23-1.49a2.45,2.45,0,0,1,1.39-.42,2.49,2.49,0,0,1,1.61.59,2.46,2.46,0,0,1,.84,1.49l1.2,7.23"/></svg>`;

const AGENT = "ag";
const ASSASSIN = "as";
const BYSTANDER = "by";

const $GRID = document.getElementById("codenames");
const $SIDE = document.getElementById("side");
const $SHARE_LINK = document.getElementById("share-link");
const $COPY_SHARE_LINK = document.getElementById("copy-share-link");
const $SHARE_QR = document.getElementById("share-qr");

const ICON_MAP = { [AGENT]: AGENT_ICON, [ASSASSIN]: ASSASSIN_ICON };
const CARDS = [
  [AGENT, ASSASSIN],
  [AGENT, BYSTANDER],
  [AGENT, BYSTANDER],
  [AGENT, BYSTANDER],
  [AGENT, BYSTANDER],
  [AGENT, BYSTANDER],
  [AGENT, AGENT],
  [AGENT, AGENT],
  [AGENT, AGENT],
  [BYSTANDER, AGENT],
  [BYSTANDER, AGENT],
  [BYSTANDER, AGENT],
  [BYSTANDER, AGENT],
  [BYSTANDER, AGENT],
  [ASSASSIN, AGENT],
  [ASSASSIN, BYSTANDER],
  [ASSASSIN, ASSASSIN],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, BYSTANDER],
  [BYSTANDER, ASSASSIN],
];

const state = getGameState();

for (const el of [$COPY_SHARE_LINK, $SHARE_LINK]) {
  el.addEventListener("click", () => {
    $SHARE_LINK.select();
    // TODO: just how deprecated is `execCommand`?
    document.execCommand("copy");
  });
}

shuffle(CARDS, state);
render(CARDS, state);

function render(cards, state) {
  const panels = [];
  for (const pair of cards) {
    const card = pair[state.player - 1];
    panels.push(`<div class="${card}">${ICON_MAP[card] ?? ""}</div>`);
  }

  $GRID.innerHTML = panels.join("");
  $SIDE.innerText = state.player === 1 ? "one" : "two";

  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("player", Number(!(state.player - 1)) + 1);
  url.searchParams.set("seed", state.seed);
  $SHARE_LINK.value = url.href;
  new QRCode($SHARE_QR, url.href);
}

function shuffle(array, state) {
  const rand = sfc32(state.seed, 0, 0, 0);

  // Randomize array in-place using Durstenfeld shuffle algorithm
  // https://stackoverflow.com/a/12646864
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getGameState() {
  const url = new URL(location.href);
  let player = Number(url.searchParams.get("player"));
  if (Number.isNaN(player) || player < 1 || player > 2) player = 1;
  let seed = Number(url.searchParams.get("seed") ?? NaN);
  if (Number.isNaN(seed)) seed = (Math.random() * 2 ** 32) >>> 0;

  url.search = "";
  url.searchParams.set("player", player);
  url.searchParams.set("seed", seed);
  history.replaceState(null, "", url.href);

  return { player, seed };
}

function sfc32(a, b, c, d) {
  // simple seeded random number generator
  // https://stackoverflow.com/a/47593316
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
