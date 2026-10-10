import {CHAPTERS,CHAPTER_SHOTS} from './story';

const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Original cut-paper silhouettes: the action is carried by a single physical
// object rather than a collage of interface ornaments or particle emitters.
const props:Record<string,string>={
  ribbon:'<path class="prop-ribbon" d="M-20 89C50 116 48 182 125 164S192 77 245 128 320 237 414 153L414 165C317 252 282 177 235 141S205 170 129 178 45 137-20 102Z"/><path class="prop-ribbon" d="M184 135q-38-49-56-20t46 43q-13 32-39 57l18-3 2 21q33-30 41-70 33 29 57 35l-11-15 19-5q-24-11-56-29 24-39 6-45-17-7-27 31Z"/><path d="m144 119 28 22m23-11 5-19m-34 89 19-38m26 4 29 16"/>',
  slate:'<path class="prop-body" d="m115 40 142 9 22 226-182 9z"/><path d="m130 94 110 4m-108 7 91 2m-99 12 107-5m-96 12 109 1m-115 85 106-1m-96 14 104 1"/><path class="prop-cut" d="m115 118 140-19-20 18 14 8-123 21z"/>',
  lamp:'<path class="prop-body" d="m151 147 70-2 16 66-109 1z"/><path d="m143 148 7-38 64-2 11 39m-61-43 1-29 35-1 4 29m-58 89 22-33 27 35 19-21"/><path class="prop-light" d="m173 180 15-43 17 42-11 19-16-1z"/>',
  chain:'<g class="prop-swing"><path d="m180-10 0 294m-15-270q36-16 33 19t-35 18 35 31-36 27 37 29-35 26 35 32-34 27"/><path class="prop-body" d="m115 241 143-8 14 51-158 7z"/></g>',
  nameplate:'<path class="prop-body" d="m58 91 103-12 9 43-111 14zm88 42 91-14 12 51-107 4zm-33 64 127-15 8 47-133 12z"/><path d="m73 103 69-9m16 53 62-13m-91 77 89-15"/><path class="prop-cut" d="m60 243 221-27-12 95H46z"/>',
  tongue:'<path d="m174 0 10 125m18-125-7 125"/><path class="prop-body prop-swing" d="m180 115 20 2-5 103q40 31 4 61-57 25-67-13-8-30 40-48z"/>',
  water:'<path class="prop-body" d="m100 17 160 3 3 253-168 8z"/><path class="prop-cut" d="m119 43 116 0 0 170-116 5z"/><path d="m178 45-2 166m-55-93 112-2"/><path class="prop-water" d="M0 260q60-20 110-3t96-5 113-1 81-2v61H0z"/>',
  bolt:'<path class="prop-body" d="m42 85 263-6 0 120-263 3zm103 23 19-2 2 61-23 1zm72-4 19-1-1 59-18 1z"/><path class="prop-moving" d="m71 126 218-5 4 17-220 7z"/>',
  hand:'<path class="prop-body" d="m138 161-14-47 6-8 23 32-2-58 10-5 17 59 8-65 12-1 3 67 16-51 10 2-10 65 23-35 11 6-30 65-3 46-53 4-5-37-33-26-7-14z"/><path class="prop-water" d="M0 270q85-17 150-4t112-4 138-2v51H0z"/>',
  ink:'<path d="M38 35h95v37h72v78h86v109H140v-35H58V107h39V73H38zM157 150v91m-24-20h93m-96-101h64"/><path class="prop-cut prop-erasure" d="m110 124 92-11 5 21-103 9z"/>',
  page:'<path class="prop-body" d="m111 39 148 19-20 236-159-22z"/><path d="m131 82 94 10m-101 9 96 10m-98 17 88 11m-90 72 89 11m-94 7 83 13"/><text x="119" y="181" fill="currentColor" stroke="none" font-family="Georgia,serif" font-size="17" transform="rotate(7 119 181)">ELIAN ILYAN</text>',
  seal:'<path class="prop-body" d="m81 21 196 13-13 263L69 279z"/><path d="m179 41-13 226m-37-121 94 7"/><path class="prop-light" d="m158 137 19-9 22 9 12 27-17 27-25 1-24-22z"/><path class="prop-cut" d="m164 144 21 2-4 13-13 8 9 17-18-4-3-13z"/>',
  rope:'<g class="prop-swing"><path d="m181-15-1 192m12-192-2 190m-9-157 12 10m-11 22 11 12m-13 22 11 11m-11 19 11 11m-13 20 13 12m-12 19 10 10"/><path class="prop-body" d="m170 177 31-2 8 54-14 51-16-10 9-36-19-15z"/></g>',
  bell:'<g class="prop-swing"><path d="m185-20 0 75m-21 5 43-2"/><path class="prop-body" d="M147 76q37-42 71-1l12 96 30 26v14H112v-17l24-18z"/><path class="prop-light" d="m179 166 14-1 5 61-30 1z"/></g>',
  interval:'<path d="m68 108 1 95m33-132 0 170m33-148 0 124m99-126 0 124m35-151-1 174m34-132 0 90"/><path class="prop-light" d="m183 97 2 119"/>',
  branch:'<path class="prop-body" d="m-15 261 132-88 53-11 69-60 75-70-54 85-60 65-70 10-125 93zm193-83-15-112 30 72z"/><path class="prop-light" d="m196 173q-17 47 5 61 28 4 21-36-2-18-26-25z"/>',
  knot:'<path d="M-20 220q94-71 175-41t112-80 146-44"/><path class="prop-body" d="m154 173-14-27-27 7 27 32-17 81 28-20 10 18 12-77 69 61-7-32 23-9-83-46 26-39-20-9z"/>',
  fruit:'<path d="m178-10 4 105m-5-21-38-45"/><path class="prop-light prop-swing" d="M184 108q-46-15-54 31-18 75 45 100 59-8 64-65 6-67-55-66z"/><path class="prop-cut" d="m179 122 9 51-15 39 23-31z"/>',
  marks:'<path class="prop-body" d="m70 0 237 8-13 302-246-15z"/><path d="m100 107-9 75m34-81-12 88m41-77-7 78m39-83-15 85m-79-35 107-11m-79 87-13 42m38-50-9 44m34-44-5 44"/>',
  cell:'<path class="prop-body" d="m62 19 248 4-4 270-254-5z"/><path class="prop-cut" d="m115 38 143 3-4 194-145-3z"/><path class="prop-moving" d="m131 41-8 190m44-190-8 190m41-189-5 190m40-188-4 188"/><text x="151" y="270" fill="currentColor" stroke="none" font-family="Georgia,serif" font-size="28">VII</text>',
  key:'<path class="prop-body prop-moving" d="M147 136q-30-17-32 21-7 40 34 34 22-4 15-27l103-6 1 35-26 1-4-18-30 3-1-16-45 6z"/>',
  voices:'<g class="prop-voices">'+Array.from({length:10},(_,i)=>`<path d="m${42+i*32} ${110+Math.abs(i-4.5)*8} 0 ${97-Math.abs(i-4.5)*14}"/>`).join('')+'</g>',
  score:'<path class="prop-body" d="m50 55 275-12-5 224-282 0z"/><path d="m68 105 229-4m-230 21 229-5m-230 22 229-5m-232 24 232-7m-229 24 229-6"/><path class="prop-cut" d="m71 197 227-18-10 30-224 9z"/>',
  silence:'<path d="M34 149h111m84 0h139"/><path class="prop-light" d="m185 122 0 54"/>',
  reflection:'<path class="prop-body" d="m171 50 6-24 18 29 24-9-6 24q30 35 25 72l-14 37 28 57-36-3-20-29-45 25-36-1 43-57-3-59z"/><path class="prop-cut" d="m178 68 9 3m15-5 8 1"/><path d="M32 246h324m-200 15 85 0-33 33-45-4"/>',
  tracks:'<path class="prop-body" d="m54 263 7-10 16 3 9 12-15 11-15-4zm61-81 13-8 13 4 8 14-18 8-12-5zm53-72 15-9 14 8 3 11-18 7-12-4zm-30 156 13-7 13 6 2 14-18 5-9-5zm64-79 9-11 16 4 8 11-14 10-15-2zm42-71 16-10 13 7 4 16-20 3-9-4z"/>',
  moon:'<path class="prop-light" d="M113 89q30-75 105-49 80 37 54 108-29 78-115 41-54-30-44-100z"/><path class="prop-cut prop-erasure" d="m127 108 132-9-19 53-31-13-9 41-17-35-43-3z"/>',
  throne:'<path class="prop-body" d="m100 283 13-209 140-1 17 209-38-7-3-70-82 0-9 79zm12-60-22-79 27-10 17 70zm127-18 14-74 27 11-9 83z"/><path class="prop-light" d="m167 144 29-2 6 28-38 2z"/>',
  witnesses:'<path class="prop-body" d="m25 198 28-3-2 57-26 2zm33-7 30-5 1 64-33 5zm36 10 26-6 3 54-24 3zm32-22 33 7-1 60-30-1zm39 16 30-3 3 55-33 0zm41-14 30 7-1 56-28 6zm36 13 29-3-1 58-25 0zm35-12 27 2 7 65-29-3zm36 16 30-3-1 60-29-5zm36-15 25 3 5 63-28-1z"/>',
  fracture:'<path class="prop-light" d="m119 94 20-32 41-15 47 14 31 43-6 56-35 39-48 3-45-36z"/><path class="prop-cut" d="m179 48-1 54 31 6-51 45 19 55-20-12-16-47 45-28-19-18-3-51z"/>',
  threshold:'<path class="prop-body" d="m79 309 6-253 65-46 64 6 59 55 4 238-34 0-4-228-36-36-43 0-44 33-4 231z"/><path class="prop-light" d="m139 72 29-23 25 4 27 29-3 210-80 0z"/>'
};

