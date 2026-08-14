import { useSocket } from "../context/SocketContext";

export function ConnectionStatus() {
  const { connected, socket } = useSocket();

  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
          aria-hidden="true"
        />
        <span className={connected ? "text-emerald-400" : "text-red-400"}>
          {connected ? "Server Connected" : "Disconnected"}
        </span>
      </div>
      {connected && <span className="truncate text-slate-500">{socket.id}</span>}
    </div>
  );
}
