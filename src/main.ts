import './style.css';
import {Game} from './core';
import {STAGE_INFO} from './levels';
import {CHAPTERS,FIELD_NOTES,ENDINGS,CREATOR_LINKS,type EndingKey} from './story';
import {InputController} from './input';
import {TouchDock} from './touch';
import {GameRenderer} from './renderer';
import {AudioDirector} from './audio';
import {loadSave,storeSave,loadSettings,storeSettings} from './storage';
import type {InputFrame,Quality} from './types';

const app=document.querySelector<HTMLElement>('#app')!;
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const hud=document.querySelector<HTMLElement>('#hud')!;
const controls=document.querySelector<HTMLElement>('#controls')!;
const narration=document.querySelector<HTMLElement>('#narration')!;
const settings=loadSettings(),game=new Game(loadSave()),input=new InputController(canvas),audio=new AudioDirector();
audio.setVolume(settings.volume);audio.setMuted(settings.muted);
const renderer=new GameRenderer(canvas,settings.quality);
renderer.setStage(game.state.stage);
const touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch',touch);
controls.innerHTML=`<div id="move-pad" role="slider" tabindex="0" aria-label="Movement" aria-orientation="horizontal" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><div class="stick-ring"><i class="thumb"></i></div><span>MOVE</span></div><div class="action-pad"><button data-touch="attack" aria-label="Strike"><i>†</i><span>STRIKE</span></button><button data-touch="dash" aria-label="Roll"><i>↠</i><span>ROLL</span></button><button data-touch="jump" aria-label="Jump"><i>↑</i><span>JUMP</span></button></div>`;
let dock=new TouchDock(controls,input);
controls.addEventListener('pointerdown',()=>audio.unlock());
let page:'title'|'chapters'|'settings'|'credits'|'journal'='title';
let intro=-1,ending:EndingKey|undefined,lastMode='',lastEvent=-1;
let clock=performance.now(),accumulator=0,elapsed=0,fps=60,navDelay=0,noticeExpiry=0;
let lastHud=0,pawClicks=0,sequence='';
const discovered=new Set<string>();
try{for(const key of JSON.parse(localStorage.getItem('moonpaw-journal-v2')||'[]'))if(typeof key==='string')discovered.add(key);}catch{}
const persistJournal=()=>{try{localStorage.setItem('moonpaw-journal-v2',JSON.stringify([...discovered]));}catch{}};
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const button=(label:string,action:string,kind='')=>`<button data-action="${action}" class="${kind}">${label}</button>`;
const reset=()=>{dock.dispose();dock=new TouchDock(controls,input);input.reset();};
function notice(text:string,duration=6500){narration.hidden=false;narration.textContent=text;noticeExpiry=elapsed+duration/1000;}
function stageStart(index:number){
  audio.unlock();game.start(index);renderer.setStage(game.state.stage);intro=0;ending=undefined;page='title';
  game.pause();reset();audio.start(index);discovered.add(`${index}:intro`);persistJournal();sync();
}
function begin(){intro=-1;game.resume();reset();sync();canvas.focus();notice(game.state.stage.description,8500);}
function title(){intro=-1;ending=undefined;game.menu();audio.stop();page='title';renderer.setStage(game.state.stage);reset();sync();}
function credits(){return `<p>Created & directed by <strong>Adnan Naous</strong>.</p><p>Original pixel artwork, story, synthesized soundscapes and engineering developed with Codex. Prototype explored with Grok.</p><p class="quiet">Yudho's dirty-pixel approach and Souls atmosphere informed the direction. The artwork, characters, music and effects here are original.</p><nav class="links">${CREATOR_LINKS.map(l=>`<a href="${l.url}" target="_blank" rel="noopener noreferrer">${escape(l.label)} ↗</a>`).join('')}</nav><p class="quiet">For the ones who were never named.</p>`;}
function journal(){
  const records=STAGE_INFO.flatMap((stage,i)=>{
    if(!discovered.has(`${i}:intro`))return [];
    const notes=FIELD_NOTES[i].filter((_,n)=>discovered.has(`${i}:${n}`));
    return [`<article><h3>${String(i+1).padStart(2,'0')} · ${escape(stage.name)}</h3><p>${CHAPTERS[i].lines.map(l=>`<b>${escape(l.speaker)}</b> — ${escape(l.text)}`).join('<br>')}</p>${notes.map(n=>`<p class="record"><b>${escape(n.speaker)}</b><br>${escape(n.text)}</p>`).join('')}</article>`];
  });
  return records.length?records.join(''):'<p>The pages are empty. Enter the crypt. Listen to the witnesses.</p>';
}
function secondary(){
  if(page==='settings')return `<h2>Settings</h2><label>Sound ${button(settings.muted?'Off':'On','mute','switch')}</label><label>Volume <input id="volume" aria-label="Volume" type="range" min="0" max="1" step=".01" value="${settings.volume}"></label><label>Effects <select id="quality" aria-label="Effects"><option value="low" ${settings.quality==='low'?'selected':''}>Light</option><option value="balanced" ${settings.quality==='balanced'?'selected':''}>Balanced</option><option value="high" ${settings.quality==='high'?'selected':''}>Full</option></select></label><p class="quiet">A/D move · Space jump · Shift roll · J strike<br>Controller: stick, A jump, B roll, RT strike<br>Mouse: left jump · right roll · J strike<br>F11 fullscreen · Escape pause</p>`;
  if(page==='credits')return `<h2>Credits</h2>${credits()}`;
  if(page==='journal')return `<h2>The witnesses</h2><div class="journal">${journal()}</div>`;
  return `<h2>Ten thresholds</h2><div class="chapters">${STAGE_INFO.map((s,i)=>`<button data-stage="${i}" ${i>=game.save.unlocked?'disabled':''}><span>${String(i+1).padStart(2,'0')}</span><strong>${escape(s.name)}</strong><small>${i>=game.save.unlocked?'Locked':escape(s.subtitle)}</small></button>`).join('')}</div>`;
}
function sync(){
  const mode=game.state.mode,menu=mode==='menu';lastMode=mode;
  document.body.dataset.mode=menu?'menu':intro>=0?'story':mode;
  hud.hidden=menu;controls.hidden=menu||!touch;narration.hidden=menu;
  controls.classList.toggle('disabled',mode!=='playing');
  hud.innerHTML=menu?'':`<div class="identity"><small>${String(game.state.stageIndex+1).padStart(2,'0')} / 10</small><strong>${escape(game.state.stage.name)}</strong></div><div class="vitals"><div class="stamina" role="meter" aria-label="Stamina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i></i></div><span id="relics" title="Recovered names"></span></div>${button('Ⅱ','pause','pause')}`;
  if(menu&&page==='title')app.innerHTML=`<section class="title-screen"><div class="seal" aria-hidden="true">†</div><p class="eyebrow">A PIXEL HORROR PILGRIMAGE</p><h1>MOONPAW</h1><p class="subtitle">ASHEN VOW</p><p class="premise">A city sealed inside a bell.<br>Ten stolen names. One way to break it.</p>${button(game.save.unlocked>1?'Continue':'Enter the crypt','start','primary')}${button('Chapters','chapters','plain')}<nav class="title-nav">${button('Settings','settings')}${button('Journal','journal')}${button('Credits','credits')}</nav><p class="version">ADNAN NAOUS · 0.2</p></section>`;
  else if(menu||page!=='title')app.innerHTML=`<section class="sheet">${button('← Back','back','back')}${secondary()}</section>`;
  else if(intro>=0){const chapter=CHAPTERS[game.state.stageIndex],line=chapter.lines[intro];app.innerHTML=`<section class="dialog"><p class="eyebrow">${escape(chapter.tag)}</p><h2>${escape(game.state.stage.name)}</h2><p class="speaker">${escape(line.speaker)}</p><p class="story-text">${escape(line.text)}</p><div class="dialog-actions">${button(intro===chapter.lines.length-1?'Begin':'Continue','story-next','primary')}${button('Begin now','begin','plain')}</div><p class="quiet">${escape(game.state.stage.description)}</p></section>`;}
  else if(mode==='paused')app.innerHTML=`<section class="dialog"><p class="eyebrow">THE BELL IS STILL</p><h2>Pause</h2>${button('Resume','resume','primary')}<nav class="pause-nav">${button('Journal','journal')}${button('Settings','settings')}${button('Restart','restart')}${button('Title','title')}</nav></section>`;
  else if(mode==='complete')app.innerHTML=`<section class="dialog"><p class="eyebrow">A NAME CARRIED BEYOND THE GATE</p><h2>${escape(game.state.stage.name)}</h2><p class="story-text">${escape(CHAPTERS[game.state.stageIndex].after)}</p>${button('Cross the next threshold','next','primary')}${button('Title','title','plain')}</section>`;
  else if(mode==='ending')app.innerHTML=ending?`<section class="dialog ending"><p class="eyebrow">${ENDINGS[ending].tag}</p><h2>${ENDINGS[ending].title}</h2>${ENDINGS[ending].lines.map(l=>`<p>${escape(l)}</p>`).join('')}${button('Credits','ending-credits','primary')}${button('Title','title','plain')}</section>`:`<section class="dialog"><p class="eyebrow">THE REGENT FALLS SILENT</p><h2>What will you give?</h2><p>${escape(CHAPTERS[9].after)}</p>${button('Give your name','ending-lantern','choice')}${button('Leave alone','ending-home','choice')}${button('Name every witness','ending-dawn','choice')}<p class="quiet">${game.save.secrets?.length||0}/10 memories recovered. Every witness is needed to break the bell.</p></section>`;
  else app.innerHTML='';
  app.classList.toggle('open',!!app.innerHTML);
  app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action!)));
  app.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>stageStart(Number(b.dataset.stage))));
  hud.querySelector<HTMLButtonElement>('[data-action=pause]')?.addEventListener('click',()=>action('pause'));
  app.querySelector<HTMLSelectElement>('#quality')?.addEventListener('change',e=>{settings.quality=(e.target as HTMLSelectElement).value as Quality;renderer.setQuality(settings.quality);storeSettings(settings);});
  app.querySelector<HTMLInputElement>('#volume')?.addEventListener('input',e=>{settings.volume=Number((e.target as HTMLInputElement).value);audio.setVolume(settings.volume);storeSettings(settings);});
  updateHud();renderer.resize();
}
function action(key:string){
  audio.unlock();
  if(key==='start')stageStart(game.save.unlocked-1);
  else if(['chapters','settings','journal','credits'].includes(key)){page=key as typeof page;sync();}
  else if(key==='back'){page='title';sync();}
  else if(key==='story-next'){if(++intro>=CHAPTERS[game.state.stageIndex].lines.length)begin();else sync();}
  else if(key==='begin')begin();
  else if(key==='pause'){if(game.state.mode==='playing'){game.pause();reset();page='title';sync();}}
  else if(key==='resume'){game.resume();reset();sync();canvas.focus();}
  else if(key==='restart')stageStart(game.state.stageIndex);
  else if(key==='title')title();
  else if(key==='next'){storeSave(game.save);stageStart(game.state.stageIndex+1);}
  else if(key==='mute'){settings.muted=!settings.muted;audio.setMuted(settings.muted);storeSettings(settings);sync();}
  else if(key.startsWith('ending-')&&key!=='ending-credits'){
    const chosen=key.slice(7) as EndingKey;
    if(chosen==='dawn'&&(game.save.secrets?.length||0)<10){notice('The bell will not break until all ten witnesses are remembered.');return;}
    ending=chosen;sync();
  }else if(key==='ending-credits'){game.menu();page='credits';audio.stop();sync();}
}
function updateHud(){
  const s=game.state,bar=hud.querySelector<HTMLElement>('.stamina i'),meter=hud.querySelector('.stamina');
  if(bar)bar.style.width=`${Math.max(0,s.player.stamina)}%`;
  meter?.setAttribute('aria-valuenow',String(Math.round(s.player.stamina)));
  const relics=hud.querySelector('#relics');if(relics)relics.textContent=`† ${s.relicsCollected}/${s.relicsRequired}`;
  if(elapsed>noticeExpiry)narration.textContent=s.warning||(!touch?'A/D move · Space jump · Shift roll · J strike':'');
}
function gamepadMenu(sample:InputFrame,dt:number){
  navDelay=Math.max(0,navDelay-dt);if(input.device!=='controller')return;
  const buttons=[...app.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b=>b.getBoundingClientRect().height>0);
  if(!buttons.length)return;const direction=sample.nav||sample.move;
  if(Math.abs(direction)>.5&&navDelay===0){const now=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(now+(direction>0?1:-1)+buttons.length)%buttons.length].focus();navDelay=.24;}
  if(sample.confirmPressed){if(document.activeElement instanceof HTMLButtonElement&&app.contains(document.activeElement))document.activeElement.click();else buttons[0].click();}
}
let pending:InputFrame={move:0,jump:false,jumpPressed:false,dashPressed:false,attackPressed:false,pausePressed:false,confirmPressed:false};
function frame(now:number){
  requestAnimationFrame(frame);const dt=Math.min(.075,Math.max(0,(now-clock)/1000));clock=now;
  if(document.hidden){accumulator=0;return;}elapsed+=dt;fps+=(1/Math.max(dt,.001)-fps)*.04;
  const sample=input.sample();
  pending={...sample,jumpPressed:pending.jumpPressed||sample.jumpPressed,dashPressed:pending.dashPressed||sample.dashPressed,attackPressed:pending.attackPressed||sample.attackPressed,pausePressed:pending.pausePressed||sample.pausePressed};
  if(game.state.mode==='playing'){
    accumulator+=dt;let steps=0;
    while(accumulator>=1/120&&steps++<10){game.update(1/120,pending);pending.jumpPressed=pending.dashPressed=pending.pausePressed=false;pending.attackPressed=false;accumulator-=1/120;}
    if(game.state.player.deadTime===0){
      for(let n=0;n<2;n++)if(game.state.player.x/game.state.stage.length>(n===0?.33:.70)&&!discovered.has(`${game.state.stageIndex}:${n}`)){
        const note=FIELD_NOTES[game.state.stageIndex][n];discovered.add(`${game.state.stageIndex}:${n}`);persistJournal();notice(`${note.speaker} — ${note.text}`,10000);
      }
    }
  }else{
    accumulator=0;
    if(sample.pausePressed&&game.state.mode==='paused'){if(page!=='title'){page='title';sync();}else if(intro>=0)begin();else action('resume');}
    else if(sample.confirmPressed&&input.device!=='controller'&&(document.activeElement===canvas||document.activeElement===document.body)){if(intro>=0)action('story-next');else if(game.state.mode==='menu'&&page==='title')action('start');else if(game.state.mode==='complete')action('next');}
    else gamepadMenu(sample,dt);
    pending.jumpPressed=pending.dashPressed=pending.pausePressed=false;pending.attackPressed=false;
  }
  if(lastMode!==game.state.mode){reset();sync();if(game.state.mode==='complete'||game.state.mode==='ending'){storeSave(game.save);audio.stop();}}
  if(lastEvent!==game.state.eventId){lastEvent=game.state.eventId;audio.play(game.state.event);if(game.state.event==='secret'){storeSave(game.save);notice(`A witness remembered. ${game.save.secrets?.length||0} / 10`,5000);}else if(game.state.event==='checkpoint')notice('The bell remembers your return.',3000);}
  renderer.render(game.state,accumulator/(1/120),elapsed,dt);
  if(now-lastHud>80){updateHud();lastHud=now;}
}
new ResizeObserver(()=>renderer.resize()).observe(document.querySelector('#scene')!);
addEventListener('resize',()=>renderer.resize());
addEventListener('blur',()=>{if(game.state.mode==='playing')action('pause');reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.state.mode==='playing')action('pause');reset();audio.suspend();}else clock=performance.now();});
canvas.addEventListener('pointerdown',()=>audio.unlock());
addEventListener('pagehide',()=>{storeSave(game.save);persistJournal();});
addEventListener('keydown',e=>{if(!e.repeat){sequence=(sequence+e.key).slice(-3);if(sequence==='351')notice('CELL 351 · A name the Regent could not take. Adnan was here.',9000);}});
app.addEventListener('click',e=>{if((e.target as HTMLElement).closest('h1')&&++pawClicks===7){notice('Seven vows. Three still unbroken.',6000);pawClicks=0;}});
Object.defineProperty(window,'moonpaw',{value:{get state(){return game.state;},get save(){return game.save;},get stats(){return {...renderer.stats,fps};}}});
sync();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol!=='moonpaw:'&&import.meta.env.PROD)void navigator.serviceWorker.register('./sw.js').catch(console.warn);
