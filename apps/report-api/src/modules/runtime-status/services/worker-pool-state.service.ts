import { Injectable } from '@nestjs/common';

import type { WorkerPoolScalingState } from '@report-platform/contracts';

export type WorkerPoolRuntimeState = {
  targetWorkers: number;
  actualWorkers: number;
  scalingState: WorkerPoolScalingState;
  lastScaleAt: string | null;
  cooldownUntilMs: number | null;
};

@Injectable()
export class WorkerPoolStateService {
  private state: WorkerPoolRuntimeState = {
    targetWorkers: 1,
    actualWorkers: 1,
    scalingState: 'stable',
    lastScaleAt: null,
    cooldownUntilMs: null,
  };

  getSnapshot(nowMs: number): WorkerPoolRuntimeState {
    const cooldownActive =
      this.state.cooldownUntilMs !== null && this.state.cooldownUntilMs > nowMs;

    if (!cooldownActive && this.state.scalingState === 'cooldown') {
      this.state = {
        ...this.state,
        scalingState:
          this.state.actualWorkers === this.state.targetWorkers
            ? 'stable'
            : this.state.scalingState,
        cooldownUntilMs: null,
      };
    }

    return { ...this.state };
  }

  initialize(params: { minWorkers: number }): void {
    const minWorkers = Math.max(1, params.minWorkers);

    this.state = {
      targetWorkers: minWorkers,
      actualWorkers: minWorkers,
      scalingState: 'stable',
      lastScaleAt: null,
      cooldownUntilMs: null,
    };
  }

  applyScaleDecision(params: {
    nextTargetWorkers: number;
    nowMs: number;
    cooldownMs: number;
  }): void {
    const nextTarget = Math.max(1, params.nextTargetWorkers);

    if (nextTarget === this.state.targetWorkers) {
      return;
    }

    const nextScalingState: WorkerPoolScalingState =
      nextTarget > this.state.targetWorkers ? 'scaling_up' : 'scaling_down';

    this.state = {
      ...this.state,
      targetWorkers: nextTarget,
      scalingState: nextScalingState,
      lastScaleAt: new Date(params.nowMs).toISOString(),
      cooldownUntilMs: params.nowMs + Math.max(0, params.cooldownMs),
    };
  }

  reconcileActualWorkers(): void {
    if (this.state.actualWorkers < this.state.targetWorkers) {
      this.state = {
        ...this.state,
        actualWorkers: this.state.actualWorkers + 1,
      };
      return;
    }

    if (this.state.actualWorkers > this.state.targetWorkers) {
      this.state = {
        ...this.state,
        actualWorkers: this.state.actualWorkers - 1,
      };
      return;
    }

    if (this.state.scalingState === 'scaling_up' || this.state.scalingState === 'scaling_down') {
      this.state = {
        ...this.state,
        scalingState: this.state.cooldownUntilMs ? 'cooldown' : 'stable',
      };
    }
  }
}
