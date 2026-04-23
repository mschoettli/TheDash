import si from "systeminformation";

export function startMetricsMonitor(
  broadcast: (msg: object) => void
): void {
  const interval = parseInt(process.env.METRICS_POLL_INTERVAL ?? "3000", 10);

  const poll = async () => {
    try {
      const [load, mem, disks] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      broadcast({
        type: "metrics:update",
        payload: {
          cpu: Math.round(load.currentLoad),
          ram: {
            used: mem.active,
            total: mem.total,
            percent: Math.round((mem.active / mem.total) * 100),
          },
          disks: disks
            .filter((d) => d.size > 0)
            .map((d) => ({
              fs: d.fs,
              mount: d.mount,
              used: d.used,
              size: d.size,
              percent: Math.round((d.used / d.size) * 100),
            })),
        },
      });
    } catch (err) {
      // systeminformation failure — skip this tick
    }
  };

  poll();
  setInterval(poll, interval);
}
