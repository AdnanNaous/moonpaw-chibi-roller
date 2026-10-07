import type { Arena, Enemy, Hazard, Mechanic, Platform, Stage, Theme, Pickup } from './types';

type Floor = [number, number, number?];
type Shelf = [number, number, number, Platform['kind']?, number?];
type Threat = [number, Hazard['kind'], number?, number?];
interface Plan {
  id: string; name: string; subtitle: string; theme: Theme; mechanic: Mechanic; accent: string; description: string;
  floors: Floor[]; shelves: Shelf[]; threats: Threat[]; relics: number[]; bells: number[]; wind?: number; notes: [string, string];
}
const plans: Plan[] = [
  { id: 'sentence-of-stone', name: 'Sentence of Stone', subtitle: 'The Crypt Court', theme: 'crypt', mechanic: 'execution', accent: '#d9e1a5',
    description: 'The headsman counts in red. Cross each threshold after the blade falls.',
    floors: [[0,15],[18.2,13],[35,12],[50.6,13],[67.3,14],[85,12],[101.7,13],[118.5,15]],
    shelves: [[11,1.7,3],[28,1.7,3],[43,1.9,3,'crumble'],[61,2.2,3],[79,1.8,3],[95,2.0,3,'moving'],[113,2.1,3]],
    threats: [[11,'gate'],[25,'spikes'],[42,'gate',0,1.4],[58,'crusher'],[77,'gate',0,2.7],[91,'spikes'],[109,'gate',0,.8],[124,'crusher',0,1.5]],
    relics: [40,104], bells: [36,85], notes: ['THE VERDICT', 'The bells were built to warn us. Regent Ilyan made them count down instead.'] },
  { id: 'mouth-of-iron', name: 'Mouth of Iron', subtitle: 'The Foundry', theme: 'foundry', mechanic: 'furnace', accent: '#ff9b52',
    description: 'Belts pull toward hammer heads. Read the piston shadow before you leap.',
    floors: [[0,13],[16,15],[35,14],[52,14],[69.4,14],[87,14],[104.5,13],[121,16]],
    shelves: [[8,1.8,5,'conveyor',-1],[21,1.9,5,'conveyor',1],[31,2.7,3,'moving'],[39,1.9,5,'conveyor',-1],[56,2.0,5,'conveyor',1],[73,1.8,5,'conveyor',-1],[92,2.0,4,'moving'],[108,1.9,5,'conveyor',1],[126,2.0,5,'conveyor',-1]],
    threats: [[23,'crusher'],[43,'saw'],[58,'crusher',0,1.7],[75,'spikes'],[94,'crusher',0,3.1],[111,'saw'],[128,'crusher',0,.8]],
    relics: [38,107], bells: [36,87], notes: ['SHIFT LOG', 'They sealed the furnace door from the outside. Something kept feeding it.'] },
  { id: 'drowned-procession', name: 'Drowned Procession', subtitle: 'The Flooded Cistern', theme: 'flood', mechanic: 'flood', accent: '#67d4d9',
    description: 'The black tide follows the funeral bells. Climb when it rises; sprint when it drains.',
    floors: [[0,14],[18,11],[33.3,12],[49,11],[64.5,12],[81,11],[96.5,12],[113,12],[129,14]],
    shelves: [[12,1.7,4],[22,2.2,4,'moving'],[36,2.1,4],[53,2.5,4,'crumble'],[68,2.2,4,'moving'],[84,2.7,4],[100,2.3,4,'crumble'],[117,2.4,4],[133,2.5,4]],
    threats: [[13,'tide'],[39,'tide',0,1.6],[70,'tide',0,2.9],[100,'tide',0,.9],[126,'tide',0,2.1],[55,'spikes']],
    relics: [37,99], bells: [34,82,114], notes: ['WATERLINE', 'At low tide, the names scratched into the floor appear again.'] },
  { id: 'palimpsest', name: 'Palimpsest', subtitle: 'The Vanishing Archive', theme: 'archives', mechanic: 'memory', accent: '#bba6ed',
    description: 'Ink bridges fade after each bell stroke. Remember the pattern and commit.',
    floors: [[0,13],[19,11],[35,10],[50,11],[65,13],[82,11],[97,12],[113,12],[129,15]],
    shelves: [[12,1.6,5,'memory'],[19,2.2,4,'memory'],[27,2.8,4,'memory'],[35,2.1,5,'memory'],[43,2.7,5,'memory'],[51,2.0,5,'memory'],[59,2.8,4,'memory'],[68,2.2,5,'memory'],[76,2.7,5,'memory'],[84,2.1,5,'memory'],[92,2.8,5,'memory'],[101,2.1,5,'memory'],[109,2.8,4,'memory'],[117,2.1,5,'memory'],[125,2.8,5,'memory'],[135,2.4,4,'crumble']],
    threats: [[24,'darkness'],[44,'spikes'],[70,'darkness',0,2],[104,'spikes'],[123,'darkness',0,3]],
    relics: [37,101], bells: [36,83,130], notes: ['MARGIN NOTE', 'The pages return in the same order. You can trust a pattern, even here.'] },
  { id: 'the-bell-spine', name: 'The Bell Spine', subtitle: 'The Belfry', theme: 'belfry', mechanic: 'wind', accent: '#c8c6ff',
    description: 'Climb the bell towers while gusts reverse. The flags show the next push.',
    floors: [[0,11],[15.3,10,0.5],[29,10,0.9],[43,11,0.2],[59,9,0.8],[73,10,0.1],[88,10,0.8],[103,10,0.2],[118,14]],
    shelves: [[9,1.8,4,'moving'],[19,2.4,4],[32,3.1,4,'moving'],[46,2.8,5],[57,3.0,4,'moving'],[76,2.7,5,'crumble'],[90,3.1,4,'moving'],[106,2.5,4],[120,3.2,4,'moving']],
    threats: [[21,'blade'],[36,'spikes'],[52,'blade',0,1.4],[77,'blade',0,2.4],[95,'spikes'],[111,'blade',0,.5]],
    relics: [32,91], bells: [43,88], wind: 1.4, notes: ['BELL ROPE', 'Three strokes: the wind turns. One stroke: hold fast.'] },
  { id: 'the-hungry-orchard', name: 'The Hungry Orchard', subtitle: 'Orchard of Teeth', theme: 'orchard', mechanic: 'stalker', accent: '#d58490',
    description: 'The root things stalk a straight line. Turn and strike, then use the opening.',
    floors: [[0,17],[20,14],[37,15],[55,14],[72,13],[88,14],[105,13],[121,16]],
    shelves: [[13,1.6,4,'crumble'],[25,2.2,4],[42,1.8,4,'moving'],[59,2.1,4,'crumble'],[75,1.9,4],[92,2.2,4,'moving'],[109,1.7,4,'crumble'],[126,2.1,4]],
    threats: [[25,'hunter'],[44,'spikes'],[60,'hunter',0,1.2],[80,'hunter',0,2.2],[95,'spikes'],[112,'hunter',0,.7],[129,'hunter',0,1.9]],
    relics: [43,109], bells: [38,89], notes: ['ROOT WARNING', 'The sentries learned to climb. A ledge buys time; it does not end the hunt.'] },
  { id: 'arrow-vigil', name: 'Arrow Vigil', subtitle: 'The Prison Ramparts', theme: 'prison', mechanic: 'arrows', accent: '#9ad5b7',
    description: 'Red aim lines mark each shot. Run beneath the high volleys and jump the low.',
    floors: [[0,16],[19,13],[35.5,13],[52,12],[68,12],[84,12],[100,13],[117,15]],
    shelves: [[11,2,4],[26,2.5,4,'crumble'],[39,2,4],[55,2.7,4,'moving'],[72,2.2,4],[88,2.8,4,'crumble'],[103,2.1,4],[120,2.5,4]],
    threats: [[20,'arrow'],[38,'arrow',1.35,1.1],[54,'arrow',0,2.1],[72,'arrow',1.35,.3],[89,'arrow',0,1.6],[106,'arrow',1.35,2.8],[122,'arrow',0,.8]],
    relics: [46.5,102], bells: [36,85], notes: ['WATCH ORDER', 'The archers fire on the drum. The drawn line is the only honest warning.'] },
  { id: 'choir-of-knives', name: 'Wheel of Knives', subtitle: 'The Rotating Engine', theme: 'choir', mechanic: 'blades', accent: '#e6b6aa',
    description: 'Each blade sweeps a fixed arc. Wait for the backswing, then move.',
    floors: [[0,15],[18,12],[34,11],[49,11],[64,11],[79,11],[94,12],[110,12],[126,15]],
    shelves: [[12,1.7,4,'moving'],[23,2.0,4],[37,2.5,4],[52,2.0,4,'crumble'],[67,2.6,4],[82,2.0,4,'moving'],[98,2.5,4],[114,2.1,4,'crumble'],[131,2.5,4]],
    threats: [[13,'blade'],[26,'blade',0,1.5],[41,'blade',0,2.9],[56,'blade',0,.7],[70,'blade',0,2],[86,'blade',0,.2],[101,'blade',0,1.2],[117,'blade',0,2.5],[133,'blade',0,.4]],
    relics: [37,100], bells: [35,80,126], notes: ['MUSIC SHEET', 'Every rotation has a rest. Breathe there.'] },
  { id: 'unlit-below', name: 'Unlit Below', subtitle: 'The Abyss', theme: 'abyss', mechanic: 'darkness', accent: '#8cb1e9',
    description: 'Lanterns blink out in sequence. Follow their last glow and listen for the floor.',
    floors: [[0,12],[16,11],[31,10],[45,11],[60,10],[74,11],[89,10],[103,11],[118,11],[133,14]],
    shelves: [[10,1.8,4,'memory'],[18,2.6,4,'memory'],[28,2.0,4,'memory'],[35,2.7,4,'memory'],[48,2.3,4,'memory'],[56,2.9,4,'memory'],[63,2.0,4,'memory'],[77,2.6,4,'memory'],[85,2.0,4,'memory'],[91,2.7,4,'memory'],[106,2.2,4,'memory'],[114,2.8,4,'memory'],[124,2.0,4,'memory'],[136,2.7,4,'memory']],
    threats: [[22,'darkness'],[41,'blade',0,1.3],[67,'darkness',0,2],[83,'blade',0,.5],[110,'darkness',0,.9],[128,'blade',0,2.6]],
    relics: [35,107], bells: [32,75,119], notes: ['LAST LIGHT', 'The dark repeats. Count the lamps; do not follow the whisper.'] },
  { id: 'warden-at-the-door', name: 'Regent at the Door', subtitle: 'The Throne of Bells', theme: 'throne', mechanic: 'warden', accent: '#ed7684',
    description: 'Carry both seals to the throne. Dodge the Regent, strike on his backswing, and open the door.',
    floors: [[0,15],[18.5,12],[34.5,11],[49.5,12],[65,11],[80,12],[96,11],[111,11],[126,26]],
    shelves: [[11,1.8,4,'moving'],[24,2.2,4],[38,2.4,4,'crumble'],[52,2.1,4,'conveyor',-1],[68,2.5,4,'moving'],[84,2.1,4,'crumble'],[99,2.5,4,'conveyor',1],[114,2.3,4],[130,2.4,4]],
    threats: [[28,'gate'],[43,'blade',0,1.2],[58,'arrow',0,2],[74,'crusher',0,.6],[91,'hunter',0,1.7],[106,'gate',0,2.5],[133,'warden']],
    relics: [38,100], bells: [35,81,128], notes: ['THE DOOR', 'Two seals hold the throne shut. Regent Ilyan is the third lock.'] },
];

