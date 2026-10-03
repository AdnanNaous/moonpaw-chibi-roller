"""Original deterministic PCM soundtrack and Foley; no external samples."""
from pathlib import Path
import wave
import numpy as np
SR=22050
ROOT=Path(__file__).resolve().parents[1]/'public'/'audio'
ROOT.mkdir(parents=True,exist_ok=True)
def export(name,samples):
    peak=max(.5,float(np.max(np.abs(samples))))
    data=np.asarray(np.clip(samples/peak*.75,-1,1)*32767,dtype='<i2')
    with wave.open(str(ROOT/name),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(data.tobytes())
motifs=[[0,7,3,10,7,2,3,0],[0,6,3,7,6,0,-5,3],[0,7,10,3,2,7,6,0],[0,12,7,3,10,7,2,0],[0,1,7,6,3,10,1,0],[0,3,7,2,1,7,3,-5],[0,6,12,3,6,7,-5,0],[0,7,1,10,3,1,7,0],[0,12,10,7,3,2,7,0],[0,3,7,12,10,7,3,0]]
for chapter,motif in enumerate(motifs):
    rng=np.random.default_rng(351+chapter);length=24;count=SR*length;t=np.arange(count)/SR
    root=[98,82.4,73.4,110,65.4,92.5,77.8,69.3,103.8,87.3][chapter];f=round(root*length)/length
    track=.065*np.sin(2*np.pi*f/2*t)*(.7+.3*np.sin(2*np.pi*t/length))
    track+=.022*np.sin(2*np.pi*f*t+.06*np.sin(2*np.pi*t/6))
    air=np.convolve(rng.normal(0,1,count),np.ones(45)/45,mode='same')
    track+=air*(.075 if chapter in [2,7] else .028)
    for beat,semitone in enumerate(motif):
        start=int(beat*3*SR);nt=np.arange(min(4*SR,count-start))/SR;freq=root*2**(semitone/12)
        env=np.minimum(1,nt/.013)*np.exp(-nt*(1.2 if chapter in [1,6] else .85))
        bell=sum(np.sin(2*np.pi*freq*ratio*nt)*gain*np.exp(-nt*decay) for ratio,gain,decay in [(1,.1,.3),(2.002,.043,.6),(3.98,.017,1.4),(6.2,.009,2.3)])
        track[start:start+len(nt)]+=bell*env
    if chapter in [1,4,6,9]:track+=np.exp(-((t%1.5)/.15))*np.sin(2*np.pi*49*t)*.07
    track+=np.roll(track,int(.28*SR))*.22+np.roll(track,int(.69*SR))*.13
    seam=int(.02*SR);track[:seam]*=np.linspace(0,1,seam);track[-seam:]*=np.linspace(1,0,seam)
    export(f'chapter-{chapter+1:02}.wav',track)
rng=np.random.default_rng(351)
for name,duration in [('jump',.35),('dash',.46),('pickup',.75),('checkpoint',1.1),('death',.9),('complete',2.8),('step',.13),('secret',1.8),('page',.2)]:
    t=np.arange(int(SR*duration))/SR;noise=rng.normal(0,1,len(t));samples=np.zeros_like(t)
    if name in ['dash','page','step']:
        samples=np.convolve(noise,np.ones(8)/8,mode='same')*np.exp(-t*(16 if name=='step' else 8))*.5
        if name=='dash':samples+=np.sin(2*np.pi*(130*t+160*t*t))*np.exp(-t*8)*.12
    elif name=='death':samples=(np.sin(2*np.pi*(110*t-30*t*t))+.2*noise)*np.exp(-t*6)*.3
    elif name=='jump':samples=np.sin(2*np.pi*(260*t+270*t*t))*np.exp(-t*12)*.25
    else:
        notes={'pickup':[784,988],'checkpoint':[196,294,392],'complete':[196,233,294,392,466],'secret':[174.6,261.6,349.2]}[name]
        for i,f in enumerate(notes):
            nt=t-i*.12;mask=nt>=0;attack=np.minimum(1,np.maximum(0,nt)/.01)
            samples+=mask*np.sin(2*np.pi*f*nt)*np.exp(-np.maximum(0,nt)*3)*attack*.17
            samples+=mask*np.sin(2*np.pi*f*2.006*nt)*np.exp(-np.maximum(0,nt)*5)*attack*.045
    export(name+'.wav',samples)
print('Composed 10 original soundtrack loops and 9 sound effects.')
