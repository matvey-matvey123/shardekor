export default function Prose({ text }: { text: string | null }) {
  if (!text) return null;
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
      {blocks.map((b, i) =>
        b.includes("\n") ? (
          <p key={i} className="whitespace-pre-line">
            {b}
          </p>
        ) : (
          <p key={i}>{b}</p>
        )
      )}
    </div>
  );
}