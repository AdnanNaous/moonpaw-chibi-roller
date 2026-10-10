"""Render original music and Foley. Python + NumPy + Node, no runtime synthesis.

Score instruments use GeneralUser GS 2.0.3 under its musical-recording license.
The optional render dependencies are cached in ignored .audio-tools, not
installed into the game. See docs/AUDIO_MANIFEST.md for provenance and limits.
"""
from pathlib import Path
import wave
import numpy as np
import hashlib
import json
import subprocess
import tarfile
import urllib.request

SR = 22050
OUT = Path(__file__).resolve().parents[1] / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

TOOLS = OUT.parents[1] / ".audio-tools"
TOOLS.mkdir(parents=True, exist_ok=True)

def fetch_checked(url, path, sha):
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != sha:
        with urllib.request.urlopen(url) as response:
            content = response.read()
        if hashlib.sha256(content).hexdigest() != sha:
            raise ValueError(f"Dependency checksum mismatch: {path.name}")
        path.write_bytes(content)

def render_score():
    fetch_checked("https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2", TOOLS / "GeneralUser-GS.sf2", "9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe")
    deps = [
        ("spessasynth_core", "4.3.22", "spessa.tgz", "ff232efdef6bdd46037098dfede1f652aec53dd6042463170144bb929af722f9", TOOLS),
        ("stb-vorbis", "0.0.6", "vorbis.tgz", "c9b539e71303f17bfb2fbcfd546fa905d1e25b045a3bd15454e6caf072f52659", TOOLS / "package" / "node_modules" / "stb-vorbis"),
    ]
    for name, version, archive, sha, target in deps:
        fetch_checked(f"https://registry.npmjs.org/{name}/-/{name}-{version}.tgz", TOOLS / archive, sha)
        target.mkdir(parents=True, exist_ok=True)
        with tarfile.open(TOOLS / archive) as tar:
            for item in tar.getmembers():
                if name == "stb-vorbis":
                    item.name = item.name.removeprefix("package/")
                if item.name:
                    tar.extract(item, target, filter="data")
    (TOOLS / "render.mjs").write_text(SCORE_RENDERER, encoding="utf-8")
    subprocess.run(["node", str(TOOLS / "render.mjs"), str(OUT)], check=True)

