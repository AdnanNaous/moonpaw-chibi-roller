import './style.css';
import { Game } from './core';
import { STAGE_INFO } from './levels';
import { CHAPTERS, ENDINGS, CREATOR_LINKS, type EndingKey } from './story';
import { InputController } from './input';
import { GameRenderer } from './renderer';
import { AudioDirector } from './audio';
import { loadSave, storeSave, loadSettings, storeSettings } from './storage';
import type { GameMode, InputFrame, Quality } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const game = new Game(loadSave());
const settings = loadSettings();
const audio = new AudioDirector();
audio.setVolume(settings.volume); audio.setMuted(settings.muted);
const input = new InputController(canvas);
let renderer: GameRenderer;
let selectedStage = 0;
let subpage: 'home' | 'worlds' | 'settings' | 'controls' | 'credits' = 'home';
let storyLine = -1;
let endingChosen: EndingKey | undefined;
let pawClicks = 0;
let secretSequence = '';
let lastMode: GameMode | undefined;
let lastEventId = -1;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let showStats = false;

const paw = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><ellipse cx="8" cy="10" rx="3.5" ry="4.5" transform="rotate(-25 8 10)"/><ellipse cx="15" cy="6" rx="3.4" ry="4.5"/><ellipse cx="23" cy="9" rx="3.4" ry="4.5" transform="rotate(25 23 9)"/><path d="M8 22c0-5 5-10 8-10s9 6 9 11c0 5-5 3-9 3s-8 2-8-4"/></svg>`;
const star = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 1 3.2 7 7.8 1-5.8 5.3 1.5 7.7L12 18l-6.7 4 1.5-7.7L1 9l7.8-1z"/></svg>`;
const fmt = (time: number) => `${Math.floor(time/60).toString().padStart(2,'0')}:${Math.floor(time%60).toString().padStart(2,'0')}`;
const names = STAGE_INFO.map(s=>s.name);
const summaries = STAGE_INFO.map(s=>s.subtitle);
const accents = STAGE_INFO.map(s=>s.accent);

try {renderer = new GameRenderer(canvas,settings.quality);renderer.setStage(game.state.stage);}
catch (error) {
  app.innerHTML = `<main class="fallback"><span class="eyebrow">MOONPAW · CHIBI ROLLER</span><h1>A little more graphics power, please.</h1><p>The 3D world could not start. Enable hardware acceleration and use a recent browser or the Windows app.</p><button id="retry">Try again</button></main>`;
  document.querySelector('#retry')!.addEventListener('click',()=>location.reload());
  console.error(error); throw error;
}

