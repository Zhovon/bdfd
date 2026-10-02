import { listTickers } from "@/lib/content";

export default async function ScrollingTicker() {
  const items = await listTickers();
  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden py-2 flex items-center shadow-sm" style={{ backgroundColor: "#006a4e", color: "#ffffff", borderBottom: "2px solid #f42a41" }}>
      <div className="whitespace-nowrap animate-scroll px-4 text-sm font-bold tracking-wide">
        {items.map((i, idx) => (
          <span key={i.id}>
            {i.link ? (
              <a href={i.link} className="hover:underline hover:opacity-80 transition-opacity">
                {i.message}
              </a>
            ) : (
              i.message
            )}
            {idx < items.length - 1 && <span className="mx-4 opacity-60">|</span>}
          </span>
        ))}
      </div>

      <style>{`
        .animate-scroll {
          display: inline-block;
          animation: scroll-left 25s linear infinite;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-scroll {
            animation: none;
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
