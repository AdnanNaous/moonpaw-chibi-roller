import type { Checkpoint, Hazard, Pickup, Platform, Stage, Theme } from './types';

/** Platform x is its left edge and y is its top; bodies extend h units down. */
const ground = (id: string, x: number, w: number, y = 0): Platform => ({ id, x, y, w, h: 1.5, kind: 'solid' });
const ledge = (id: string, x: number, y: number, w: number, kind: Platform['kind'] = 'solid', phase = 0): Platform =>
  ({ id, x, y, w, h: .42, kind, baseX: x, baseY: y, phase, active: true });
const hazard = (id: string, x: number, y: number, w: number, h: number, kind: Hazard['kind'], phase = 0): Hazard =>
  ({ id, x, y, w, h, kind, phase, active: true });
const crystals = (...xs: number[]): Pickup[] => xs.map((x, i) => ({ id: `gem-${i}`, x, y: i % 3 === 0 ? 2.5 : 1.65, collected: false }));
const memory = (x: number, y: number): Pickup => ({ id: 'memory', x, y, collected: false, secret: true });
const checkpoints = (...xs: number[]): Checkpoint[] => xs.map((x, i) => ({ id: `bell-${i}`, x, y: 0, active: false }));

interface Blueprint {
  id: string; name: string; subtitle: string; theme: Theme; accent: string; description: string;
  length: number; platforms: Platform[]; hazards: Hazard[]; pickups: Pickup[]; checkpoints: Checkpoint[]; wind: number;
}

