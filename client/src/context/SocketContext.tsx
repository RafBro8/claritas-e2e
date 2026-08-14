import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL: string = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4001";

interface SocketContextValue {
  socket: Socket;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

// Created once at module scope, not inside the component — every consumer
// shares the exact same connection rather than each mount opening a new one.
const socket = io(SOCKET_URL, { autoConnect: true });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect(): void {
      setConnected(true);
    }
    function handleDisconnect(): void {
      setConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}