const floor = ([x,w,y=0]: Floor, i: number): Platform => ({ id:`ground-${i}`, x,y,w,h:2,kind:'solid',active:true });
const shelf = ([x,y,w,kind='solid',phase=0]: Shelf,i:number):Platform=>({id:`ledge-${i}`,x,y,w,h:.38,kind,phase,baseX:x,baseY:y,active:true,telegraph:0});
function threat([x,kind,y=0,phase=0]:Threat,i:number):Hazard {
  const size:Record<Hazard['kind'],[number,number]>={spikes:[1.25,.45],saw:[.9,.9],laser:[.3,3.2],gate:[.45,3.4],crusher:[1.5,1.2],tide:[9,.6],hunter:[.85,1.1],arrow:[1.1,.22],blade:[1.15,1.15],darkness:[2,1.2],warden:[1.4,2]};
  const [w,h]=size[kind];
  return {id:`threat-${i}`,x,y,w,h,kind,phase,baseX:x,baseY:y,active:kind==='spikes'||kind==='saw'||kind==='hunter'||kind==='warden',telegraph:0};
}
function pickups(plan:Plan):Pickup[] {
  const gems=plan.floors.slice(1,-1).map(([x,w],i)=>({id:`gem-${i}`,x:x+w*.5,y:1.1,collected:false,kind:'gem' as const}));
  return [...gems,...plan.relics.map((x,i)=>({id:`seal-${i}`,x,y:1.0,collected:false,kind:'relic' as const})),
    {id:'record',x:plan.bells[0]+2,y:1.2,collected:false,kind:'record',text:plan.notes[1],secret:true}];
}
export const STAGE_INFO=plans.map(({id,name,subtitle,theme,accent,description,floors})=>({id,name,subtitle,theme,accent,description,length:Math.max(...floors.map(([x,w])=>x+w))}));
function encounters(plan: Plan, index: number): { arenas: Arena[]; enemies: Enemy[] } {
  const enemies: Enemy[] = [];
  const arenas = [1, 4, plan.floors.length - 1].map((floorIndex, encounter): Arena => {
    const [fx, fw, y = 0] = plan.floors[floorIndex];
    const id = `encounter-${encounter}`;
    const arena: Arena = { id, x: fx + .65, w: fw - 1.1, enemyIds: [], cleared: false };
    const boss = index === 9 && encounter === 2;
    const kinds: Enemy['kind'][] = boss ? ['regent'] : encounter === 0 && index < 2 ? ['sentinel', 'skirmisher'] :
      index >= 4 && encounter === 1 ? ['sentinel', 'marksman', 'skirmisher'] : ['sentinel', encounter === 2 ? 'marksman' : 'skirmisher'];
    kinds.forEach((kind, position) => {
      const x = boss ? fx + fw * .58 : fx + 3.5 + position * Math.min(3.7, (fw - 6) / Math.max(1, kinds.length - 1));
      const health = boss ? 12 : kind === 'sentinel' ? 3 + (index >= 6 ? 1 : 0) : 3;
      const enemy: Enemy = { id: `${id}-${position}`, kind, arena: id, x, y, spawnX: x, spawnY: y, vy: 0,
        w: boss ? 1.45 : .8, h: boss ? 2.15 : 1.2, health, maxHealth: health,
        phase: 'idle', timer: .55 + position * .28, telegraph: 0, facing: -1,
        attackKind: 'slash', attackX: x, attackY: y, attackW: 0, attackH: 0,
        bossPhase: 1, attackCount: 0, hitCooldown: 0 };
      enemies.push(enemy); arena.enemyIds.push(enemy.id);
    });
    return arena;
  });
  return { arenas, enemies };
}
export function createStage(index:number):Stage {
  const chapter = Math.max(0,Math.min(plans.length-1,Math.floor(index)||0));
  const p=plans[chapter];
  const length=Math.max(...p.floors.map(([x,w])=>x+w));
  const combat = encounters(p, chapter);
  return {id:p.id,name:p.name,subtitle:p.subtitle,theme:p.theme,mechanic:p.mechanic,accent:p.accent,description:p.description,length,
    spawn:{x:2,y:0},exit:{x:length-2,y:0},platforms:[...p.floors.map(floor),...p.shelves.map(shelf)],
    // Dedicated arenas let attack tells stay readable; the chapter's traps remain on the traversal routes.
    hazards:p.threats.map(threat).filter(h => h.kind !== 'hunter' && h.kind !== 'warden' && !combat.arenas.some(a => h.x >= a.x && h.x < a.x + a.w)),pickups:pickups(p),checkpoints:p.bells.map((x,i)=>({
      id:`bell-${i}`,x,y:p.floors.find(([fx,w])=>x>=fx&&x<fx+w)?.[2]??0,active:false,
    })),
    wind:p.wind??0,records:p.notes,...combat};
}
