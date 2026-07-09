import { flagUrl, nameEs } from "../data/teams";

export function Flag({
  team,
  size = 22,
  dim = false,
}: {
  team: string | null;
  size?: number;
  dim?: boolean;
}) {
  const url = team ? flagUrl(team) : null;
  const h = Math.round(size * 0.68);
  if (!url) {
    return (
      <span
        className="inline-block flex-none rounded-[3px] border border-line bg-panel"
        style={{ width: size, height: h }}
      />
    );
  }
  return (
    <img
      src={url}
      alt={team ? nameEs(team) : ""}
      width={size}
      height={h}
      loading="lazy"
      className="flex-none rounded-[3px] object-cover shadow-[inset_0_0_0_1px_rgba(234,240,255,0.14)]"
      style={{
        width: size,
        height: h,
        ...(dim ? { opacity: 0.3, filter: "saturate(0.4)" } : {}),
      }}
    />
  );
}
