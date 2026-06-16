/**
 * OrderChat — order-scoped real-time chat for one channel (customer↔driver or
 * customer↔vendor). History is loaded over REST; live messages, read receipts
 * and typing indicators arrive over the socket. Pass `readOnly` for admin
 * oversight (renders the transcript without an input).
 */
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketContext } from '@/contexts/SocketContext';
import orderChatService from '@/services/orderChatService';
import type { MessageChannel, OrderMessage } from '@/types/order';
import { Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface OrderChatProps {
  orderId: string;
  channel: MessageChannel;
  /** Label for the other party, e.g. "Your rider" or "Acme Kitchen". */
  peerLabel: string;
  /** Read-only transcript (admin oversight). */
  readOnly?: boolean;
  className?: string;
}

const fmtTime = (d: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(d));

const tempId = () => `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const OrderChat: React.FC<OrderChatProps> = ({
  orderId,
  channel,
  peerLabel,
  readOnly = false,
  className,
}) => {
  const { user } = useAuth();
  const { socket, emitTyping } = useSocketContext();
  const currentUserId = user?.id ?? '';

  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // ── Load history ──────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    orderChatService.list(orderId, channel).then((res) => {
      if (!active) return;
      if (res.success && res.data) setMessages(res.data.messages);
      setLoading(false);
      scrollToBottom();
    });
    return () => {
      active = false;
    };
  }, [orderId, channel, scrollToBottom]);

  // ── Mark read whenever the thread is open and messages change ──
  const markRead = useCallback(() => {
    if (readOnly) return;
    orderChatService.markRead(orderId, channel);
  }, [orderId, channel, readOnly]);

  useEffect(() => {
    if (!loading && messages.length) markRead();
  }, [loading, messages.length, markRead]);

  // ── Live events ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: OrderMessage) => {
      if (msg.orderId !== orderId || msg.channel !== channel) return;
      setMessages((prev) => {
        // Reconcile an optimistic message from this user.
        if (msg.sender?._id === currentUserId) {
          const idx = prev.findIndex(
            (m) => m.pending && m.text === msg.text,
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = msg;
            return next;
          }
        }
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      if (msg.sender?._id !== currentUserId) markRead();
    };

    const onRead = (data: {
      orderId: string;
      channel: string;
      readerId: string;
    }) => {
      if (data.orderId !== orderId || data.channel !== channel) return;
      if (data.readerId === currentUserId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.readBy?.includes(data.readerId)
            ? m
            : { ...m, readBy: [...(m.readBy ?? []), data.readerId] },
        ),
      );
    };

    const onTyping = (data: {
      orderId: string;
      channel: string;
      isTyping: boolean;
      userId: string;
    }) => {
      if (data.orderId !== orderId || data.channel !== channel) return;
      if (data.userId === currentUserId) return;
      setPeerTyping(data.isTyping);
      if (data.isTyping) {
        if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current);
        peerTypingTimeout.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    };

    socket.on('order:chatMessage', onMessage);
    socket.on('order:chatRead', onRead);
    socket.on('order:chatTyping', onTyping);
    return () => {
      socket.off('order:chatMessage', onMessage);
      socket.off('order:chatRead', onRead);
      socket.off('order:chatTyping', onTyping);
    };
  }, [socket, orderId, channel, currentUserId, markRead, scrollToBottom]);

  // ── Compose ───────────────────────────────────────────────────
  const handleTyping = (value: string) => {
    setDraft(value);
    emitTyping(orderId, channel, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(
      () => emitTyping(orderId, channel, false),
      1500,
    );
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const optimistic: OrderMessage = {
      _id: tempId(),
      orderId,
      channel,
      text,
      attachments: [],
      senderRole: user?.role ?? '',
      sender: {
        _id: currentUserId,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        role: user?.role ?? '',
      },
      readBy: [currentUserId],
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setSending(true);
    emitTyping(orderId, channel, false);
    scrollToBottom();

    const res = await orderChatService.send(orderId, channel, text);
    setSending(false);
    if (res.success && res.data) {
      // The socket echo reconciles the optimistic bubble; if it raced ahead or
      // never arrives, swap it in here.
      setMessages((prev) =>
        prev.map((m) =>
          m._id === optimistic._id ? { ...res.data!.message } : m,
        ),
      );
    } else {
      // Mark the optimistic bubble as failed.
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setDraft(text);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastOwn = [...messages].reverse().find((m) => m.sender?._id === currentUserId);
  const lastOwnSeen =
    lastOwn && (lastOwn.readBy ?? []).some((id) => id !== currentUserId);

  return (
    <div
      className={`flex flex-col rounded-xl border border-border bg-card ${className ?? ''}`}
    >
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">{peerLabel}</p>
        <p className="text-xs text-muted-foreground">
          {peerTyping ? 'typing…' : 'Order chat'}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
        style={{ minHeight: 200, maxHeight: 340 }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No messages yet. {readOnly ? '' : 'Say hello 👋'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender?._id === currentUserId;
            return (
              <div
                key={m._id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'rounded-br-sm bg-orange-500 text-white'
                      : 'rounded-bl-sm bg-muted text-foreground'
                  } ${m.pending ? 'opacity-70' : ''}`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-medium opacity-70">
                      {m.sender?.firstName} {m.sender?.lastName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p
                    className={`mt-0.5 text-[10px] ${mine ? 'text-orange-100' : 'text-muted-foreground'}`}
                  >
                    {fmtTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-border p-2">
          {lastOwnSeen && (
            <p className="px-2 pb-1 text-right text-[10px] text-muted-foreground">
              Seen
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="h-9 w-9 shrink-0 bg-orange-500 hover:bg-orange-600"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderChat;