const blueprints: Blueprint[] = [
  {
    id: 'petal-promenade', name: 'The Last Platform', subtitle: 'The petals remember', theme: 'sakura', accent: '#ff2f74',
    description: 'Follow the falling petals and ring the garden bells.', length: 76, wind: 0,
    platforms: [ground('g0', 0, 13), ground('g1', 15.5, 12.5), ground('g2', 30.5, 13), ground('g3', 46, 12), ground('g4', 60, 16),
      ledge('l0', 9, 1.8, 3), ledge('l1', 20, 1.85, 3.5), ledge('l2', 35, 1.85, 3), ledge('l3', 53, 1.8, 3.5), ledge('l4', 65, 1.8, 3)],
    hazards: [hazard('h0', 23.5, 0, 1.2, .35, 'spikes'), hazard('h1', 51, 0, 1.3, .35, 'spikes')],
    pickups: [...crystals(5, 10, 17, 22, 32, 37, 43, 49, 54, 64, 68, 72), memory(10.5, 3)], checkpoints: checkpoints(31, 61),
  },
  {
    id: 'sawdust-switchback', name: 'Sawdust Chapel', subtitle: 'The old timberworks', theme: 'sawmill', accent: '#ffae49',
    description: 'Ride the timber belts and time your way past the spinning blades.', length: 82, wind: 0,
    platforms: [ground('g0', 0, 12), ground('g1', 15, 11), ground('g2', 29, 11), ground('g3', 43, 12), ground('g4', 58, 10), ground('g5', 71, 11),
      ledge('belt0', 17, 1.85, 5, 'conveyor', 1), ledge('moving0', 27, 1.4, 3.2, 'moving', 0),
      ledge('crumb0', 38, 1.85, 2.7, 'crumble'), ledge('belt1', 47, 1.85, 5, 'conveyor', -1),
      ledge('moving1', 66, 1.7, 3.2, 'moving', 1.5), ledge('l5', 74, 1.85, 3)],
    hazards: [hazard('saw0', 19.5, .35, .95, .95, 'saw'), hazard('spike0', 33, 0, 1.3, .4, 'spikes'),
      hazard('saw1', 49.5, .35, .95, .95, 'saw', 1), hazard('spike1', 62.5, 0, 1.2, .4, 'spikes')],
    pickups: [...crystals(5, 10, 17, 20, 25, 31, 37, 45, 50, 56, 61, 67, 74, 78), memory(39.2, 3)], checkpoints: checkpoints(30, 59),
  },
  {
    id: 'afterglow-arcade', name: 'Dead Air District', subtitle: 'Lights after midnight', theme: 'neon', accent: '#2ff7ef',
    description: 'Blinking beams guard the rooftops of the sleeping arcade.', length: 86, wind: 0,
    platforms: [ground('g0', 0, 11), ground('g1', 14, 10), ground('g2', 27, 11), ground('g3', 41, 10), ground('g4', 54, 11), ground('g5', 68, 18),
      ledge('l0', 8, 1.85, 3), ledge('moving0', 25, 1.6, 3.2, 'moving', .4), ledge('l2', 33, 1.85, 3),
      ledge('crumb0', 47, 1.85, 3, 'crumble'), ledge('moving1', 63, 1.6, 3.3, 'moving', 2), ledge('l5', 75, 1.85, 4)],
    hazards: [hazard('laser0', 19, 0, .28, 3.1, 'laser', 0), hazard('spike0', 32, 0, 1.3, .35, 'spikes'),
      hazard('laser1', 46, 0, .28, 3.1, 'laser', 1.6), hazard('laser2', 59, 0, .28, 3.1, 'laser', 3.2),
      hazard('saw0', 72, .25, .9, .9, 'saw')],
    pickups: [...crystals(4, 9, 16, 22, 28, 34, 39, 44, 49, 56, 62, 68, 75, 81), memory(76.8, 3)], checkpoints: checkpoints(28, 55),
  },
  {
    id: 'cloudline-circus', name: 'The Hanging Choir', subtitle: 'Above the rooftops', theme: 'sky', accent: '#8db8ff',
    description: 'Catch the drifting clouds while the upper winds change direction.', length: 90, wind: .9,
    platforms: [ground('g0', 0, 11), ground('g1', 14, 9), ground('g2', 27, 10), ground('g3', 41, 9), ground('g4', 54, 10), ground('g5', 68, 10), ground('g6', 82, 8),
      ledge('moving0', 11.5, 1.2, 3.5, 'moving', 0), ledge('l1', 18, 1.85, 3), ledge('moving1', 24, 1.4, 3.6, 'moving', 1.7),
      ledge('crumb0', 34, 1.85, 2.8, 'crumble'), ledge('moving2', 50, 1.5, 3.8, 'moving', .7),
      ledge('l4', 58, 1.85, 3), ledge('moving3', 65, 1.5, 3.8, 'moving', 2.5), ledge('crumb1', 75, 1.85, 3)],
    hazards: [hazard('spike0', 19, 0, 1.2, .4, 'spikes'), hazard('saw0', 31, .3, .9, .9, 'saw'),
      hazard('spike1', 59, 0, 1.4, .4, 'spikes'), hazard('saw1', 72, .3, .9, .9, 'saw', 2)],
    pickups: [...crystals(5, 12, 17, 22, 29, 35, 40, 45, 51, 57, 62, 68, 75, 83, 87), memory(35.3, 3)], checkpoints: checkpoints(28, 55),
  },
  {
    id: 'moonbyte-finale', name: 'Velvet Static', subtitle: 'One last constellation', theme: 'glitch', accent: '#d476ff',
    description: 'Race through the shifting moonlight to the final star.', length: 96, wind: -.35,
    platforms: [ground('g0', 0, 10), ground('g1', 13.5, 9), ground('g2', 26, 9), ground('g3', 38.5, 9), ground('g4', 51, 9), ground('g5', 63.5, 9), ground('g6', 76, 9), ground('g7', 88, 8),
      ledge('crumb0', 9, 1.85, 3, 'crumble'), ledge('moving0', 22.5, 1.6, 3.5, 'moving', .7),
      ledge('belt0', 30, 1.85, 3.5, 'conveyor', -1), ledge('crumb1', 47, 1.85, 3, 'crumble'),
      ledge('moving1', 59, 1.6, 3.5, 'moving', 2.2), ledge('belt1', 66, 1.85, 3.8, 'conveyor', 1),
      ledge('crumb2', 84, 1.85, 3, 'crumble'), ledge('l7', 90, 1.85, 3)],
    hazards: [hazard('laser0', 17.5, 0, .28, 3.1, 'laser'), hazard('saw0', 31, .3, .9, .9, 'saw'),
      hazard('spike0', 42, 0, 1.3, .4, 'spikes'), hazard('laser1', 55, 0, .28, 3.1, 'laser', 2.1),
      hazard('saw1', 68, .3, .9, .9, 'saw', 1), hazard('laser2', 80, 0, .28, 3.1, 'laser', 3.5)],
    pickups: [...crystals(4, 10, 16, 23, 29, 34, 40, 47, 52, 59, 65, 70, 77, 84, 92), memory(85.2, 3)], checkpoints: checkpoints(27, 52, 77),
  },
  {
    id: 'orchard-of-teeth', name: 'Orchard of Teeth', subtitle: 'The roots can hear you', theme: 'sakura', accent: '#ff3b7c',
    description: 'Bare branches mark a low path of thorns and a high path of crumbling petals.', length: 101, wind: 0,
    platforms: [ground('g0', 0, 14), ground('g1', 17.5, 11), ground('g2', 32, 12), ground('g3', 47.5, 10), ground('g4', 61, 12), ground('g5', 76.5, 11), ground('g6', 91, 10),
      ledge('petal0', 7, 1.7, 3.5, 'crumble'), ledge('petal1', 21, 1.85, 3, 'crumble'),
      ledge('root0', 28, 1.4, 3.8, 'moving', .5), ledge('petal2', 36, 1.8, 3, 'crumble'),
      ledge('root1', 44, 1.3, 3.8, 'moving', 2.2), ledge('petal3', 53, 1.8, 3, 'crumble'),
      ledge('petal4', 66, 1.85, 3, 'crumble'), ledge('root2', 73, 1.4, 3.8, 'moving', 1.3),
      ledge('petal5', 83, 1.75, 3, 'crumble'), ledge('petal6', 94, 1.8, 3, 'crumble')],
    hazards: [hazard('thorn0', 9, 0, 1.1, .42, 'spikes'), hazard('thorn1', 23, 0, 1.3, .42, 'spikes'),
      hazard('thorn2', 39, 0, 1.2, .42, 'spikes'), hazard('saw0', 55, .25, .9, .9, 'saw'),
      hazard('thorn3', 68, 0, 1.25, .42, 'spikes'), hazard('saw1', 82, .25, .9, .9, 'saw', 2)],
    pickups: [...crystals(5, 10, 18, 23, 29, 35, 42, 49, 55, 63, 69, 77, 84, 93, 97), memory(22.3, 3.05)],
    checkpoints: checkpoints(33, 62, 92),
  },
  {
    id: 'bell-foundry', name: 'The Bell Foundry', subtitle: 'No bell rings alone', theme: 'sawmill', accent: '#ff9b2f',
    description: 'Reverse belts carry you toward blades while the foundry lights cycle on and off.', length: 106, wind: 0,
    platforms: [ground('g0', 0, 12), ground('g1', 15.5, 14), ground('g2', 33, 11), ground('g3', 47.5, 11), ground('g4', 62, 12), ground('g5', 77.5, 11), ground('g6', 92, 14),
      ledge('belt0', 5, 1.75, 4.5, 'conveyor', -1), ledge('bell0', 12.5, 1.4, 3.5, 'moving', 1),
      ledge('belt1', 19, 1.8, 4.7, 'conveyor', 1), ledge('belt2', 36, 1.8, 4.5, 'conveyor', -1),
      ledge('bell1', 44, 1.35, 3.5, 'moving', .2), ledge('belt3', 51, 1.8, 4.5, 'conveyor', 1),
      ledge('belt4', 66, 1.75, 5, 'conveyor', -1), ledge('bell2', 74, 1.35, 3.5, 'moving', 2),
      ledge('belt5', 82, 1.8, 4.5, 'conveyor', 1), ledge('belt6', 96, 1.8, 4.7, 'conveyor', -1)],
    hazards: [hazard('blade0', 21, .32, .95, .95, 'saw'), hazard('blade1', 37, .32, .95, .95, 'saw', 1.4),
      hazard('laser0', 54, 0, .28, 3.1, 'laser', .5), hazard('blade2', 67.5, .32, .95, .95, 'saw', 2.5),
      hazard('laser1', 84, 0, .28, 3.1, 'laser', 2.4), hazard('blade3', 98, .32, .95, .95, 'saw', 1)],
    pickups: [...crystals(5, 12, 18, 23, 28, 35, 41, 48, 54, 61, 67, 74, 80, 86, 94, 101), memory(38.5, 3.05)],
    checkpoints: checkpoints(34, 63, 93),
  },
  {
    id: 'hospital-of-light', name: 'Hospital of Light', subtitle: 'The corridor never ends', theme: 'neon', accent: '#30fbe9',
    description: 'Quiet corridors break into strobing beams and brittle white bridges.', length: 110, wind: 0,
    platforms: [ground('g0', 0, 17), ground('g1', 20, 12), ground('g2', 35.5, 11), ground('g3', 50, 12), ground('g4', 65.5, 11), ground('g5', 80, 12), ground('g6', 95.5, 14.5),
      ledge('ward0', 10, 1.7, 3, 'crumble'), ledge('ward1', 17, 1.3, 3.5, 'moving', .2),
      ledge('ward2', 29, 1.8, 3, 'crumble'), ledge('ward3', 46, 1.3, 3.5, 'moving', 1.5),
      ledge('ward4', 58, 1.8, 3, 'crumble'), ledge('ward5', 76, 1.3, 3.5, 'moving', 2.5),
      ledge('ward6', 88, 1.8, 3, 'crumble'), ledge('ward7', 102, 1.8, 3, 'crumble')],
    hazards: [hazard('laser0', 13, 0, .28, 3.1, 'laser', 1.5), hazard('laser1', 26, 0, .28, 3.1, 'laser', 0),
      hazard('laser2', 41, 0, .28, 3.1, 'laser', 2.5), hazard('laser3', 55, 0, .28, 3.1, 'laser', 1),
      hazard('laser4', 70, 0, .28, 3.1, 'laser', 3), hazard('laser5', 85, 0, .28, 3.1, 'laser', 1.8),
      hazard('laser6', 100, 0, .28, 3.1, 'laser', .4)],
    pickups: [...crystals(5, 11, 17, 23, 30, 37, 44, 51, 58, 66, 73, 81, 88, 96, 103, 107), memory(103.4, 3.05)],
    checkpoints: checkpoints(36, 66, 96),
  },
  {
    id: 'hollow-moon', name: 'The Hollow Moon', subtitle: 'Gravity has a voice', theme: 'sky', accent: '#86b7ff',
    description: 'Long voids and wandering cloudstones demand careful air dashes.', length: 117, wind: 1.15,
    platforms: [ground('g0', 0, 10), ground('g1', 13.8, 9), ground('g2', 26.5, 8.5), ground('g3', 38.8, 9), ground('g4', 51.5, 9), ground('g5', 64.3, 9), ground('g6', 77.2, 9), ground('g7', 90, 9), ground('g8', 102.7, 14.3),
      ledge('cloud0', 9.5, 1.3, 4, 'moving', .2), ledge('cloud1', 22, 1.4, 4, 'moving', 1.6),
      ledge('cloud2', 34.5, 1.25, 4, 'moving', 2.3), ledge('cloud3', 47.5, 1.4, 4, 'moving', .8),
      ledge('cloud4', 60, 1.25, 4, 'moving', 2.8), ledge('cloud5', 73, 1.4, 4, 'moving', 1.1),
      ledge('cloud6', 85.5, 1.25, 4, 'moving', 2), ledge('cloud7', 98.3, 1.4, 4, 'moving', .4),
      ledge('moon0', 106, 1.8, 3, 'crumble')],
    hazards: [hazard('star0', 18, .2, .9, .9, 'saw'), hazard('star1', 43, .2, .9, .9, 'saw', 1),
      hazard('star2', 68, .2, .9, .9, 'saw', 2), hazard('star3', 94, .2, .9, .9, 'saw', 3)],
    pickups: [...crystals(4, 10, 15, 22, 28, 35, 41, 48, 54, 61, 67, 74, 81, 87, 94, 101, 108, 113), memory(107.2, 3.05)],
    checkpoints: checkpoints(27, 52, 78, 103),
  },
  {
    id: 'unwritten-door', name: 'The Unwritten Door', subtitle: 'Every memory has a price', theme: 'glitch', accent: '#ca69ff',
    description: 'All the broken worlds fold into one final passage.', length: 124, wind: -.5,
    platforms: [ground('g0', 0, 11), ground('g1', 14.5, 10), ground('g2', 28, 10), ground('g3', 41.5, 10), ground('g4', 55, 10), ground('g5', 68.5, 10), ground('g6', 82, 10), ground('g7', 95.5, 10), ground('g8', 109, 15),
      ledge('petal0', 8, 1.8, 3, 'crumble'), ledge('cloud0', 11, 1.25, 4, 'moving', .2),
      ledge('belt0', 19, 1.8, 4, 'conveyor', -1), ledge('petal1', 31, 1.8, 3, 'crumble'),
      ledge('cloud1', 38, 1.3, 4, 'moving', 2), ledge('belt1', 45, 1.8, 4, 'conveyor', 1),
      ledge('petal2', 58, 1.8, 3, 'crumble'), ledge('cloud2', 65, 1.25, 4, 'moving', 1.1),
      ledge('belt2', 72, 1.8, 4, 'conveyor', -1), ledge('petal3', 85, 1.8, 3, 'crumble'),
      ledge('cloud3', 92, 1.3, 4, 'moving', 2.7), ledge('belt3', 99, 1.8, 4, 'conveyor', 1),
      ledge('petal4', 112, 1.8, 3, 'crumble'), ledge('doorstep', 118, 1.8, 3)],
    hazards: [hazard('thorn0', 6.5, 0, 1.2, .4, 'spikes'), hazard('blade0', 20, .3, .9, .9, 'saw'),
      hazard('laser0', 34, 0, .28, 3.1, 'laser', 1.5), hazard('thorn1', 47, 0, 1.2, .4, 'spikes'),
      hazard('blade1', 61, .3, .9, .9, 'saw', 2), hazard('laser1', 74, 0, .28, 3.1, 'laser', .3),
      hazard('thorn2', 87, 0, 1.3, .4, 'spikes'), hazard('blade2', 100, .3, .9, .9, 'saw', 1.1),
      hazard('laser2', 114, 0, .28, 3.1, 'laser', 2.6)],
    pickups: [...crystals(4, 10, 16, 22, 29, 35, 42, 48, 55, 62, 69, 75, 82, 88, 95, 101, 110, 116, 120), memory(113.5, 3.05)],
    checkpoints: checkpoints(29, 56, 83, 110),
  },
];