SCORE_RENDERER = r'''
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SoundBankLoader, SpessaSynthProcessor, SpessaLog } from './package/dist/index.js';
const tools = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const sfBytes = await fs.readFile(path.join(tools, 'GeneralUser-GS.sf2'));
SpessaLog.setLogLevel(false, false, false);
const RATE = 24000, BARS = 24, BEATS = BARS * 4;
const families = [
  { title: 'Salt Beneath the Glass', bpm: 76, root: 50, lead: 42, secondary: 71, colour: 0 },
  { title: 'The Iron Orchard', bpm: 96, root: 52, lead: 42, secondary: 12, colour: 11 },
  { title: 'No Name for the Night', bpm: 108, root: 48, lead: 41, secondary: 70, colour: 60 },
];
// Original eight-bar question/answer, with a chromatic neighbour before the fifth.
// Entries are [semitones from tonic, onset in beats, duration in beats].
const theme = [
  [[0,0,1.45],[7,1.5,.45],[1,2,.8],[3,3,.8]],
  [[5,0,1.85],[3,2,.7],[0,3,.75]],
  [[-2,0,1.4],[3,1.5,.45],[7,2,.75],[5,3,.8]],
  [[4,0,1.8],[1,2,.4],[-1,2.5,1.1]],
  [[12,.5,1.4],[10,2,.75],[7,3,.7]],
  [[8,0,1.1],[7,1.5,.4],[5,2,.8],[3,3,.8]],
  [[2,0,.8],[5,1,.8],[3,2,.7],[1,3,.4]],
  [[-1,0,1.1],[7,1.5,.4],[0,2,1.65]],
];
const harmony = [[0,3,7],[-4,0,3],[-7,-4,0],[-5,-1,2],[0,3,7],[-4,0,3],[-7,-4,0],[-5,-1,2]];
const report = [];

function compose(family, combat) {
  const ev = [];
  const note = (beat,ch,key,length,velocity) => {
    ev.push({ beat: Math.max(0,beat), ch, key, velocity, on:true });
    ev.push({ beat: Math.max(0,beat)+length, ch, key, on:false });
  };
  for (let bar=0;bar<BARS;bar++) {
    const phrase = Math.floor(bar/8), chord=harmony[bar%8], root=family.root;
    if (!combat) {
      // Phrase I speaks, II answers in another register, III overlaps both.
      for (const [interval, onset, duration] of theme[bar%8]) {
        const octave=phrase===1 && bar%2===0?12:0;
        note(bar*4+onset+.015*Math.sin(bar*2+interval), phrase===1?1:0, root+interval+octave, duration, 58+phrase*7+(bar%3)*3);
        if (phrase===2 && onset===0) note(bar*4+2.1,1,root+interval-12,1.2,43);
      }
      for (let k=0;k<3;k++) note(bar*4+.06*k,2,root+chord[k]+(k===0?-12:0),3.65,36+phrase*6);
      note(bar*4+.03,3,root+chord[0]-12,3.2,53+phrase*4);
      const accents=phrase===0?[.5,2.5]:[.5,1.5,2.5,3.25];
      for (const [i,beat] of accents.entries()) note(bar*4+beat,4,root+chord[(i+bar)%3]+12,phrase===0?.7:.36,39+(i%2)*8);
      if (family.bpm>=96 || phrase>=1) {
        const pulse=family.bpm>=96?8:4;
        for(let step=0;step<pulse;step++) note(bar*4+step*4/pulse+.01,5,root+chord[step%3],.22,37+(step%3===0?15:0));
      }
      // Sparse timpani anchors harmonic changes instead of a constant drone.
      if(bar%4===0) note(bar*4,6,root-12,.75,43+phrase*6);
    } else {
      for(let step=0;step<8;step++) {
        const offset=step*.5 + (step%2?.027:0);
        note(bar*4+offset,5,root+chord[step%3]-12,.21,60+(step%3===0?15:0));
        if(step===0||step===3||step===6) note(bar*4+offset,6,root+chord[0]-12,.36,66+phrase*6);
      }
      const pattern=family.bpm===76?[0,1.5,2,3.5]:family.bpm===96?[0,.75,2,2.75,3.5]:[0,1,1.75,2.5,3.25];
      for(const beat of pattern) note(bar*4+beat,9,beat===0||beat===2?36:41,.16,beat===0?86:65);
      // Rim/metal accents avoid a modern pop snare and overpowering cymbals.
      if(bar%2===1) note(bar*4+3,9,37,.13,49);
      if(bar%4===3) {
        note(bar*4+3.5,9,43,.15,58);
        note(bar*4+3.75,9,47,.12,51);
      }
      if(phrase>=1) for(const beat of [.75,2.75]) note(bar*4+beat,2,root+chord[1]+12,.28,45);
    }
  }
  return ev.sort((a,b)=>a.beat-b.beat || Number(a.on)-Number(b.on));
}

async function render(family, index, combat) {
  // The engine owns/destructs its bank; each render needs independent sample storage.
  const bank=SoundBankLoader.fromArrayBuffer(sfBytes.buffer.slice(sfBytes.byteOffset,sfBytes.byteOffset+sfBytes.byteLength));
  const synth=new SpessaSynthProcessor(RATE,{eventsEnabled:false});
  synth.soundBankManager.addSoundBank(bank,'main');
  await synth.processorInitialized;
  synth.setSystemParameter('autoAllocateVoices',true);
  const presets=[family.lead,family.secondary,48,43,family.colour,45,47];
  for(let ch=0;ch<presets.length;ch++) {
    synth.programChange(ch,presets[ch]);
    synth.controllerChange(ch,7,[91,78,62,77,61,69,63][ch]);
    synth.controllerChange(ch,10,[56,80,45,64,88,36,64][ch]);
    synth.controllerChange(ch,91,[34,40,44,20,35,22,28][ch]);
    synth.controllerChange(ch,93,0);
  }
  synth.controllerChange(9,7,78); synth.controllerChange(9,91,15);
  const ev=compose(family,combat), beat=60/family.bpm;
  const count=Math.round(BEATS*beat*RATE), left=new Float32Array(count*3),right=new Float32Array(count*3);
  const timeline=[];
  // The middle pass contains the previous pass's real sample release/reverb tails.
  for(let cycle=0;cycle<3;cycle++) for(const e of ev) timeline.push({...e,frame:Math.round((e.beat+BEATS*cycle)*beat*RATE)});
  timeline.sort((a,b)=>a.frame-b.frame||Number(a.on)-Number(b.on));
  let at=0, eventIndex=0;
  while(at<left.length) {
    while(eventIndex<timeline.length&&timeline[eventIndex].frame<=at) {
      const e=timeline[eventIndex++];
      if(e.on)synth.noteOn(e.ch,e.key,e.velocity); else synth.noteOff(e.ch,e.key);
    }
    const next=timeline[eventIndex]?.frame??left.length;
    const size=Math.min(128,left.length-at,Math.max(1,next-at));
    synth.process(left,right,at,size); at+=size;
  }
  synth.destroySynthProcessor();
  const L=left.slice(count,count*2),R=right.slice(count,count*2);
  let peak=0,energy=0;
  for(let i=0;i<count;i++){peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));energy+=L[i]**2+R[i]**2;}
  const rawRms=Math.sqrt(energy/(count*2));
  if(rawRms<.001||peak<.005)throw new Error('Silent score render: '+family.title);
  const gain=Math.min((combat?.12:.13)/Math.max(.001,rawRms),.62/Math.max(.001,peak));
  for(let i=0;i<count;i++){L[i]*=gain;R[i]*=gain;}
  // Repair only the final 8 ms to its natural continuation, avoiding a hard seam.
  const edge=Math.round(.008*RATE);
  for(const channel of [L,R])for(let j=0;j<edge;j++){
    const t=(j+1)/edge;
    channel[count-edge+j]=channel[count-edge+j]*(1-t)+channel[0]*t;
  }
  const name=`${combat?'combat':'score'}-${index+1}`;
  const wav=Buffer.alloc(44+count*4);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*4,40);
  let finalPeak=0,finalEnergy=0;
  for(let i=0;i<count;i++)for(const [c,ch] of [L,R].entries()){
    finalPeak=Math.max(finalPeak,Math.abs(ch[i]));finalEnergy+=ch[i]**2;
    wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,ch[i]))*32767),44+i*4+c*2);
  }
  await fs.writeFile(path.join(out,name+'.wav'),wav);
  report.push({name,title:family.title,bpm:family.bpm,bars:BARS,seconds:count/RATE,notes:ev.length/2,sampleRate:RATE,channels:2,peak:finalPeak,rms:Math.sqrt(finalEnergy/(count*2)),seamJump:Math.max(Math.abs(L[0]-L.at(-1)),Math.abs(R[0]-R.at(-1)))});
  console.log(`${name}: ${family.title}, ${report.at(-1).seconds.toFixed(1)}s, ${ev.length/2} notes, peak ${finalPeak.toFixed(3)}`);
}
for(let index=0;index<families.length;index++){
  await render(families[index],index,false);
  await render(families[index],index,true);
}
await fs.writeFile(path.join(out,'score-manifest.json'),JSON.stringify({version:1,renderer:'SpessaSynth 4.3.22',instrumentBank:'GeneralUser GS 2.0.3',source:'https://github.com/mrbumpy409/GeneralUser-GS',arrangement:'Original 24-bar question, answer, and development; no borrowed melodies.',tracks:report},null,2)+'\n');
'''