function startStage(index: number) {
  audio.unlock(); input.reset(); game.start(index); selectedStage=index;storyLine=0;endingChosen=undefined;game.pause();
  renderer.setStage(game.state.stage);audio.start(index);lastMode=undefined; syncUI();
  canvas.focus();
}
function toMenu() {
  game.menu();storyLine=-1;endingChosen=undefined;input.reset();audio.stop();subpage='home';lastMode=undefined;syncUI();
}
function button(label: string, action: string, cls='') {return `<button class="${cls}" data-action="${action}">${label}</button>`;}
function footer() {return `<footer class="menu-footer"><span>A GAME BY ADNAN NAOUS</span><span>v0.1 · THE NEON AFTERLIFE</span></footer>`;}
function creditsMarkup(){return `<div class="credits-copy"><div class="eyebrow">THE PEOPLE BEHIND THE LIGHT</div><h2>Thank you for remembering.</h2><p><strong>Created & directed by Adnan Naous</strong><br>Concept, game design & creative direction</p><p>Engineering, procedural art, original story and synthesized soundtrack developed with Codex.<br>Original pixel prototype explored with Grok.</p><p>Rendering · Three.js<br>Desktop · Electron<br>Mobile · Capacitor<br>All music and sound effects are bundled original compositions.</p><p class="fine">Ten worlds · Three endings · Ten hidden memories<br>For everyone who has ever carried something small through the dark.</p><nav class="creator-links" aria-label="Creator links">${CREATOR_LINKS.map(link=>`<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join('')}</nav><p class="credit-signature">ADNAN NAOUS / VC351</p></div>`;}
function navBack() {return button('← Back','back','text-button');}
function syncUI() {
  const mode=game.state.mode; document.body.dataset.mode=mode;
  if (mode === 'menu') {
    const header = `<header class="topbar"><button class="small-brand" data-action="paw" aria-label="Moonpaw">${paw} MOONPAW</button><div class="top-actions">${button(settings.muted?'Sound off':'Sound on','mute','icon-button')}${button('⛶','fullscreen','icon-button')}</div></header>`;
    let content='';
    if (subpage==='home') content=`<section class="title-panel"><div class="eyebrow"><i></i> YOUR REFLECTION LEFT BEFORE YOU.</div><h1>MOON<span>PAW</span><small>CHIBI ROLLER</small></h1><p class="intro">Ten nights to find your name.<br>One door. Three ways home.</p><div class="title-buttons">${button(`${paw} ${game.save.unlocked>1?'Continue the story':'Enter the afterlife'} <span>↗</span>`,'start','primary')}${button('Choose a chapter','worlds','secondary')}</div><div class="quiet-actions">${button('Controls','controls','text-button')}${button('Settings','settings','text-button')}${button('Credits','credits','text-button')}</div><div class="input-hint"><span>Keyboard & mouse</span><span>Controller</span><span>Touch</span></div></section><div class="scene-caption"><span>CHAPTER 01 / 10</span><strong>${names[0]}</strong><span>The last train left without you.</span></div>`;
    else if(subpage==='worlds') content=`<section class="page-panel world-panel">${navBack()}<div class="eyebrow">TEN NIGHTS IN A CITY THAT FORGOT</div><h2>A way through the dark.</h2><div class="world-list">${names.map((name,i)=>`<button class="world ${i===selectedStage?'selected':''}" data-stage="${i}" style="--accent:${accents[i]}" ${i>=game.save.unlocked?'disabled':''}><span class="world-number">${(i+1).toString().padStart(2,'0')}</span><span class="world-label"><strong>${name}</strong><small>${summaries[i]}</small></span><span class="world-status">${i>=game.save.unlocked?'Locked':game.save.best[STAGE_INFO[i].id]?'★':'↗'}</span></button>`).join('')}</div><p class="fine">Reach the door to unlock the next chapter. ${game.save.secrets?.length||0}/10 memories remembered. Saved on this device.</p></section>`;
    else if(subpage==='credits')content=`<section class="page-panel credits-panel">${navBack()}${creditsMarkup()}</section>`;
    else if(subpage==='controls') content=`<section class="page-panel controls-panel">${navBack()}<div class="eyebrow">FIND YOUR RHYTHM</div><h2>Small paws.<br>Precise moves.</h2><div class="control-list"><div><strong>Move</strong><span><kbd>A</kbd><kbd>D</kbd> or ← → · left stick / D-pad</span></div><div><strong>Jump</strong><span><kbd>Space</kbd> / <kbd>Z</kbd> · left mouse · controller A</span></div><div><strong>Roll / air dash</strong><span><kbd>Shift</kbd> / <kbd>X</kbd> · right mouse · controller X / B</span></div><div><strong>Pause</strong><span><kbd>Esc</kbd> / <kbd>P</kbd> · controller Start</span></div></div><p class="fine">Hold jump for height. Tap for a short hop. Roll in the air to cross a gap; landing restores your dash. Jump away from a wall to climb. On mobile, hold the movement buttons and tap jump or roll.</p>${button('Let’s play ↗','start','primary')}</section>`;
    else content=`<section class="page-panel settings-panel">${navBack()}<div class="eyebrow">MAKE IT YOURS</div><h2>A smoother moonrise.</h2><label class="setting">Graphics<select id="quality"><option value="low" ${settings.quality==='low'?'selected':''}>Performance</option><option value="balanced" ${settings.quality==='balanced'?'selected':''}>Balanced</option><option value="high" ${settings.quality==='high'?'selected':''}>Cinematic</option></select></label><p class="fine">Cinematic adds richer lighting and effects. Choose Balanced or Performance if movement feels less smooth.</p><label class="setting">Volume<input id="volume" type="range" min="0" max="1" step="0.01" value="${settings.volume}" /></label><label class="setting">Sound<button data-action="mute" aria-pressed="${!settings.muted}">${settings.muted?'Off':'On'}</button></label><label class="setting">Frame statistics<button data-action="stats" aria-pressed="${showStats}">${showStats?'Visible':'Hidden'}</button></label><p class="fine">Your graphics and sound choices are saved locally. F11 toggles fullscreen in the Windows app.</p></section>`;
    app.innerHTML=header+`<main class="menu">${content}</main>`+footer()+`<div id="toast" role="status"></div><div id="stats"></div>`;
  } else {
    let overlay='';
    if(mode==='paused'&&storyLine>=0){const chapter=CHAPTERS[game.state.stageIndex],line=chapter.lines[storyLine];overlay=`<div class="overlay story-overlay"><section class="story-dialog"><span class="eyebrow">${chapter.tag}</span><h2>${names[game.state.stageIndex]}</h2><div class="story-line"><span class="speaker">${line.speaker}</span><p>${line.text}</p></div><div class="story-actions">${button(storyLine===chapter.lines.length-1?'Step into the dark ↗':'Listen →','story-next','primary')}${button('Skip scene','story-skip','text-button')}</div><span class="story-page">${storyLine+1} / ${chapter.lines.length}</span></section></div>`;}
    else if(mode==='paused') overlay=`<div class="overlay"><section class="dialog"><span class="eyebrow">THE CITY IS STILL LISTENING</span><h2>Hold your breath.</h2><p>${names[game.state.stageIndex]} · ${fmt(game.state.time)}</p>${button('Keep rolling ↗','resume','primary')}${button('Restart chapter','restart','secondary')}${button('Return to title','menu','text-button')}</section></div>`;
    if(mode==='complete') overlay=`<div class="overlay"><section class="dialog complete"><div class="medallion">${paw}</div><span class="eyebrow">CHAPTER CLOSED</span><h2>The dark lets go.</h2><p>${CHAPTERS[game.state.stageIndex].after}</p><div class="results"><div><strong>${fmt(game.state.time)}</strong><span>Time</span></div><div><strong>${game.state.collected}/${game.state.total}</strong><span>Light fragments</span></div><div><strong>${game.state.deaths}</strong><span>Retries</span></div></div>${button('Next chapter ↗','next','primary')}${button('Return to title','menu','text-button')}</section></div>`;
    if(mode==='ending') {
      if(endingChosen){const ending=ENDINGS[endingChosen];overlay=`<div class="overlay"><section class="story-dialog ending-dialog"><span class="eyebrow">${ending.tag}</span><h2>${ending.title}</h2>${ending.lines.map(line=>`<p>${line}</p>`).join('')}${button('The people behind the light →','end-credits','primary')}${button('Return to title','menu','text-button')}</section></div>`;}
      else overlay=`<div class="overlay"><section class="story-dialog ending-dialog"><span class="eyebrow">THE UNWRITTEN DOOR</span><h2>Who leaves the light on?</h2><p>${CHAPTERS[9].after}</p>${button('Give the city your name','ending-lantern','secondary')}${button('Keep your name. Go home.','ending-home','secondary')}${button('Remember every name','ending-dawn','primary')}<p class="fine">${(game.save.secrets?.length||0)>=10?'You brought every memory back. The third way is open.':`${game.save.secrets?.length||0}/10 hidden memories found. The third way needs every voice.`}</p></section></div>`;
    }
    app.innerHTML=`<header class="hud"><div class="hud-world"><span>CHAPTER ${(game.state.stageIndex+1).toString().padStart(2,'0')} / 10</span><strong>${names[game.state.stageIndex]}</strong></div><div class="hud-items"><span class="shard-count">${star}<b id="shards">0/0</b></span><span id="timer">00:00</span>${button('Ⅱ','pause','pause-button')}</div></header><div class="world-progress"><i id="progress"></i></div><div class="play-help"><span>A / D <em>move</em></span><span>SPACE <em>jump</em></span><span>SHIFT <em>roll</em></span></div><div class="dash-status" id="dash-status">ROLL READY</div><div class="touch-controls" aria-label="Touch controls"><div class="touch-move"><button data-touch="left" aria-label="Move left">◀</button><button data-touch="right" aria-label="Move right">▶</button></div><div class="touch-actions"><button data-touch="dash" aria-label="Roll">ROLL</button><button data-touch="jump" aria-label="Jump">JUMP</button></div></div>${overlay}<div id="toast" role="status"></div><div id="stats"></div>`;
  }
  bindUI(); updateHud();lastMode=mode;
}
function bindUI() {
  app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action!)));
  app.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>startStage(Number(b.dataset.stage))));
  app.querySelector<HTMLSelectElement>('#quality')?.addEventListener('change',e=>{settings.quality=(e.target as HTMLSelectElement).value as Quality;renderer.setQuality(settings.quality);storeSettings(settings);});
  app.querySelector<HTMLInputElement>('#volume')?.addEventListener('input',e=>{audio.unlock();settings.volume=Number((e.target as HTMLInputElement).value);audio.setVolume(settings.volume);storeSettings(settings);});
  app.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach(b=>{
    const key=b.dataset.touch as 'left'|'right'|'jump'|'dash';
    b.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();b.setPointerCapture(e.pointerId);input.setTouch(key,true);b.classList.add('held');});
    const release=()=>{input.setTouch(key,false);b.classList.remove('held');};
    b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  });
}
function action(key:string) {
  audio.unlock();
  if(key==='start') startStage(Math.min(STAGE_INFO.length-1,game.save.unlocked-1));
  else if(key==='worlds'||key==='settings'||key==='controls'||key==='credits') {subpage=key;syncUI();}
  else if(key==='back') {subpage='home';syncUI();}
  else if(key==='mute') {settings.muted=!settings.muted;audio.setMuted(settings.muted);storeSettings(settings);syncUI();}
  else if(key==='stats') {showStats=!showStats;syncUI();}
  else if(key==='pause') {game.pause();input.reset();syncUI();}
  else if(key==='resume') {game.resume();input.reset();syncUI();canvas.focus();}
  else if(key==='restart') startStage(game.state.stageIndex);
  else if(key==='menu') toMenu();
  else if(key==='next') {storeSave(game.save);startStage(Math.min(STAGE_INFO.length-1,game.state.stageIndex+1));}
  else if(key==='story-next'){audio.play('page');const chapter=CHAPTERS[game.state.stageIndex];if(storyLine<chapter.lines.length-1){storyLine++;syncUI();}else action('story-skip');}
  else if(key==='story-skip'){storyLine=-1;game.resume();input.reset();syncUI();canvas.focus();toast('A / D move · Space jump · Shift roll · Look for what the city hides.',5000);}
  else if(key.startsWith('ending-')){const ending=key.slice(7) as EndingKey;if(ending==='dawn'&&(game.save.secrets?.length||0)<10){toast('Ten hidden memories will open the third way.');return;}endingChosen=ending;audio.play('complete');syncUI();}
  else if(key==='end-credits'){game.menu();subpage='credits';audio.start(9);syncUI();}
  else if(key==='paw'){if(++pawClicks===7){toast('Seven lives spent. Two still waiting. — A note from Room 351',9000);audio.play('secret');pawClicks=0;}}
  else if(key==='fullscreen') {if(document.fullscreenElement) void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is available in the Windows app.'));}
}
function toast(message:string,duration=2800) {
  const el=app.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),duration);
}
function updateHud() {
  const s=game.state;
  const shards=app.querySelector('#shards');if(shards)shards.textContent=`${s.collected}/${s.total}`;
  const timer=app.querySelector('#timer');if(timer)timer.textContent=fmt(s.time);
  const progress=app.querySelector<HTMLElement>('#progress');if(progress)progress.style.width=`${Math.max(0,Math.min(100,s.player.x/s.stage.length*100))}%`;
  const dash=app.querySelector('#dash-status');if(dash){dash.textContent=s.player.dashReady?'ROLL READY':'LAND TO RECHARGE';dash.classList.toggle('empty',!s.player.dashReady);}
  const stats=app.querySelector('#stats');if(stats){stats.textContent=showStats?`${Math.round(fps)} FPS · ${renderer.stats.drawCalls} draws · ${Math.round(renderer.stats.triangles/1000)}k triangles`:'';}
}
let last=performance.now(), accumulator=0, elapsed=0, fps=60, lastHud=0;
let pending: InputFrame={move:0,jump:false,jumpPressed:false,dashPressed:false,pausePressed:false,confirmPressed:false};
function frame(now:number) {
  requestAnimationFrame(frame);
  const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;
  if(document.hidden) {accumulator=0;return;}
  elapsed+=dt;fps+=(1/Math.max(dt,.001)-fps)*.03;
  const sample=input.sample();
  pending={...sample,jumpPressed:pending.jumpPressed||sample.jumpPressed,dashPressed:pending.dashPressed||sample.dashPressed,pausePressed:pending.pausePressed||sample.pausePressed,confirmPressed:pending.confirmPressed||sample.confirmPressed};
  if(game.state.mode==='menu') {
    if(sample.confirmPressed && subpage==='home' && input.device!=='controller' && (document.activeElement===document.body||document.activeElement===canvas)) action('start');
    else if(sample.pausePressed && subpage!=='home') action('back');
    // Standard controllers operate the same visible buttons as keyboard users.
    navigateGamepad(sample,dt);
    pending.jumpPressed=pending.dashPressed=pending.pausePressed=pending.confirmPressed=false;
  } else if(game.state.mode==='complete'||game.state.mode==='ending') {
    if(game.state.mode==='complete'&&sample.confirmPressed&&document.activeElement===canvas)action('next');
    else navigateGamepad(sample,dt);
    pending.jumpPressed=pending.dashPressed=pending.pausePressed=pending.confirmPressed=false;
  } else {
    const wasPaused=game.state.mode==='paused';
    if(wasPaused) {
      if(storyLine>=0){
        if(sample.pausePressed)action('story-skip');
        else if((sample.confirmPressed||sample.jumpPressed)&&document.activeElement===canvas)action('story-next');
        else navigateGamepad(sample,dt);
      }else if(sample.pausePressed)action('resume');
      else navigateGamepad(sample,dt);
      pending.jumpPressed=pending.dashPressed=pending.pausePressed=pending.confirmPressed=false;
    } else {
      accumulator+=dt;let steps=0;
      while(accumulator>=1/120&&steps++<12) {
        game.update(1/120,pending);
        pending.jumpPressed=pending.dashPressed=pending.pausePressed=pending.confirmPressed=false;
        accumulator-=1/120;
      }
    }
  }
  if(game.state.mode!==lastMode) {
    syncUI();input.reset();accumulator=0;
    if(game.state.mode==='complete'||game.state.mode==='ending') {storeSave(game.save);audio.stop();}
    if(game.state.mode==='paused') app.querySelector<HTMLButtonElement>('[data-action="resume"]')?.focus();
  }
  if(game.state.eventId!==lastEventId) {
    lastEventId=game.state.eventId;audio.play(game.state.event);
    if(game.state.event==='checkpoint')toast('A light to come back to.');
    if(game.state.event==='secret'){storeSave(game.save);toast(`A name remembered. ${game.save.secrets?.length||0} / 10`,5500);}
  }
  if(game.state.mode==='playing'&&game.state.player.grounded&&Math.abs(game.state.player.vx)>1&&Math.floor(elapsed*4)!==Math.floor((elapsed-dt)*4))audio.play('step');
  renderer.render(game.state,accumulator/(1/120),elapsed,dt);
  if(now-lastHud>100) {updateHud();lastHud=now;}
}
let navCooldown=0;
function navigateGamepad(sample:InputFrame,dt:number) {
  navCooldown=Math.max(0,navCooldown-dt);
  if(!input.device.toLowerCase().includes('controller')&&!input.device.toLowerCase().includes('gamepad'))return;
  const root=app.querySelector('.overlay')||app;
  const buttons=Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b=>b.getBoundingClientRect().height>0&&!b.dataset.touch);
    const direction = Math.abs(sample.nav ?? 0) > .5 ? sample.nav! : sample.move;
    if(Math.abs(direction)>.5&&navCooldown===0) {
    const current=buttons.indexOf(document.activeElement as HTMLButtonElement),next=(current+(direction>0?1:-1)+buttons.length)%buttons.length;
    buttons[next]?.focus();navCooldown=.25;
  }
  if(sample.confirmPressed) {
    if(document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
    else if(storyLine>=0)action('story-next');
    else if(game.state.mode==='menu'&&subpage==='home') action('start');
  }
}
addEventListener('resize',()=>renderer.resize());
addEventListener('blur',()=>{if(game.state.mode==='playing'){game.pause();input.reset();syncUI();}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(game.state.mode==='playing'){game.pause();syncUI();}input.reset();audio.suspend();}
  else last=performance.now();
});
canvas.addEventListener('pointerdown',()=>audio.unlock());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();game.pause();syncUI();toast('Graphics interrupted. Reload the app to restore the world.',20000);});
addEventListener('pagehide',()=>{storeSave(game.save);});
addEventListener('keydown',e=>{
  if(e.code==='KeyM'&&!e.repeat)action('mute');
  if(!e.repeat){secretSequence=(secretSequence+e.key).slice(-3);if(secretSequence==='351'){toast('ROOM 351 · The developer is still awake. Thank you for playing. — Adnan',8000);audio.play('secret');}}
});
// Read-only diagnostics keep automation out of shipping gameplay.
Object.defineProperty(window,'moonpaw',{value:{get state(){return game.state;},get stats(){return renderer.stats;},get save(){return game.save;}}});
syncUI();requestAnimationFrame(frame);
if('serviceWorker' in navigator && location.protocol!=='moonpaw:' && import.meta.env.PROD) void navigator.serviceWorker.register('./sw.js').catch(console.warn);