// Each second act adds its own silhouette, route rhythm and landmark ledges.
// Ground gaps stay within normal jump or one air dash range; high routes are optional.
type LedgePlan = [id: string, x: number, y: number, w: number, kind: Platform['kind'], phase?: number];
type HazardPlan = [id: string, x: number, kind: Hazard['kind'], phase?: number];
function addAct(index: number, length: number, grounds: [number, number][], ledges: LedgePlan[],
  hazards: HazardPlan[], gems: number[], bells: number[]) {
  const stage = blueprints[index];
  stage.length = length;
  stage.platforms.push(...grounds.map(([x, w], i) => ground(`act2-ground-${i}`, x, w)));
  stage.platforms.push(...ledges.map(([id, x, y, w, kind, phase]) => ledge(id, x, y, w, kind, phase)));
  stage.hazards.push(...hazards.map(([id, x, kind, phase]) =>
    kind === 'laser' ? hazard(id, x, 0, .28, 3.1, kind, phase) :
      kind === 'saw' ? hazard(id, x, .3, .9, .9, kind, phase) : hazard(id, x, 0, 1.2, .4, kind, phase)));
  stage.pickups.push(...gems.map((x, i) => ({ id: `act2-gem-${i}`, x, y: i % 3 === 0 ? 2.35 : 1.55, collected: false })));
  stage.checkpoints.push(...bells.map((x, i) => ({ id: `act2-bell-${i}`, x, y: 0, active: false })));
}

