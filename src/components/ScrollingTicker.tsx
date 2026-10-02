import { listTickers } from "@/lib/content";

export default async function ScrollingTicker() {
  const items = await listTickers();
  if (items.length === 0) return null;

  const content = (
    <>
      {items.map((i) => (
        <span key={i.id}>
          {i.link ? (
            <a href={i.link} className="hover:underline hover:opacity-80 transition-opacity">
              {i.message}
            </a>
          ) : (
            i.message
          )}
          <span className="mx-8 opacity-60">|</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="relative overflow-hidden py-2 flex items-center shadow-sm" style={{ backgroundColor: "#006a4e", color: "#ffffff", borderBottom: "2px solid #f42a41" }}>
      <div className="whitespace-nowrap animate-scroll text-sm font-bold tracking-wide flex w-max">
        <div className="flex-shrink-0 px-4">{content}</div>
        <div className="flex-shrink-0 px-4" aria-hidden="true">{content}</div>
      </div>

      <style>{`
        .animate-scroll {
          animation: scroll-left 30s linear infinite;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-scroll {
            animation: none;
            white-space: normal;
            display: block;
          }
          .animate-scroll > div:last-child {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
