import { Group } from '@mantine/core';
import type { ReactNode } from 'react';

type StepFooterActionsProps = {
  children: ReactNode;
};

export function StepFooterActions({ children }: StepFooterActionsProps) {
  return (
    <Group className="mt-auto w-full shrink-0 justify-start border-t border-slate-200 bg-surface pt-3">
      {children}
    </Group>
  );
}
