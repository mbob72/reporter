import { useState } from 'react';

export function App() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLaunch = async () => {
    setLoading(true);

    const response = await fetch('/launch-report', {
      method: 'POST',
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    setDone(true);
  };

  return (
    <main className="app">
      {done ? (
        <p className="message">Готово!</p>
      ) : (
        <button className="button" onClick={handleLaunch} disabled={loading}>
          {loading ? 'Запуск...' : 'Запустить'}
        </button>
      )}
    </main>
  );
}