addAct(0, 166,
  [[79, 12], [94, 12], [109, 13], [125, 13], [141, 12], [156, 10]],
  [['fallen-torii', 82, 1.75, 4, 'solid'], ['petal-bridge', 91, 1.3, 4, 'moving', .3],
    ['shrine-step', 99, 1.8, 3.4, 'solid'], ['paper-lantern', 114, 1.8, 4, 'crumble'],
    ['garden-arch', 130, 1.8, 4, 'solid'], ['wishing-tree', 145, 1.8, 4.2, 'solid'],
    ['last-petal', 158, 1.8, 4, 'crumble']],
  [['thorn-arch', 87, 'spikes'], ['thorn-path', 116, 'spikes'], ['thorn-tree', 147, 'spikes']],
  [81, 85, 91, 97, 102, 111, 116, 122, 130, 135, 143, 148, 157, 163], [101, 143]);

addAct(1, 172,
  [[85, 12], [100, 13], [116, 12], [131, 13], [147, 12], [160.5, 11.5]],
  [['gear-bridge', 82, 1.25, 4, 'moving', 1.5], ['reverse-belt', 88, 1.8, 5, 'conveyor', -1],
    ['chapel-bell', 102, 1.8, 4, 'solid'], ['sawdust-lift', 113, 1.25, 4, 'moving', .8],
    ['cross-belt', 119, 1.8, 5, 'conveyor', 1], ['broken-pulpit', 134, 1.8, 3, 'crumble'],
    ['lower-wheel', 149, 1.8, 5, 'conveyor', -1], ['final-bell', 164, 1.8, 4, 'solid']],
  [['blade4', 90, 'saw'], ['blade5', 121, 'saw', 2], ['blade6', 150, 'saw', 1], ['chute-thorns', 166, 'spikes']],
  [87, 91, 98, 105, 112, 119, 125, 133, 139, 148, 152, 161, 166, 169], [102, 148]);

