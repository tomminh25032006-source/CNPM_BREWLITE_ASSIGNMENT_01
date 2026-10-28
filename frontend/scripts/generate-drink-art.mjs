// Sinh minh họa đồ uống dạng line-art (SVG) cho public/images. Chạy: node scripts/generate-drink-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const INK = '#2A1E17';
const CREAM = '#FBF7F0';

const drinks = {
  'ca-phe-sua': { kind: 'iced', layers: ['#C89B6D', '#6B3E26'] },
  'ca-phe-den': { kind: 'iced', layers: ['#2B1A12'] },
  'bac-xiu': { kind: 'iced', layers: ['#EADBC3', '#B98559'] },
  americano: { kind: 'hot', liquid: '#3B2416', band: '#9C4A21' },
  cappuccino: { kind: 'hot', liquid: '#E9DCC6', art: 'heart', band: '#2F4A3A' },
  latte: { kind: 'hot', liquid: '#C8A27A', art: 'leaf', band: '#B08A3E' },
  'tra-dao': { kind: 'iced', layers: ['#E59A5B', '#F2B984'], garnish: 'peach' },
  'tra-vai': { kind: 'iced', layers: ['#F3D3CB', '#EDB9B0'], garnish: 'lychee' },
  'tra-sua-o-long': { kind: 'iced', layers: ['#C49A6C'], garnish: 'pearls' },
  'matcha-latte': { kind: 'iced', layers: ['#EFE8D6', '#8DAA5B'] },
  'cold-brew': { kind: 'iced', layers: ['#4A2A18'], garnish: 'orange' },
  cacao: { kind: 'iced', layers: ['#5A3524', '#7A4A30'] },
};

const frame = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
${body}
</svg>
`;

function hot({ liquid, art, band }) {
  const steam = [150, 200, 250]
    .map((x, i) => `<path d="M${x} ${120 - i * 6} c-14 -18 14 -30 0 -48 c-12 -16 10 -26 2 -40" stroke-width="3" opacity=".55"/>`)
    .join('\n');
  const artSvg =
    art === 'heart'
      ? `<path d="M200 252 c-18 -14 -30 -24 -30 -36 a14 14 0 0 1 30 -6 a14 14 0 0 1 30 6 c0 12 -12 22 -30 36z" fill="#B98559" stroke="none"/>`
      : art === 'leaf'
        ? `<path d="M200 205 v48 M200 214 l-20 -6 M200 224 l22 -7 M200 234 l-24 -6 M200 244 l22 -5" stroke="${CREAM}" stroke-width="3"/>`
        : '';
  return frame(`${steam}
<ellipse cx="200" cy="372" rx="150" ry="26" fill="${CREAM}"/>
<ellipse cx="200" cy="366" rx="96" ry="12" stroke-width="2.5" opacity=".5"/>
<path d="M330 250 c48 0 52 70 -2 74" fill="none" stroke-width="10"/>
<path d="M330 250 c48 0 52 70 -2 74" fill="none" stroke="${CREAM}" stroke-width="3"/>
<path d="M90 230 h240 c0 70 -40 128 -120 128 c-80 0 -120 -58 -120 -128z" fill="${CREAM}"/>
<path d="M98 270 h224" stroke="${band}" stroke-width="8"/>
<path d="M102 284 h216" stroke="${band}" stroke-width="2.5"/>
<ellipse cx="210" cy="230" rx="120" ry="26" fill="${CREAM}"/>
<ellipse cx="210" cy="230" rx="104" ry="18" fill="${liquid}"/>
${artSvg.replace(/200 /g, '210 ')}`);
}

function iced({ layers, garnish }) {
  const top = 150;
  const bottom = 385;
  const h = bottom - top;
  const bands = layers
    .map((color, i) => {
      const y0 = top + (h * i) / layers.length;
      const y1 = top + (h * (i + 1)) / layers.length;
      return `<rect x="110" y="${y0}" width="180" height="${y1 - y0 + 1}" fill="${color}" stroke="none"/>`;
    })
    .join('\n');
  const ice = [
    [130, 160, -8],
    [205, 152, 10],
    [160, 205, 6],
    [228, 214, -12],
  ]
    .map(([x, y, r]) => `<rect x="${x}" y="${y}" width="46" height="42" rx="8" transform="rotate(${r} ${x + 23} ${y + 21})" fill="#FFFFFF" fill-opacity=".35" stroke-width="2.5"/>`)
    .join('\n');
  const extra = {
    peach: `<path d="M300 112 a42 42 0 0 1 -60 52 a42 42 0 0 1 60 -52z" fill="#F2A36B"/><path d="M286 124 c-10 12 -22 22 -36 30" stroke-width="2"/>`,
    lychee: `<circle cx="150" cy="330" r="16" fill="#FFF6EE"/><circle cx="196" cy="350" r="16" fill="#FFF6EE"/><circle cx="244" cy="326" r="16" fill="#FFF6EE"/>`,
    pearls: [130, 160, 190, 220, 250, 145, 175, 205, 235, 265]
      .map((x, i) => `<circle cx="${x}" cy="${i < 5 ? 368 : 348}" r="11" fill="#2B1A12" stroke-width="2"/>`)
      .join(''),
    orange: `<circle cx="290" cy="140" r="44" fill="#F3B13C"/><circle cx="290" cy="140" r="34" fill="#F8CF6E" stroke-width="2"/>${[0, 45, 90, 135]
      .map((a) => `<path d="M290 140 l${(34 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(34 * Math.sin((a * Math.PI) / 180)).toFixed(1)} M290 140 l${(-34 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(-34 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" stroke-width="2"/>`)
      .join('')}`,
  }[garnish] ?? '';

  return frame(`<path d="M228 40 l-30 150" stroke-width="12"/>
<path d="M228 40 l-30 150" stroke="#9C4A21" stroke-width="5"/>
<path d="M96 110 h208 l-18 290 c-1 12 -10 20 -22 20 h-128 c-12 0 -21 -8 -22 -20z" fill="${CREAM}"/>
<clipPath id="g"><path d="M100 150 h200 l-15 248 c-1 10 -8 16 -18 16 h-134 c-10 0 -17 -6 -18 -16z"/></clipPath>
<g clip-path="url(#g)">${bands}
${ice}</g>
<path d="M100 150 h200" stroke-width="2.5"/>
${extra}
<path d="M120 128 v240" stroke="#FFFFFF" stroke-width="5" opacity=".5"/>
<ellipse cx="200" cy="424" rx="120" ry="10" fill="${INK}" stroke="none" opacity=".12"/>`);
}

mkdirSync(OUT, { recursive: true });
for (const [slug, spec] of Object.entries(drinks)) {
  writeFileSync(join(OUT, `${slug}.svg`), spec.kind === 'hot' ? hot(spec) : iced(spec));
}
console.log(`Đã tạo ${Object.keys(drinks).length} hình trong ${OUT}`);
