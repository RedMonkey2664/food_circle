// Re-mounts on every navigation inside the app, so each new page gets a short, subtle
// entrance (fade + 6px rise, 200 ms). Off for reduced motion and for the log takeover,
// which has its own circle reveal (see app/globals.css .page-in).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
