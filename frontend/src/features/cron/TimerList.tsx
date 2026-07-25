import { ListItem } from "../../components/ListItem";
import type { CronTimer } from "@flydeck/shared/cron";
import { useEffect, useState, type CSSProperties } from "react";

export type TimerZoom = "1w" | "1m" | "1y" | "5y";

const zoomHours: Record<TimerZoom, number> = {
  "1w": 24 * 7,
  "1m": 24 * 30,
  "1y": 24 * 365,
  "5y": 24 * 365 * 5,
};

function formatTimerDate(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).slice(0, 2).toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-1);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return { weekday, date: `${year}.${month}.${day}`, time };
}

type TimerListProps = {
  timers: CronTimer[];
  armedTimer: string | null;
  selectedTimer: string | null;
  onSelectOrDelete: (id: string) => void;
  onArmDelete: (id: string) => void;
  zoom: TimerZoom;
};

export function TimerList({ timers, armedTimer, selectedTimer, onSelectOrDelete, onArmDelete, zoom }: TimerListProps) {
  const [now, setNow] = useState(() => Date.now());
  const oneWeekAgo = now - 7 * 24 * 3600000;
  const sortedTimers = timers
    .filter((timer) => {
      const dueTime = new Date(timer.dueAt).getTime();
      const expired = timer.status === "expired" || dueTime <= now;
      return !expired || dueTime >= oneWeekAgo;
    })
    .sort((left, right) => {
      const leftExpired = left.status === "expired" || new Date(left.dueAt).getTime() <= now;
      const rightExpired = right.status === "expired" || new Date(right.dueAt).getTime() <= now;
      if (leftExpired !== rightExpired) return leftExpired ? 1 : -1;
      return leftExpired
        ? right.dueAt.localeCompare(left.dueAt)
        : left.dueAt.localeCompare(right.dueAt);
    });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="cron-timer-list" aria-label="Timer list">
      {sortedTimers.map((timer) => {
        const formattedDate = formatTimerDate(new Date(timer.dueAt));
        const remainingHours = Math.max(0, (new Date(timer.dueAt).getTime() - now) / 3600000);
        const expired = timer.status === "expired" || remainingHours === 0;
        const progress = Math.min(100, (remainingHours / zoomHours[zoom]) * 100);
        const style = { "--timer-progress-width": `${progress}%` } as CSSProperties;
        return <div key={timer.id} style={style} className="cron-timer-progress">
        <ListItem
          label={timer.title}
          armed={armedTimer === timer.id}
          className={`cron-timer-row ${expired ? "expired" : ""}`}
          contentClassName={selectedTimer === timer.id ? "active" : ""}
          contentAriaDisabled={expired}
          onContentClick={() => onSelectOrDelete(timer.id)}
          onArmDelete={() => onArmDelete(timer.id)}
        >
          <span>{timer.title}</span>
          <span className="timer-date">
            {expired ? <span className="expired-label">Expired</span> : (
              <>
                <span>{formattedDate.weekday}</span>
                <span>{formattedDate.date}</span>
                <span>{formattedDate.time}</span>
              </>
            )}
          </span>
        </ListItem>
        </div>;
      })}
    </div>
  );
}
