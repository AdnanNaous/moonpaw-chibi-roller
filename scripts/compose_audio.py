"""Synthesize the game's original, sparse sound world. No external samples."""
from pathlib import Path
import wave
import numpy as np

SR = 22050
OUT = Path(__file__).resolve().parents[1] / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

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
    elif name in ("attack", "stagger", "boss_hit"):
        sound = .18 * noise * np.exp(-t * 19) + .13 * np.sin(2 * np.pi * (120 * t - 45 * t * t)) * fall
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
      "boss_defeated": 1.5, "relic": 1.5}
for k, (name, seconds) in enumerate(fx.items()):
    make_fx(name, seconds, 7700 + k)
print(f"Wrote 10 original 40-second beds and {len(fx)} effects to {OUT}")
