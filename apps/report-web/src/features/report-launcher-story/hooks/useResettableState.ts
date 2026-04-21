import { useEffect, useState } from 'react';

export function useResettableState<T>(initialValue: T) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return [value, setValue] as const;
}
