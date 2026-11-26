import { useGameStore } from '../../store/gameStore';

export type VirtualAbilityKey = 'telekinesis' | 'pulse' | 'ward' | 'leap';

export interface InputSnapshot {
  moveX: number; // -1 (left) to +1 (right)
  moveZ: number; // -1 (forward) to +1 (backward)
  aimNdcX: number;
  aimNdcY: number;
  telekinesisPressed: boolean;
  pulsePressed: boolean;
  wardPressed: boolean;
  leapPressed: boolean;
  primaryFirePressed: boolean;
}

export class InputController {
  private keys = new Set<string>();
  private virtualStick = { x: 0, z: 0 };
  private virtualAbilities: Record<VirtualAbilityKey, boolean> = {
    telekinesis: false,
    pulse: false,
    ward: false,
    leap: false,
  };

  private snapshot: InputSnapshot = {
    moveX: 0,
    moveZ: 0,
    aimNdcX: 0,
    aimNdcY: 0,
    telekinesisPressed: false,
    pulsePressed: false,
    wardPressed: false,
    leapPressed: false,
    primaryFirePressed: false,
  };

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown, { passive: true });
    window.addEventListener('keyup', this.handleKeyUp, { passive: true });
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp, { passive: true });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const wasDown = this.keys.has(event.code);
    this.keys.add(event.code);

    if (event.code === 'KeyR' && !wasDown && !event.repeat) {
      useGameStore.getState().toggleDimension();
    }
    if (event.code === 'Escape' && !wasDown && !event.repeat) {
      useGameStore.getState().togglePaused();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private handleBlur = () => {
    this.keys.clear();
    this.virtualStick.x = 0;
    this.virtualStick.z = 0;
    this.virtualAbilities.telekinesis = false;
    this.virtualAbilities.pulse = false;
    this.virtualAbilities.ward = false;
    this.virtualAbilities.leap = false;
    this.snapshot.primaryFirePressed = false;
  };

  private handlePointerMove = (event: PointerEvent) => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.snapshot.aimNdcX = (event.clientX / width) * 2 - 1;
    this.snapshot.aimNdcY = -((event.clientY / height) * 2 - 1);
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button === 0) {
      this.snapshot.primaryFirePressed = true;
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (event.button === 0) {
      this.snapshot.primaryFirePressed = false;
    }
  };

  public setVirtualStick(x: number, z: number): void {
    const clampedX = Math.max(-1, Math.min(1, x));
    const clampedZ = Math.max(-1, Math.min(1, z));
    const len = Math.hypot(clampedX, clampedZ);
    if (len > 1) {
      this.virtualStick.x = clampedX / len;
      this.virtualStick.z = clampedZ / len;
    } else {
      this.virtualStick.x = clampedX;
      this.virtualStick.z = clampedZ;
    }
  }

  public setVirtualAbility(ability: VirtualAbilityKey, pressed: boolean): void {
    this.virtualAbilities[ability] = pressed;
  }

  public read(): Readonly<InputSnapshot> {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0;
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0;
    const forward = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0;
    const back = this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0;

    let mx = right - left + this.virtualStick.x;
    let mz = back - forward + this.virtualStick.z;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }

    this.snapshot.moveX = mx;
    this.snapshot.moveZ = mz;
    this.snapshot.telekinesisPressed =
      this.keys.has('KeyQ') || this.virtualAbilities.telekinesis;
    this.snapshot.pulsePressed =
      this.keys.has('KeyE') || this.virtualAbilities.pulse;
    this.snapshot.wardPressed =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.virtualAbilities.ward;
    this.snapshot.leapPressed =
      this.keys.has('Space') || this.virtualAbilities.leap;

    return this.snapshot;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.keys.clear();
  }
}
