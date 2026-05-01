/**
 * useSocket – thin wrapper around SocketContext.
 * Returns the single shared socket connection for the current user.
 * No new connection is created by calling this hook.
 */
import { useSocketContext } from "@/contexts/SocketContext";

export const useSocket = () => useSocketContext();
