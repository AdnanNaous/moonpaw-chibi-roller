import '@fontsource/cormorant-sc/latin-600.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import './style.css';
import {Game} from './core';
import {STAGE_INFO} from './levels';
import {CHAPTERS,FIELD_NOTES,ENDINGS,CREATOR_LINKS,type EndingKey} from './story';
import {InputController} from './input';
import {TouchDock} from './touch';
import {GameRenderer} from './renderer';
import {AudioDirector} from './audio';
import {FullscreenControl} from './fullscreen';
import {canExit,exitLabel,exitApplication,onAndroidBack} from './platform';
import {loadSave,storeSave,loadSettings,storeSettings} from './storage';
import type {InputFrame,Quality} from './types';
import {icon,titleScreen,journeyScreen} from './ui';
import {cinematicScreen} from './cinematic';

const app=document.querySelector<HTMLElement>('#app')!;
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const hud=document.querySelector<HTMLElement>('#hud')!;
const controls=document.querySelector<HTMLElement>('#controls')!;
const narration=document.querySelector<HTMLElement>('#narration')!;
const settings=loadSettings(),game=new Game(loadSave()),input=new InputController(canvas),audio=new AudioDirector();
audio.setVolume(settings.volume);audio.setMuted(settings.muted);audio.setMusicVolume(settings.musicVolume);audio.setEffectsVolume(settings.effectsVolume);
const renderer=new GameRenderer(canvas,settings.quality);
renderer.setStage(game.state.stage);
renderer.setReducedMotion(settings.reducedMotion);
document.body.classList.toggle('large-touch',settings.largeTouch);
document.body.classList.toggle('reduce-motion',settings.reducedMotion);
const touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch',touch);
controls.innerHTML=`<div id="move-pad" role="slider" tabindex="0" aria-label="Movement" aria-orientation="horizontal" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><div class="stick-ring"><i class="thumb"></i></div><span>MOVE</span></div><div class="action-pad"><button data-touch="attack" aria-label="Strike">${icon('strike')}<span>STRIKE</span></button><button data-touch="dash" aria-label="Roll">${icon('dodge')}<span>DODGE</span></button><button data-touch="jump" aria-label="Jump">${icon('jump')}<span>JUMP</span></button></div>`;
let dock=new TouchDock(controls,input);
controls.addEventListener('pointerdown',()=>audio.unlock());
type Page='title'|'chapters'|'settings'|'credits'|'journal'|'exit'|'pacts';
let page:Page='title';
let settingsTab:'audio'|'display'|'controls'='audio',exitReturn:Page='title';
let previewChapter=game.save.unlocked-1;
let intro=-1,ending:EndingKey|undefined,lastMode='',lastEvent=-1;
let cinematicTime=0;
let clock=performance.now(),accumulator=0,elapsed=0,fps=60,navDelay=0,noticeExpiry=0;
let lastHud=0,pawClicks=0,sequence='';
const discovered=new Set<string>();
try{const raw=localStorage.getItem('moonpaw-journal-v2')||'[]';if(raw.length<=32768){const records=JSON.parse(raw);const known=new Set(Array.from({length:10},(_,i)=>[`${i}:intro`,`${i}:0`,`${i}:1`]).flat());if(Array.isArray(records))for(const key of records.slice(0,100))if(typeof key==='string'&&known.has(key))discovered.add(key);}}catch{}
const persistJournal=()=>{try{localStorage.setItem('moonpaw-journal-v2',JSON.stringify([...discovered]));}catch{}};
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const button=(label:string,action:string,kind='')=>`<button data-action="${action}" class="${kind}">${label}</button>`;
const exitButton=()=>canExit?button(exitLabel,'exit','exit-link'):'';
const pactInfo={fang:{name:'Serrated Fang',detail:'Your third consecutive strike deals double damage. Keep pressure on the enemy; the combo fades quickly.'},ward:{name:'Iron Carapace',detail:'Seven health instead of five. Each strike costs more stamina. A durable, deliberate build.'},rush:{name:'Cinder Step',detail:'Faster movement and cheaper dodges. Trade careful positioning for close, aggressive pressure.'}};
const fullscreen=new FullscreenControl(updateFullscreen);
const fullscreenButton=(compact=false)=>fullscreen.supported?`<button data-action="fullscreen" class="${compact?'pause':'plain'}" aria-label="${fullscreen.active?'Exit fullscreen':'Fullscreen'}" title="${fullscreen.active?'Exit fullscreen':'Fullscreen'} (F11)">${compact?icon('full'):fullscreen.active?'Exit fullscreen':'Fullscreen'}</button>`:'';
function updateFullscreen(){document.querySelectorAll<HTMLButtonElement>('[data-action=fullscreen]').forEach(b=>{b.setAttribute('aria-label',fullscreen.active?'Exit fullscreen':'Fullscreen');b.title=`${fullscreen.active?'Exit fullscreen':'Fullscreen'} (F11)`;b.innerHTML=b.classList.contains('pause')?icon('full'):fullscreen.active?'Exit fullscreen':'Fullscreen';});}
const reset=()=>{dock.dispose();dock=new TouchDock(controls,input);input.reset();};
const resetFrameClock=()=>{clock=performance.now();accumulator=0;navDelay=0;pending={move:0,jump:false,jumpPressed:false,dashPressed:false,attackPressed:false,pausePressed:false,confirmPressed:false};};
function notice(text:string,duration=6500){narration.hidden=false;narration.classList.add('visible');narration.textContent=text;noticeExpiry=elapsed+duration/1000;}
function stageStart(index:number){
  audio.unlock();game.start(index);renderer.setStage(game.state.stage);intro=0;ending=undefined;page='title';
  cinematicTime=0;game.pause();reset();resetFrameClock();renderer.setCinematic(true,index,0,0);audio.start(index);discovered.add(`${index}:intro`);persistJournal();sync();canvas.focus();
}
function begin(){intro=-1;renderer.setCinematic(false,game.state.stageIndex,0,0);game.resume();reset();resetFrameClock();sync();canvas.focus();notice(game.state.stage.description,6500);}
function title(){intro=-1;cinematicTime=0;renderer.setCinematic(false,game.state.stageIndex,0,0);ending=undefined;game.menu();audio.enterTitle(game.save.unlocked-1);page='title';renderer.setStage(game.state.stage);reset();resetFrameClock();sync();}
function credits(){return `<p>Created & directed by <strong>Adnan Naous</strong>.</p><p class="quiet">Movement, combat pressure and layered fantasy worlds informed the direction. No artwork, characters or soundtrack from the referenced games was copied.</p><p class="quiet">Instrument samples: GeneralUser GS, S. Christian Collins. Used for original game arrangements under its music-production license. <a href="https://github.com/mrbumpy409/GeneralUser-GS" target="_blank" rel="noopener noreferrer">Instrument source ↗</a></p><p class="quiet">Typography: Barlow and Barlow Condensed by the Barlow Project Authors, bundled under the SIL Open Font License. <a href="./barlow-OFL.txt" target="_blank" rel="noopener noreferrer">Font license ↗</a></p><p class="quiet">Title lettering: Cormorant SC by the Cormorant Project Authors, bundled under the SIL Open Font License. <a href="./cormorant-OFL.txt" target="_blank" rel="noopener noreferrer">Title font license ↗</a></p><nav class="links">${CREATOR_LINKS.map(l=>`<a href="${l.url}" target="_blank" rel="noopener noreferrer">${escape(l.label)} ↗</a>`).join('')}</nav><p class="quiet">For the ones who were never named.</p>`;}
function journal(){
  const records=STAGE_INFO.flatMap((stage,i)=>{
    if(!discovered.has(`${i}:intro`))return [];
    const notes=FIELD_NOTES[i].filter((_,n)=>discovered.has(`${i}:${n}`));
    return [`<article><h3>${String(i+1).padStart(2,'0')} · ${escape(stage.name)}</h3><p>${CHAPTERS[i].lines.map(l=>`<b>${escape(l.speaker)}</b> — ${escape(l.text)}`).join('<br>')}</p>${notes.map(n=>`<p class="record"><b>${escape(n.speaker)}</b><br>${escape(n.text)}</p>`).join('')}</article>`];
  });
  return records.length?records.join(''):'<p>The pages are empty. Enter the crypt. Listen to the witnesses.</p>';
}
function secondary(){
  if(page==='exit')return `<p class="eyebrow">LEAVING THE CITY</p><h2>${exitLabel}?</h2><p>Chapter unlocks, discovered memories and settings are saved. Your current attempt ends.</p><div class="dialog-actions">${button('Stay','exit-cancel','primary')}${button(exitLabel,'exit-confirm','danger')}</div>`;
  if(page==='pacts')return `<p class="eyebrow">THE ENCOUNTER IS BROKEN</p><h2>Choose your pact</h2><p class="quiet">One change to your fighting style for this chapter.</p><div class="pact-cards">${game.state.boonOptions.map(id=>`<button data-pact="${id}"><span class="pact-symbol">${id==='fang'?'⟋⟋':id==='ward'?'⬡':'≋'}</span><strong>${pactInfo[id].name}</strong><p>${pactInfo[id].detail}</p></button>`).join('')}</div>`;
  if(page==='settings'){
    const slider=(label:string,id:string,value:number)=>`<label class="setting-row" for="${id}"><span>${label}</span><output for="${id}">${Math.round(value*100)}%</output><input id="${id}" aria-label="${label}" type="range" min="0" max="1" step=".01" value="${value}"></label>`;
    const content=settingsTab==='audio'?`<div class="setting-row"><span>Sound</span><button data-action="mute" class="switch" aria-pressed="${settings.muted}">${settings.muted?'Muted':'On'}</button></div>${slider('Master volume','volume',settings.volume)}${slider('Music','music-volume',settings.musicVolume)}${slider('Effects volume','effects-volume',settings.effectsVolume)}${button('Test sound','sound-test','setting-test')}<p class="quiet">Music and combat sounds have independent levels. Mute keeps your volume choices.</p>`:settingsTab==='display'?`<div class="setting-row"><span>Window</span>${fullscreenButton()}</div><label class="setting-row" for="quality"><span>Effects</span><select id="quality" aria-label="Effects"><option value="low" ${settings.quality==='low'?'selected':''}>Performance</option><option value="balanced" ${settings.quality==='balanced'?'selected':''}>Balanced</option><option value="high" ${settings.quality==='high'?'selected':''}>Detailed</option></select></label><label class="setting-row" for="reduced-motion"><span>Reduce decorative motion</span><input id="reduced-motion" type="checkbox" ${settings.reducedMotion?'checked':''}></label><p class="quiet">Enemy warnings and attack animation remain visible. F11 toggles fullscreen on desktop.</p>`:`<label class="setting-row" for="large-touch"><span>Larger touch buttons</span><input id="large-touch" type="checkbox" ${settings.largeTouch?'checked':''}></label><dl class="key-guide"><div><dt>Move</dt><dd>A / D · arrows · stick</dd></div><div><dt>Jump</dt><dd>Space · A · left mouse</dd></div><div><dt>Dodge</dt><dd>Shift · B · right mouse</dd></div><div><dt>Strike</dt><dd>J · RT / Y</dd></div><div><dt>Pause</dt><dd>Escape · Start</dd></div></dl><p class="quiet">Hold jump for height. Dodge enemy attacks during its short protected window. Spikes and machinery still hurt.</p>`;
    return `<h2>Settings</h2><nav class="settings-tabs" aria-label="Settings category">${(['audio','display','controls'] as const).map(tab=>`<button data-settings-tab="${tab}" aria-pressed="${settingsTab===tab}">${tab[0].toUpperCase()+tab.slice(1)}</button>`).join('')}</nav><section class="settings-content" aria-label="${settingsTab} settings">${content}</section><footer class="settings-footer">${button('Return to title','title')}${exitButton()}</footer>`;
  }
  if(page==='credits')return `<h2>Credits</h2>${credits()}`;
  if(page==='journal')return `<h2>The witnesses</h2><div class="journal">${journal()}</div>`;
  return journeyScreen(game.save,previewChapter);
}
function sync(){
  const mode=game.state.mode,menu=mode==='menu';lastMode=mode;
  document.body.dataset.mode=menu?'menu':intro>=0?'story':mode;
  hud.hidden=menu||intro>=0;controls.hidden=menu||!touch||intro>=0;narration.hidden=menu||intro>=0;
  controls.classList.toggle('disabled',mode!=='playing');
  hud.innerHTML=menu?'':`<div class="vitals"><span class="vital-emblem">${icon('seal')}</span><div><div id="health" role="meter" aria-label="Health" aria-valuemin="0"></div><div class="stamina" role="meter" aria-label="Stamina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i></i></div></div></div><div class="identity"><small>THRESHOLD ${String(game.state.stageIndex+1).padStart(2,'0')}</small><strong>${escape(game.state.stage.name)}</strong><span id="objective"></span></div><div class="window-actions"><span id="relics" title="Recovered names"></span>${fullscreenButton(true)}<button data-action="pause" class="pause" aria-label="Pause">${icon('pause')}</button></div><div id="opponent" hidden><small></small><div role="meter" aria-label="Enemy health" aria-valuemin="0"><i></i></div></div>`;
  if(menu&&page==='title')app.innerHTML=titleScreen(game.save,fullscreenButton(),exitButton());
  else if(menu||page!=='title')app.innerHTML=`<section class="sheet ${page==='settings'?'settings-sheet':page==='pacts'?'pact-sheet':page==='chapters'?'journey-sheet':''}">${page==='pacts'?'':button('← Back','back','back')}${secondary()}</section>`;
  else if(intro>=0)app.innerHTML=cinematicScreen(game.state.stageIndex,intro,game.state.stage.name,settings.reducedMotion);
  else if(mode==='paused')app.innerHTML=`<section class="dialog"><p class="eyebrow">THE BELL IS STILL</p><h2>Pause</h2>${button('Resume','resume','primary')}<nav class="pause-nav">${button('Journal','journal')}${button('Settings','settings')}${button('Restart','restart')}${button('Title','title')}${exitButton()}</nav></section>`;
  else if(mode==='complete')app.innerHTML=`<section class="dialog"><p class="eyebrow">A NAME CARRIED BEYOND THE GATE</p><h2>${escape(game.state.stage.name)}</h2><p class="story-text">${escape(CHAPTERS[game.state.stageIndex].after)}</p>${button('Cross the next threshold','next','primary')}${button('Title','title','plain')}</section>`;
  else if(mode==='ending')app.innerHTML=ending?`<section class="dialog ending"><p class="eyebrow">${ENDINGS[ending].tag}</p><h2>${ENDINGS[ending].title}</h2>${ENDINGS[ending].lines.map(l=>`<p>${escape(l)}</p>`).join('')}${button('Credits','ending-credits','primary')}${button('Title','title','plain')}</section>`:`<section class="dialog"><p class="eyebrow">THE REGENT FALLS SILENT</p><h2>What will you give?</h2><p>${escape(CHAPTERS[9].after)}</p>${button('Give your name','ending-lantern','choice')}${button('Leave alone','ending-home','choice')}${button('Name every witness','ending-dawn','choice')}<p class="quiet">${game.save.secrets?.length||0}/10 memories recovered. Every witness is needed to break the bell.</p></section>`;
  else app.innerHTML='';
  app.classList.toggle('open',!!app.innerHTML);
  app.classList.toggle('title-open',menu&&page==='title');
  app.classList.toggle('story-open',intro>=0&&page==='title');
  document.body.dataset.page=page;
  renderer.setPresentation(menu?'title':'game');
  app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action!)));
  app.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>{b.addEventListener('click',()=>stageStart(Number(b.dataset.stage)));b.addEventListener('focus',()=>previewJourney(Number(b.dataset.stage)));b.addEventListener('pointerenter',()=>previewJourney(Number(b.dataset.stage)));});
  app.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(b=>b.addEventListener('click',()=>{settingsTab=b.dataset.settingsTab as typeof settingsTab;sync();}));
  app.querySelectorAll<HTMLButtonElement>('[data-pact]').forEach(b=>b.addEventListener('click',()=>{if(game.selectBoon(b.dataset.pact as 'fang'|'ward'|'rush')){page='title';game.resume();reset();sync();canvas.focus();notice('Your pact is carried through this chapter.',4500);}}));
  hud.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action!)));
  app.querySelector<HTMLSelectElement>('#quality')?.addEventListener('change',e=>{settings.quality=(e.target as HTMLSelectElement).value as Quality;renderer.setQuality(settings.quality);storeSettings(settings);});
  for(const [id,key,set] of [['volume','volume',(v:number)=>audio.setVolume(v)],['music-volume','musicVolume',(v:number)=>audio.setMusicVolume(v)],['effects-volume','effectsVolume',(v:number)=>audio.setEffectsVolume(v)]] as const)app.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input',e=>{const value=Number((e.target as HTMLInputElement).value);settings[key]=value;set(value);const output=app.querySelector<HTMLOutputElement>(`output[for="${id}"]`);if(output)output.value=`${Math.round(value*100)}%`;storeSettings(settings);});
  app.querySelector<HTMLInputElement>('#reduced-motion')?.addEventListener('change',e=>{settings.reducedMotion=(e.target as HTMLInputElement).checked;renderer.setReducedMotion(settings.reducedMotion);document.body.classList.toggle('reduce-motion',settings.reducedMotion);storeSettings(settings);});
  app.querySelector<HTMLInputElement>('#large-touch')?.addEventListener('change',e=>{settings.largeTouch=(e.target as HTMLInputElement).checked;document.body.classList.toggle('large-touch',settings.largeTouch);reset();renderer.resize();storeSettings(settings);});
  updateHud();renderer.resize();
}
function previewJourney(index:number){
  if(page!=='chapters'||index===previewChapter)return;
  previewChapter=index;
  const wrapper=document.createElement('div');wrapper.innerHTML=journeyScreen(game.save,index);
  const detail=wrapper.querySelector('.journey-detail');if(detail)app.querySelector('.journey-detail')?.replaceWith(detail);
  app.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.stage)===index?'step':'false'));
}
function action(key:string){
  audio.unlock();
  audio.ui(['back','title','exit-cancel'].includes(key)?'back':'confirm');
  if(key==='fullscreen'){void fullscreen.toggle().catch(()=>notice('Fullscreen is unavailable in this window. Use F11 in the desktop app.'));return;}
  if(key==='sound-test'){audio.play('attack');return;}
  if(key==='exit'){if(game.state.mode==='playing'){game.pause();reset();}exitReturn=page;page='exit';sync();return;}
  if(key==='exit-cancel'){page=exitReturn;sync();return;}
  if(key==='exit-confirm'){storeSave(game.save);storeSettings(settings);persistJournal();title();void exitApplication().catch(()=>notice('The app could not close. Use the system window controls.'));return;}
  if(key==='start')stageStart(game.save.unlocked-1);
  else if(['chapters','settings','journal','credits'].includes(key)){page=key as typeof page;sync();}
  else if(key==='back'){page='title';sync();}
  else if(key==='story-next'){if(intro<0)return;if(++intro>=CHAPTERS[game.state.stageIndex].lines.length)begin();else{cinematicTime=0;reset();resetFrameClock();renderer.setCinematic(true,game.state.stageIndex,intro,0);sync();app.querySelector<HTMLButtonElement>('[data-action=story-next]')?.focus({preventScroll:true});}}
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
  const relics=hud.querySelector('#relics'),relicCount=`${s.relicsCollected}/${s.relicsRequired}`;if(relics&&relics.getAttribute('data-count')!==relicCount){relics.setAttribute('data-count',relicCount);relics.innerHTML=`<span aria-hidden="true">${icon('seal')}</span><b>${s.relicsCollected}<small> / ${s.relicsRequired}</small></b>`;}
  const health=hud.querySelector('#health');if(health){health.setAttribute('aria-valuenow',String(s.player.health));health.setAttribute('aria-valuemax',String(s.player.maxHealth));const value=`${s.player.health}/${s.player.maxHealth}`;if(health.getAttribute('data-health')!==value){health.setAttribute('data-health',value);health.innerHTML=Array.from({length:s.player.maxHealth},(_,i)=>`<i class="${i<s.player.health?'filled':''}" aria-hidden="true"></i>`).join('');}}
  const objective=hud.querySelector('#objective');if(objective)objective.textContent=s.arenaActive?'THE WAY IS SEALED':`${s.stage.arenas.filter(a=>a.cleared).length} / 3 ENCOUNTERS`;
  const opponent=hud.querySelector<HTMLElement>('#opponent'),enemy=s.stage.enemies.filter(e=>e.arena===s.arenaActive&&e.health>0).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
  if(opponent){opponent.hidden=!enemy;if(enemy){opponent.querySelector('small')!.textContent=enemy.kind==='regent'?`REGENT · ${enemy.bossPhase}/3`:enemy.kind.toUpperCase();const meter=opponent.querySelector('[role=meter]')!;meter.setAttribute('aria-valuenow',String(enemy.health));meter.setAttribute('aria-valuemax',String(enemy.maxHealth));opponent.querySelector<HTMLElement>('i')!.style.width=`${enemy.health/enemy.maxHealth*100}%`;}}
  if(elapsed>noticeExpiry){narration.textContent=s.warning||'';narration.classList.toggle('visible',Boolean(s.warning));}
}
function gamepadMenu(sample:InputFrame,dt:number){
  navDelay=Math.max(0,navDelay-dt);if(input.device!=='controller')return;
  const items=[...app.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(b=>b.getBoundingClientRect().height>0);
  if(!items.length)return;const focused=document.activeElement;
  if(Math.abs(sample.move)>.5&&navDelay===0&&app.contains(focused)){
    if(focused instanceof HTMLInputElement&&focused.type==='range'){focused.value=String(Math.max(0,Math.min(1,Number(focused.value)+Math.sign(sample.move)*.05)));focused.dispatchEvent(new Event('input',{bubbles:true}));navDelay=.14;return;}
    if(focused instanceof HTMLSelectElement){focused.selectedIndex=Math.max(0,Math.min(focused.options.length-1,focused.selectedIndex+Math.sign(sample.move)));focused.dispatchEvent(new Event('change',{bubbles:true}));navDelay=.24;return;}
  }
  const direction=sample.nav||sample.move;
  if(Math.abs(direction)>.5&&navDelay===0){const now=items.indexOf(document.activeElement as HTMLElement);items[(now+(direction>0?1:-1)+items.length)%items.length].focus();navDelay=.24;}
  if(sample.confirmPressed){if(focused instanceof HTMLElement&&app.contains(focused)){if(focused instanceof HTMLInputElement&&focused.type==='checkbox'||focused instanceof HTMLButtonElement||focused instanceof HTMLAnchorElement)focused.click();}else items[0].focus();}
}
let pending:InputFrame={move:0,jump:false,jumpPressed:false,dashPressed:false,attackPressed:false,pausePressed:false,confirmPressed:false};
function frame(now:number){
  requestAnimationFrame(frame);const dt=Math.min(.075,Math.max(0,(now-clock)/1000));clock=now;
  if(document.hidden){accumulator=0;return;}elapsed+=dt;fps+=(1/Math.max(dt,.001)-fps)*.04;
  const sample=input.sample();
  if(intro>=0){cinematicTime+=dt;renderer.setCinematic(true,game.state.stageIndex,intro,cinematicTime);}
  if(game.state.mode==='playing'&&intro<0&&game.state.boonOptions.length){audio.play('arena_cleared');game.pause();reset();page='pacts';sync();}
  audio.setIntensity(game.state.arenaActive?1:0);
  audio.tickMotion(game.state,dt);
  pending={...sample,jumpPressed:pending.jumpPressed||sample.jumpPressed,dashPressed:pending.dashPressed||sample.dashPressed,attackPressed:pending.attackPressed||sample.attackPressed,pausePressed:pending.pausePressed||sample.pausePressed};
  if(game.state.mode==='playing'){
    accumulator+=dt;let steps=0;
    while(accumulator>=1/120&&steps++<10){renderer.capturePhysics(game.state);game.update(1/120,pending);pending.jumpPressed=pending.dashPressed=pending.pausePressed=false;pending.attackPressed=false;accumulator-=1/120;}
    if(game.state.player.deadTime===0){
      for(let n=0;n<2;n++)if(game.state.player.x/game.state.stage.length>(n===0?.33:.70)&&!discovered.has(`${game.state.stageIndex}:${n}`)){
        const note=FIELD_NOTES[game.state.stageIndex][n];discovered.add(`${game.state.stageIndex}:${n}`);persistJournal();notice(`${note.speaker} — ${note.text}`,10000);
      }
    }
  }else{
    accumulator=0;
    if(intro>=0){
      if(sample.pausePressed)action('begin');
      else if(sample.confirmPressed&&!app.contains(document.activeElement))action('story-next');
      else gamepadMenu(sample,dt);
    }
    else if(sample.pausePressed&&game.state.mode==='paused'){if(page==='pacts')notice('Choose a pact to continue.');else if(page!=='title'){page='title';sync();}else action('resume');}
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
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('film-suspended',document.hidden);if(document.hidden){if(game.state.mode==='playing')action('pause');reset();audio.suspend();}else resetFrameClock();});
canvas.addEventListener('pointerdown',()=>audio.unlock());
app.addEventListener('pointerover',e=>{if((e.target as HTMLElement).closest('button'))audio.ui('focus');});
app.addEventListener('focusin',e=>{if((e.target as HTMLElement).closest('button,input,select'))audio.ui('focus');});
addEventListener('pagehide',()=>{storeSave(game.save);persistJournal();});
onAndroidBack(()=>{if(intro>=0)action('begin');else if(game.state.mode==='playing')action('pause');else if(page!=='title')action('back');else action('exit');});
addEventListener('keydown',e=>{if(!e.repeat){sequence=(sequence+e.key).slice(-3);if(sequence==='351')notice('CELL 351 · A name the Regent could not take. Adnan was here.',9000);}});
app.addEventListener('click',e=>{if((e.target as HTMLElement).closest('h1')&&++pawClicks===7){notice('Seven vows. Three still unbroken.',6000);pawClicks=0;}});
// The production game never exposes mutable simulation state to its page.
if(import.meta.env.DEV||window.moonpawDesktop?.testing)Object.defineProperty(window,'moonpaw',{value:{get state(){return game.state;},get save(){return game.save;},get stats(){return {...renderer.stats,fps};}}});
audio.enterTitle(game.save.unlocked-1);sync();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol!=='moonpaw:'&&import.meta.env.PROD)void navigator.serviceWorker.register('./sw.js').catch(console.warn);