addAct(2, 178,
  [[89, 14], [106, 13], [122, 13], [138, 13], [154, 12], [169, 9]],
  [['billboard', 92, 1.8, 4, 'solid'], ['broadcast-dish', 109, 1.8, 4, 'crumble'],
    ['night-train', 119, 1.35, 4, 'moving', 1.1], ['antenna-walk', 125, 1.8, 4, 'solid'],
    ['pixel-fall', 141, 1.8, 4, 'crumble'], ['transmitter', 157, 1.8, 4, 'solid'],
    ['signal-bridge', 166, 1.25, 4, 'moving', 2.5], ['dead-channel', 171, 1.8, 4, 'solid']],
  [['signal0', 97, 'laser', 1], ['signal1', 113, 'laser', 2.6], ['static-saw', 127, 'saw'],
    ['signal2', 144, 'laser', 1.7], ['signal3', 160, 'laser', .3]],
  [91, 96, 103, 110, 116, 124, 130, 138, 144, 151, 157, 164, 171, 175], [107, 155]);

addAct(3, 184,
  [[93.5, 12], [109, 12], [124.5, 12], [140, 12], [155.5, 12], [171, 13]],
  [['choir-step', 90, 1.2, 4, 'moving', .5], ['choir-a', 96, 1.8, 4, 'solid'],
    ['bell-cloud-a', 105, 1.35, 4, 'moving', 2], ['choir-b', 112, 1.8, 4, 'crumble'],
    ['bell-cloud-b', 121, 1.35, 4, 'moving', 1], ['choir-c', 128, 1.8, 4, 'solid'],
    ['bell-cloud-c', 137, 1.35, 4, 'moving', 2.5], ['choir-d', 144, 1.8, 4, 'crumble'],
    ['bell-cloud-d', 152, 1.35, 4, 'moving', .2], ['choir-e', 160, 1.8, 4, 'solid'],
    ['bell-cloud-e', 168, 1.35, 4, 'moving', 1.5], ['choir-f', 175, 1.8, 4, 'solid']],
  [['star4', 99, 'saw'], ['star5', 129, 'saw', 2], ['star6', 161, 'saw', 1]],
  [95, 100, 107, 113, 120, 127, 134, 141, 148, 156, 162, 170, 177, 181], [111, 157]);

