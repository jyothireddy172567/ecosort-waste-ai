import { Droplets, Sun, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DailyTrackingProps {
  history: any[];
}

const DailyTracking = ({ history }: DailyTrackingProps) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = (d: string) => new Date(d).toDateString() === today.toDateString();
  const isYesterday = (d: string) => new Date(d).toDateString() === yesterday.toDateString();

  const todayScans = history.filter((s) => isToday(s.created_at));
  const yesterdayScans = history.filter((s) => isYesterday(s.created_at));

  const avg = (scans: any[], key: string) =>
    scans.length ? Math.round(scans.reduce((a: number, s: any) => a + Number(s[key]), 0) / scans.length) : null;

  const todayWet = avg(todayScans, "wet_percent");
  const todayDry = avg(todayScans, "dry_percent");
  const yesterdayWet = avg(yesterdayScans, "wet_percent");
  const yesterdayDry = avg(yesterdayScans, "dry_percent");

  const TrendIcon = ({ current, previous }: { current: number | null; previous: number | null }) => {
    if (current === null || previous === null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-eco-wet" />;
    if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-eco-dry" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="eco-card">
      <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" /> Daily Tracking
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Today */}
        <div className="p-3 rounded-xl bg-secondary/60 space-y-2">
          <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide">Today</span>
          {todayScans.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">No scans</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm font-body">
                <Droplets className="w-3.5 h-3.5 text-eco-wet" />
                <span className="text-foreground font-heading font-bold">{todayWet}%</span>
                <span className="text-muted-foreground">wet</span>
                <TrendIcon current={todayWet} previous={yesterdayWet} />
              </div>
              <div className="flex items-center gap-1.5 text-sm font-body">
                <Sun className="w-3.5 h-3.5 text-eco-dry" />
                <span className="text-foreground font-heading font-bold">{todayDry}%</span>
                <span className="text-muted-foreground">dry</span>
                <TrendIcon current={todayDry} previous={yesterdayDry} />
              </div>
              <p className="text-xs text-muted-foreground">{todayScans.length} scan(s)</p>
            </>
          )}
        </div>
        {/* Yesterday */}
        <div className="p-3 rounded-xl bg-secondary/60 space-y-2">
          <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide">Yesterday</span>
          {yesterdayScans.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">No scans</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm font-body">
                <Droplets className="w-3.5 h-3.5 text-eco-wet" />
                <span className="text-foreground font-heading font-bold">{yesterdayWet}%</span>
                <span className="text-muted-foreground">wet</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-body">
                <Sun className="w-3.5 h-3.5 text-eco-dry" />
                <span className="text-foreground font-heading font-bold">{yesterdayDry}%</span>
                <span className="text-muted-foreground">dry</span>
              </div>
              <p className="text-xs text-muted-foreground">{yesterdayScans.length} scan(s)</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyTracking;