export function cinematicScreen(index:number,beat:number,name:string,reducedMotion:boolean){
  const chapter=CHAPTERS[index],line=chapter.lines[beat],shot=CHAPTER_SHOTS[index][beat];
  return `<section class="chapter-film ${reducedMotion?'film-still':''}" data-chapter="${index+1}" data-shot="${beat+1}" style="--shot-duration:${shot.duration}s" aria-label="Chapter ${index+1} opening">
    <div class="film-prop" aria-hidden="true"><svg viewBox="0 0 400 310" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${props[shot.prop]}</svg></div>
    <header class="film-heading"><p>${escape(chapter.tag)}</p><h2>${escape(name)}</h2></header>
    <div class="film-caption"><p class="film-action">${escape(shot.action)}</p><div class="film-dialogue" aria-live="polite"><p class="speaker">${escape(line.speaker)}</p><p class="story-text">${escape(line.text)}</p></div></div>
    <footer class="film-controls"><span class="film-reel" aria-label="${beat+1} of ${chapter.lines.length}">${chapter.lines.map((_,i)=>`<i class="${i<=beat?'read':''}"></i>`).join('')}</span><button data-action="story-next" class="film-next">${beat===chapter.lines.length-1?'Begin':'Continue'} <span aria-hidden="true">→</span></button><button data-action="begin" class="film-skip" aria-label="Begin now">Skip opening</button></footer>
  </section>`;
}