addAct(4, 190,
  [[99.5, 12], [115, 12], [130.5, 12], [146, 12], [161.5, 12], [177, 13]],
  [['white-noise', 96, 1.25, 4, 'moving', .3], ['broken-frame', 103, 1.8, 3.5, 'crumble'],
    ['rewind-belt', 118, 1.8, 4, 'conveyor', -1], ['missing-scene', 127, 1.3, 4, 'moving', 1.5],
    ['paper-face', 134, 1.8, 4, 'solid'], ['frame-skip', 149, 1.8, 3.5, 'crumble'],
    ['static-belt', 165, 1.8, 4, 'conveyor', 1], ['glitch-eye', 180, 1.8, 4, 'solid']],
  [['memory-beam', 108, 'laser', 2], ['frame-saw', 120, 'saw', 1], ['memory-thorns', 135, 'spikes'],
    ['static-beam', 151, 'laser', .7], ['rewind-saw', 168, 'saw', 2]],
  [100, 105, 112, 119, 125, 132, 138, 145, 152, 159, 166, 173, 181, 187], [116, 163]);

addAct(5, 196,
  [[104.5, 12.5], [120.5, 12.5], [136.5, 12.5], [152.5, 12.5], [168.5, 12.5], [184.5, 11.5]],
  [['root-gate', 101, 1.35, 4, 'moving', 1], ['tooth-a', 108, 1.8, 3, 'crumble'],
    ['tooth-b', 124, 1.8, 3, 'crumble'], ['root-lift', 133, 1.35, 4, 'moving', 2],
    ['tooth-c', 140, 1.8, 3, 'crumble'], ['tooth-d', 156, 1.8, 3, 'crumble'],
    ['root-vault', 165, 1.35, 4, 'moving', .3], ['tooth-e', 173, 1.8, 3, 'crumble'],
    ['tooth-f', 188, 1.8, 3, 'crumble']],
  [['thorn4', 110, 'spikes'], ['thorn5', 126, 'spikes'], ['bite-saw', 142, 'saw', 1],
    ['thorn6', 158, 'spikes'], ['thorn7', 174, 'spikes'], ['bite-saw2', 190, 'saw', 2]],
  [106, 111, 118, 125, 131, 138, 145, 152, 158, 165, 172, 179, 187, 193], [121, 169]);

