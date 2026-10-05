import type { InputFrame } from './types';

export type TouchAction = 'left' | 'right' | 'jump' | 'dash' | 'attack';

/** Poll once per simulation frame. Edge fields are true only on the first sample after a press. */
export class InputController {
  device = 'keyboard';
  private keys = new Set<string>();
  private touches: Record<TouchAction, boolean> = { left: false, right: false, jump: false, dash: false, attack:false };
  private touchMove = 0;
  private pointers = new Map<number, 'jump' | 'dash'>();
  private previous = { jump: false, dash: false, pause: false, confirm: false, attack:false };
  private queued = { jump: false, dash: false, pause: false, confirm: false, attack:false };
  private activePad = -1;
  private canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
    window.addEventListener('gamepaddisconnected', this.onPadDisconnected);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('lostpointercapture', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isInteractiveTarget(e.target) && !['Escape', 'KeyP'].includes(e.code)) return;
    if (this.isGameKey(e.code)) {
      e.preventDefault();
      if (!this.keys.has(e.code)) {
        if (['Space','ArrowUp','KeyW','KeyZ'].includes(e.code)) this.queued.jump = true;
        if (['ShiftLeft','ShiftRight','KeyX'].includes(e.code)) this.queued.dash = true;
        if (['Escape','KeyP'].includes(e.code)) this.queued.pause = true;
        if (e.code === 'Enter') this.queued.confirm = true;
        if (e.code === 'KeyJ') this.queued.attack = true;
      }
      this.keys.add(e.code); this.device = 'keyboard';
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (this.isGameKey(e.code)) {
      this.keys.delete(e.code);
      if (!this.isInteractiveTarget(e.target)) e.preventDefault();
    }
  };
  private isInteractiveTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    return !!element.closest?.('button, input, select, textarea, [contenteditable="true"]');
  }
  private isGameKey(code: string) {
    return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyZ', 'Space', 'ShiftLeft', 'ShiftRight',
      'KeyX', 'KeyJ', 'Escape', 'KeyP', 'Enter'].includes(code);
  }
  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    const action = e.button === 2 ? 'dash' : 'jump';
    this.queued[action] = true;
    this.pointers.set(e.pointerId, action);
    this.device = e.pointerType === 'touch' ? 'touch' : 'mouse';
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* harmless in test DOM */ }
  };
  private onPointerUp = (e: PointerEvent) => { this.pointers.delete(e.pointerId); };
  private onContextMenu = (e: Event) => e.preventDefault();
  private onPadDisconnected = (e: GamepadEvent) => {
    if (e.gamepad.index === this.activePad) { this.activePad = -1; this.previous = { jump: false, dash: false, pause: false, confirm: false, attack:false }; }
  };

  setTouch(action: TouchAction, down: boolean) {
    if (down && !this.touches[action] && (action === 'jump' || action === 'dash' || action === 'attack')) this.queued[action] = true;
    this.touches[action] = !!down;
    if (down) this.device = 'touch';
  }

  setMove(value: number) { this.touchMove=Math.max(-1,Math.min(1,value)); if(this.touchMove)this.device='touch'; }

  sample(): InputFrame {
    const pad = this.getPad();
    const button = (i: number) => !!pad?.buttons[i]?.pressed;
    const axis = pad && Math.abs(pad.axes[0] ?? 0) > .22 ? pad.axes[0] : 0;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this.touches.left || button(14);
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD') || this.touches.right || button(15);
    const digital = Number(right) - Number(left);
    const move = digital || this.touchMove || axis;
    const jump = this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('KeyZ') ||
      this.touches.jump || [...this.pointers.values()].includes('jump') || button(0);
    const dash = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyX') ||
      this.touches.dash || [...this.pointers.values()].includes('dash') || button(1) || button(2);
    const pause = this.keys.has('Escape') || this.keys.has('KeyP') || button(9);
    const attack = this.keys.has('KeyJ') || this.touches.attack || button(7) || button(3);
    const confirm = this.keys.has('Enter') || button(0);
    const verticalAxis = pad && Math.abs(pad.axes[1] ?? 0) > .35 ? pad.axes[1] : 0;
    const nav = Number(this.keys.has('ArrowDown') || button(13)) - Number(this.keys.has('ArrowUp') || button(12)) || verticalAxis;
    if (pad && (Math.abs(axis) > .22 || Math.abs(nav) > .35 || button(0) || button(1) || button(2) || button(9) || attack && (button(7)||button(3)))) this.device = 'controller';
    const frame: InputFrame = {
      move: Math.max(-1, Math.min(1, move)), nav: Math.max(-1, Math.min(1, nav)), jump,
      jumpPressed: this.queued.jump || jump && !this.previous.jump,
      dashPressed: this.queued.dash || dash && !this.previous.dash,
      pausePressed: this.queued.pause || pause && !this.previous.pause,
      confirmPressed: this.queued.confirm || confirm && !this.previous.confirm,
      attackPressed: this.queued.attack || attack && !this.previous.attack,
    };
    this.previous = { jump, dash, pause, confirm, attack };
    this.queued = { jump: false, dash: false, pause: false, confirm: false, attack:false };
    return frame;
  }

  private getPad(): Gamepad | null {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const selected = this.activePad >= 0 ? pads[this.activePad] : null;
    const pad = (selected?.connected ? selected : null) || Array.from(pads).find(p => p?.connected) || null;
    this.activePad = pad?.index ?? -1;
    return pad;
  }

  reset = () => {
    this.keys.clear(); this.pointers.clear();
    this.queued = { jump: false, dash: false, pause: false, confirm: false, attack:false };
    this.touchMove = 0;
    this.touches = { left: false, right: false, jump: false, dash: false, attack:false };
    // Seed edges from a held controller button so resetting a menu cannot
    // repeatedly press Start or A before the player releases it.
    const pad = this.getPad();
    const pressed = (i: number) => !!pad?.buttons[i]?.pressed;
    this.previous = { jump: pressed(0), dash: pressed(1) || pressed(2), pause: pressed(9), confirm: pressed(0), attack:pressed(7)||pressed(3) };
  };

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
    window.removeEventListener('gamepaddisconnected', this.onPadDisconnected);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.reset();
  }
}