def save(name, sound):
    sound = np.asarray(sound, dtype=np.float64)
    sound = np.tanh(sound * 1.15) / 1.15  # soft peaks, no normalization surprises
    assert np.max(np.abs(sound)) < .9, name
    pcm = np.asarray(sound * 32767, dtype="<i2")
    with wave.open(str(OUT / f"{name}.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(pcm.tobytes())

def low_noise(rng, n, smooth):
    # Avoid a convolution the length of a whole chapter.
    points = rng.normal(size=n // smooth + 3)
    return np.interp(np.arange(n) / smooth, np.arange(len(points)), points)

def loop_noise(rng, n, smooth):
    """Cyclic low-frequency noise, with identical shape on both sides of the seam."""
    count = n // smooth
    points = rng.normal(size=count)
    phase = np.arange(n) * count / n
    return np.interp(phase, np.arange(count + 1), np.r_[points, points[0]])

def bell(t, f, decay=1.0):
    """An inharmonic metal partial set, closer to a great bell than a pitched chime."""
    env = (1 - np.exp(-t * 95)) * np.exp(-t * decay)
    return env * (
        .62 * np.sin(2 * np.pi * f * t)
        + .24 * np.sin(2 * np.pi * f * 2.024 * t)
        + .12 * np.sin(2 * np.pi * f * 2.73 * t)
        + .055 * np.sin(2 * np.pi * f * 4.17 * t)
    )

def add_event(track, at, event):
    start = int(at * SR)
    end = min(start + len(event), len(track))
    if end > start:
        track[start:end] += event[:end - start]

def chapter_sound(index):
    duration = 40
    n = duration * SR
    t = np.arange(n) / SR
    rng = np.random.default_rng(35100 + index)
    # Integer-cycle drones make the loop periodic. Every environment has different weight.
    fundamentals = [43, 49, 36, 55, 41, 52, 39, 46, 34, 31]
    f = fundamentals[index]
    breath = .69 + .31 * np.sin(2 * np.pi * (3 + index % 3) * t / duration)
    drone = (.070 * np.sin(2 * np.pi * f * t + .14 * np.sin(2 * np.pi * t / duration))
             + .029 * np.sin(2 * np.pi * 2 * f * t + .07 * np.sin(4 * np.pi * t / duration)))
    track = drone * breath
    # Long, low-passed air and stone texture. A circular blend removes the random seam.
    air = loop_noise(rng, n, 410 + index * 25)
    air -= np.mean(air)
    track += air * [.018, .027, .030, .021, .035, .014, .027, .021, .042, .024][index]
    # Individual distant events; no rhythmic melody or repeated pickup motif.
    placements = [(9, 29), (12, 31), (16,), (7, 28), (13,), (19,), (8, 27), (18,), (11, 32), (6, 25)][index]
    for k, at in enumerate(placements):
        length = 7 * SR
        bt = np.arange(length) / SR
        frequency = [57, 65, 47, 71, 54, 61, 49, 58, 40, 36][index] * (1.006 if k else 1)
        add_event(track, at, .065 * bell(bt, frequency, .53))
    if index in (1, 4, 6, 9):
        # Slow masonry groan. The low wavering mass is a hazard cue, not a percussion loop.
        for at in (22,):
            gt = np.arange(6 * SR) / SR
            groan = (.038 * np.sin(2 * np.pi * (28 * gt + 1.5 * gt * gt))
                     + .014 * low_noise(rng, len(gt), 120)) * np.sin(np.pi * gt / 6) ** 2
            add_event(track, at, groan)
    save(f"chapter-{index + 1:02}", track)

def make_fx(name, seconds, seed):
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * SR)) / SR
    noise = low_noise(rng, len(t), 5)
    deep = low_noise(rng, len(t), 42)
    fall = np.exp(-t * 7)
    if name == "jump":
        sound = .09 * deep * np.exp(-t * 17) + .055 * np.sin(2 * np.pi * (82 * t + 30 * t * t)) * fall
    elif name == "dash":
        sound = .13 * deep * np.exp(-t * 8) + .047 * noise * np.exp(-t * 11)
    elif name == "page":
        sound = .11 * noise * np.exp(-t * 15)
    elif name in ("pickup", "secret"):
        sound = .09 * bell(t, 90 if name == "secret" else 110, 3.0) + .025 * deep * fall
    elif name == "checkpoint":
        sound = .12 * bell(t, 69, 1.9) + .035 * bell(t, 103, 2.9)
    elif name == "complete":
        sound = .21 * bell(t, 58, .65) + .07 * bell(t, 76, 1.1)
    elif name == "death":
        sound = .19 * np.sin(2 * np.pi * (72 * t - 16 * t * t)) * np.exp(-t * 3) + .06 * deep * fall
    elif name == "attack":
        # A blade's air envelope: no hit sound unless a strike connects.
        env = (1-np.exp(-t*100))*np.exp(-t*16)
        sound = .18 * noise * env + .05 * deep * env
    elif name in ("stagger", "boss_hit", "enemy_hit"):
        sound = .19 * noise * np.exp(-t * 27) + .16 * deep * np.exp(-t*13) + .085 * bell(t, 430 if name == "enemy_hit" else 210, 11)
    elif name == "parry":
        sound = .20 * bell(t, 780, 7) + .075 * noise * np.exp(-t*32) + .08 * bell(t, 1220, 11)
    elif name == "enemy_defeated":
        sound = .13 * deep * np.exp(-t*7) + .08 * noise * np.exp(-t*14) + .09 * bell(t, 62, 4)
    elif name == "heal":
        sound = .10 * bell(t, 166, 2.2) + .04 * bell(t, 248, 3) + .018 * deep * np.exp(-t*4)
    elif name in ("boss_defeated", "relic"):
        sound = .10 * bell(t, 42, 1.5) + .055 * deep * np.exp(-t * 3)
    else:
        raise ValueError(name)
    # Prevent the abrupt edge that makes frequent cues click.
    edge = min(90, len(sound) // 4)
    sound[:edge] *= np.linspace(0, 1, edge)
    sound[-edge:] *= np.linspace(1, 0, edge)
    save(name, sound)

for chapter in range(10):
    chapter_sound(chapter)

fx = {"jump": .28, "dash": .46, "page": .28,
      "pickup": .8, "secret": 1.6, "checkpoint": 1.5,
      "complete": 4.2, "death": 1.15,
      "attack": .48, "stagger": .48, "boss_hit": .48,
      "boss_defeated": 1.5, "relic": 1.5,
      "parry": .65, "enemy_hit": .42, "enemy_defeated": .9, "heal": 1.2}
for k, (name, seconds) in enumerate(fx.items()):
    make_fx(name, seconds, 7700 + k)
render_score()
print(f"Wrote 3 composed scores, 3 aligned combat stems, 10 environment beds, and {len(fx)} effects to {OUT}")