addAct(6, 202,
  [[109.5, 12.5], [125.5, 12.5], [141.5, 12.5], [157.5, 12.5], [173.5, 12.5], [189.5, 12.5]],
  [['bell-carriage', 106, 1.3, 4, 'moving', .8], ['hot-belt', 113, 1.8, 5, 'conveyor', 1],
    ['mold-belt', 129, 1.8, 5, 'conveyor', -1], ['hammer-lift', 138, 1.3, 4, 'moving', 2],
    ['forge-belt', 145, 1.8, 5, 'conveyor', 1], ['iron-choir', 161, 1.8, 4, 'solid'],
    ['cold-belt', 177, 1.8, 5, 'conveyor', -1], ['closing-bell', 193, 1.8, 5, 'conveyor', 1]],
  [['forge-blade0', 115, 'saw'], ['forge-beam0', 132, 'laser', 1.2], ['forge-blade1', 148, 'saw', 2.5],
    ['forge-beam1', 164, 'laser', 2.3], ['forge-blade2', 180, 'saw', .8], ['forge-beam2', 196, 'laser', .3]],
  [111, 116, 123, 130, 136, 143, 150, 158, 164, 171, 178, 185, 193, 199], [126, 174]);

addAct(7, 208,
  [[113.5, 12.5], [129.5, 12.5], [145.5, 12.5], [161.5, 12.5], [177.5, 12.5], [193.5, 14.5]],
  [['ward-bridge', 110, 1.3, 4, 'moving', 1.3], ['empty-bed-a', 116, 1.8, 3.2, 'crumble'],
    ['empty-bed-b', 132, 1.8, 3.2, 'crumble'], ['surgical-lift', 142, 1.3, 4, 'moving', .4],
    ['empty-bed-c', 148, 1.8, 3.2, 'crumble'], ['empty-bed-d', 164, 1.8, 3.2, 'crumble'],
    ['white-lift', 174, 1.3, 4, 'moving', 2.4], ['empty-bed-e', 180, 1.8, 3.2, 'crumble'],
    ['empty-bed-f', 196, 1.8, 3.2, 'crumble']],
  [['ward-laser7', 119, 'laser', .6], ['ward-laser8', 135, 'laser', 2.2],
    ['ward-laser9', 151, 'laser', 1.3], ['ward-laser10', 167, 'laser', 2.8],
    ['ward-laser11', 183, 'laser', .2], ['ward-laser12', 199, 'laser', 1.9]],
  [115, 120, 127, 134, 141, 148, 155, 162, 169, 176, 183, 190, 198, 205], [130, 178]);

