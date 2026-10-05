import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputController } from '../src/input';
import {joystickAxis} from '../src/touch';

class FakeElement extends EventTarget {
  setPointerCapture() { /* no-op */ }
}
const fireKey = (target: EventTarget, type: string, code: string, actualTarget?: object) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  if (actualTarget) Object.defineProperty(event, 'target', { value: actualTarget });
  target.dispatchEvent(event);
  return event;
};

describe('InputController', () => {
  let fakeWindow: EventTarget;
  let canvas: FakeElement;
  let input: InputController;
  beforeEach(() => {
    fakeWindow = new EventTarget(); canvas = new FakeElement();
    vi.stubGlobal('window', fakeWindow);
    vi.stubGlobal('navigator', { getGamepads: () => [] });
    input = new InputController(canvas as unknown as HTMLElement);
  });
  afterEach(() => { input.dispose(); vi.unstubAllGlobals(); });

  it('preserves fast strike taps and movement after jump release',()=>{
    fireKey(fakeWindow,'keydown','KeyJ');fireKey(fakeWindow,'keyup','KeyJ');
    input.setMove(.63);input.setTouch('jump',true);
    expect(input.sample()).toMatchObject({move:.63,jump:true,attackPressed:true});
    input.setTouch('jump',false);expect(input.sample()).toMatchObject({move:.63,jump:false,attackPressed:false});
    input.setMove(2);expect(input.sample().move).toBe(1);input.reset();expect(input.sample().move).toBe(0);
  });
  it('gives the stick a dead zone and full speed before its edge',()=>{
    expect(joystickAxis(3,42)).toBe(0);expect(joystickAxis(30,42)).toBe(1);expect(joystickAxis(-30,42)).toBe(-1);
  });
  it('maps RT strike and seeds held edges across menu resets',()=>{
    const pad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
    vi.stubGlobal('navigator',{getGamepads:()=>[pad]});pad.buttons[7].pressed=true;
    expect(input.sample().attackPressed).toBe(true);input.reset();expect(input.sample().attackPressed).toBe(false);
    pad.buttons[7].pressed=false;input.sample();pad.buttons[7].pressed=true;expect(input.sample().attackPressed).toBe(true);
  });
  it('maps keys and emits press edges once', () => {
    fireKey(fakeWindow, 'keydown', 'KeyD');
    fireKey(fakeWindow, 'keydown', 'Space');
    expect(input.sample()).toMatchObject({ move: 1, jump: true, jumpPressed: true });
    expect(input.sample().jumpPressed).toBe(false);
    fireKey(fakeWindow, 'keyup', 'Space'); input.sample();
    fireKey(fakeWindow, 'keydown', 'Space');
    expect(input.sample().jumpPressed).toBe(true);
  });

  it('preserves quick key and touch taps between rendered frames without repeating', () => {
    for (const code of ['Space', 'ShiftLeft', 'Escape', 'Enter']) {
      fireKey(fakeWindow, 'keydown', code); fireKey(fakeWindow, 'keyup', code);
    }
    expect(input.sample()).toMatchObject({jump:false,jumpPressed:true,dashPressed:true,pausePressed:true,confirmPressed:true});
    expect(input.sample()).toMatchObject({jumpPressed:false,dashPressed:false,pausePressed:false,confirmPressed:false});
    input.setTouch('jump',true);input.setTouch('jump',false);
    expect(input.sample().jumpPressed).toBe(true);
    expect(input.sample().jumpPressed).toBe(false);
  });

  it('supports Z jump and leaves native button and input keys alone', () => {
    fireKey(fakeWindow, 'keydown', 'KeyZ');
    expect(input.sample().jumpPressed).toBe(true);
    fireKey(fakeWindow, 'keyup', 'KeyZ'); input.sample();
    const button = { closest: () => ({ tagName: 'BUTTON' }) };
    const key = fireKey(fakeWindow, 'keydown', 'Space', button);
    expect(key.defaultPrevented).toBe(false);
    expect(input.sample().jump).toBe(false);
    const field = { closest: () => ({ tagName: 'INPUT' }) };
    fireKey(fakeWindow, 'keydown', 'ArrowLeft', field);
    expect(input.sample().move).toBe(0);
  });

  it('clears held controls on blur and handles touch presses', () => {
    input.setTouch('left', true); input.setTouch('dash', true);
    expect(input.sample()).toMatchObject({ move: -1, dashPressed: true });
    expect(input.sample().dashPressed).toBe(false);
    fakeWindow.dispatchEvent(new Event('blur'));
    expect(input.sample()).toMatchObject({ move: 0, dashPressed: false });
  });

  it('uses gamepad axes, buttons and clears disconnected pad state', () => {
    const pad = { index: 0, connected: true, axes: [-.75], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
    pad.buttons[0].pressed = true;
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    expect(input.sample()).toMatchObject({ move: -.75, jumpPressed: true });
    expect(input.device).toBe('controller');
    pad.connected = false;
    vi.stubGlobal('navigator', { getGamepads: () => [null] });
    const event = new Event('gamepaddisconnected');
    Object.defineProperty(event, 'gamepad', { value: pad });
    fakeWindow.dispatchEvent(event);
    expect(input.sample()).toMatchObject({ move: 0, jump: false });
  });

  it('seeds held gamepad edges on reset and exposes vertical menu navigation', () => {
    const pad = { index: 0, connected: true, axes: [0, .8], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
    pad.buttons[0].pressed = true;
    pad.buttons[9].pressed = true;
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    input.reset();
    expect(input.sample()).toMatchObject({ nav: .8, jumpPressed: false, pausePressed: false, confirmPressed: false });
    pad.buttons[0].pressed = false; pad.buttons[9].pressed = false;
    input.sample();
    pad.buttons[0].pressed = true; pad.buttons[9].pressed = true;
    expect(input.sample()).toMatchObject({ jumpPressed: true, pausePressed: true, confirmPressed: true });
  });
});
