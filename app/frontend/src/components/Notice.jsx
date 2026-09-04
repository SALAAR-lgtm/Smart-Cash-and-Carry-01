// One place for the small status/informational boxes, so loading, empty and
// error states stay visually consistent across the app.
export default function Notice({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-white text-muted',
    error: 'border-red-200 bg-red-50 text-accent-dark',
  };

  return (
    <div className={`rounded-xl border px-4 py-3.5 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