addAct(8, 216,
  [[120.8, 12.2], [136.8, 12.2], [152.8, 12.2], [168.8, 12.2], [184.8, 12.2], [200.8, 15.2]],
  [['moonstone0', 117, 1.35, 4, 'moving', .1], ['moonstone1', 133, 1.35, 4, 'moving', 1.5],
    ['moonstone2', 149, 1.35, 4, 'moving', 2.3], ['moonstone3', 165, 1.35, 4, 'moving', .8],
    ['moonstone4', 181, 1.35, 4, 'moving', 1.9], ['moonstone5', 197, 1.35, 4, 'moving', 2.7],
    ['moon-cradle', 205, 1.8, 4, 'crumble']],
  [['moon-eye0', 125, 'saw'], ['moon-eye1', 157, 'saw', 2], ['moon-eye2', 189, 'saw', 1]],
  [119, 125, 132, 139, 146, 153, 160, 167, 174, 181, 188, 195, 204, 213], [137, 185]);

addAct(9, 224,
  [[127.5, 12.5], [143.5, 12.5], [159.5, 12.5], [175.5, 12.5], [191.5, 12.5], [207.5, 16.5]],
  [['unwritten-step', 124, 1.3, 4, 'moving', .7], ['garden-echo', 131, 1.8, 3, 'crumble'],
    ['bell-echo', 147, 1.8, 4, 'conveyor', -1], ['hospital-echo', 156, 1.3, 4, 'moving', 2],
    ['sky-echo', 163, 1.8, 3, 'crumble'], ['static-echo', 179, 1.8, 4, 'conveyor', 1],
    ['memory-echo', 188, 1.3, 4, 'moving', 1], ['last-page', 195, 1.8, 3, 'crumble'],
    ['door-frame', 211, 1.8, 4, 'solid'], ['final-step', 218, 1.8, 4, 'solid']],
  [['echo-thorn', 133, 'spikes'], ['echo-blade', 149, 'saw', 1], ['echo-beam', 165, 'laser', 2.3],
    ['echo-thorn2', 181, 'spikes'], ['echo-blade2', 197, 'saw', 2], ['last-beam', 213, 'laser', .5]],
  [129, 134, 141, 148, 155, 162, 169, 176, 183, 190, 197, 204, 212, 221], [144, 192]);

export const STAGE_INFO = blueprints.map(({ id, name, subtitle, theme, accent, description, length }) =>
  ({ id, name, subtitle, theme, accent, description, length }));

/** Returns fresh mutable entities; never share entity state across runs. */
export function createStage(index: number): Stage {
  const source = blueprints[Math.max(0, Math.min(blueprints.length - 1, Math.floor(index) || 0))];
  return {
    ...source,
    spawn: { x: 2, y: 0 }, exit: { x: source.length - 2, y: 0 },
    platforms: source.platforms.map(p => ({ ...p })), hazards: source.hazards.map(h => ({ ...h })),
    pickups: source.pickups.map(p => ({ ...p })), checkpoints: source.checkpoints.map(c => ({ ...c })),
  };
}
