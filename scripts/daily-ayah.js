// Picks one short ayah per day (same ayah all day) and rewrites the block
// between <!--AYAH_START--> and <!--AYAH_END--> in README.md.
// Text is fetched from the Al-Quran Cloud API, so nothing is typed by hand.
const fs = require("fs");

const TOTAL_AYAT = 6236;
const MAX_ARABIC_LENGTH = 170; // keep the card short and readable

function dayNumber() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

async function getAyah(n) {
  const url = `https://api.alquran.cloud/v1/ayah/${n}/editions/quran-uthmani,en.sahih,bn.bengali`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error " + res.status);
  const json = await res.json();
  const [ar, en, bn] = json.data;
  return { ar, en, bn };
}

async function main() {
  // simple deterministic "random" number from the day
  let n = ((dayNumber() * 2654435761) % TOTAL_AYAT) + 1;
  let ayah = null;
  for (let tries = 0; tries < 60; tries++) {
    const candidate = await getAyah(n);
    if (candidate.ar.text.length <= MAX_ARABIC_LENGTH) { ayah = candidate; break; }
    n = (n % TOTAL_AYAT) + 1;
  }
  if (!ayah) throw new Error("No suitable ayah found");

  const ref = `Surah ${ayah.ar.surah.englishName} ${ayah.ar.surah.number}:${ayah.ar.numberInSurah}`;
  const block =
`<p align="center">
  <sub>✦ AYAH OF THE DAY ✦</sub>
</p>
<h3 align="center" dir="rtl">${ayah.ar.text}</h3>
<p align="center"><i>${ayah.en.text}</i></p>
<p align="center">${ayah.bn.text}</p>
<p align="center"><sub>— ${ref}</sub></p>`;

  const today = new Date().toISOString().slice(0, 10);
  let readme = fs.readFileSync("README.md", "utf8");
  readme = readme.replace(/<!--AYAH_START-->[\s\S]*?<!--AYAH_END-->/, `<!--AYAH_START-->\n${block}\n<!--AYAH_END-->`);
  readme = readme.replace(/<!--UPDATED_START-->[\s\S]*?<!--UPDATED_END-->/, `<!--UPDATED_START-->${today}<!--UPDATED_END-->`);
  fs.writeFileSync("README.md", readme);
  console.log("Updated with", ref);
}

main().catch((e) => { console.error(e); process.exit(1); });
