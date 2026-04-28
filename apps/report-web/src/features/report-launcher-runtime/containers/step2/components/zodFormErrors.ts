import type { UseFormReturnType } from '@mantine/form';
import type { ZodError } from 'zod';

export function applyZodErrors<TValues>(form: UseFormReturnType<TValues>, error: ZodError): void {
  for (const issue of error.issues) {
    const path = issue.path.join('.');

    if (path.length === 0) {
      continue;
    }

    form.setFieldError(path, issue.message);
  }
}
