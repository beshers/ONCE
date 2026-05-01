import React, { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";

type ShellType = "powershell" | "cmd" | "bash" | "sh";

interface SessionMeta {
  id: string;
  shell: ShellType;
}

const SHELL_LABELS: Record<ShellType, string> = {
  powershell: "PowerShell",
  cmd: "Command Prompt",
  bash: "Bash",
  sh: "Shell",
};

const SHELL_ICON: Record<ShellType, string> = {
  powershell: "PS",
  cmd: "CMD",
  bash: "BASH",
  sh: "SH",
};

const POLL_INTERVAL_MS = 500;
const SHELLS: ShellType[] = ["powershell", "cmd", "bash", "sh"];

function getPythonCommands(shell: ShellType) {
  if (shell === "powershell") {
    return [
      { label: "Check Python", command: "python --version; py --version" },
      { label: "Run Python Test", command: "python -c \"print('OCNE Python test works')\"" },
      { label: "Try Install Python", command: "winget install -e --id Python.Python.3.12" },
    ];
  }

  if (shell === "cmd") {
    return [
      { label: "Check Python", command: "python --version && py --version" },
      { label: "Run Python Test", command: "python -c \"print('OCNE Python test works')\"" },
      { label: "Try Install Python", command: "winget install -e --id Python.Python.3.12" },
    ];
  }

  return [
    { label: "Check Python", command: "python3 --version || python --version" },
    { label: "Run Python Test", command: "python3 -c \"print('OCNE Python test works')\" || python -c \"print('OCNE Python test works')\"" },
    { label: "Try Install Python", command: "sudo apt-get update && sudo apt-get install -y python3 python3-pip" },
  ];
}

export default function EmbeddedTerminal({
  compact = false,
  title = "Terminal",
}: {
  compact?: boolean;
  title?: string;
}) {
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [sessionAlive, setSessionAlive] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [allowComputerAccess, setAllowComputerAccess] = useState(false);
  const [displayOutput, setDisplayOutput] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const outputChunksRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  const outputDivRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const utils = trpc.useUtils();

  const { data: shellAvailability, isLoading: checkingShells } =
    trpc.terminal.checkShells.useQuery(undefined, {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    });

  const appendOutput = useCallback((text: string) => {
    outputChunksRef.current.push(text);
    setDisplayOutput(outputChunksRef.current.join(""));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const createSessionMutation = trpc.terminal.createSession.useMutation({
    onSuccess: (data) => {
      const meta: SessionMeta = { id: data.sessionId, shell: data.shell as ShellType };
      sessionIdRef.current = data.sessionId;
      setSession(meta);
      setSessionAlive(true);
      setIsCreating(false);
      outputChunksRef.current = [];
      cursorRef.current = 0;
      setDisplayOutput("");
      window.setTimeout(() => inputRef.current?.focus(), 80);
    },
    onError: (err) => {
      setIsCreating(false);
      appendOutput(`\r\n[Failed to create session: ${err.message}]\r\n`);
    },
  });

  const sendInputMutation = trpc.terminal.sendInput.useMutation({
    onError: (err) => {
      appendOutput(`\r\n[Send error: ${err.message}]\r\n`);
    },
  });

  const killSessionMutation = trpc.terminal.killSession.useMutation({
    onSuccess: () => {
      stopPolling();
      sessionIdRef.current = null;
      setSession(null);
      setSessionAlive(false);
    },
  });

  useEffect(() => {
    const el = outputDivRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [displayOutput]);

  const poll = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    try {
      const result = await utils.terminal.getOutput.fetch({
        sessionId: sid,
        fromIndex: cursorRef.current,
      });

      if (result.notFound) {
        stopPolling();
        setSessionAlive(false);
        appendOutput("\r\n[Session lost - server may have restarted]\r\n");
        return;
      }

      if (result.chunks.length > 0) {
        result.chunks.forEach((chunk) => appendOutput(chunk));
        cursorRef.current = result.totalChunks;
      }

      if (!result.alive && sessionAlive) {
        setSessionAlive(false);
        stopPolling();
      }
    } catch {
      stopPolling();
      setSessionAlive(false);
      appendOutput("\r\n[Polling failed - connection lost]\r\n");
    }
  }, [utils, appendOutput, sessionAlive, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [poll, stopPolling]);

  useEffect(() => {
    if (session) {
      startPolling();
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [session?.id, startPolling, stopPolling]);

  const handleStartShell = (shell: ShellType) => {
    if (!allowComputerAccess) {
      appendOutput("\r\n[Approve terminal access first.]\r\n");
      return;
    }
    if (session) {
      killSessionMutation.mutate({ sessionId: session.id });
    }
    stopPolling();
    setIsCreating(true);
    setDisplayOutput("");
    outputChunksRef.current = [];
    cursorRef.current = 0;
    createSessionMutation.mutate({ shell, allowComputerAccess: true });
  };

  const handleSendInput = () => {
    if (!session || !inputValue) return;
    if (!allowComputerAccess) {
      appendOutput("\r\n[Command blocked. Approve terminal access first.]\r\n");
      return;
    }

    const command = inputValue;
    setHistory((items) => [...items.slice(-49), command]);
    setHistoryIndex(null);
    sendInputMutation.mutate({ sessionId: session.id, input: command, allowComputerAccess: true });
    setInputValue("");
    inputRef.current?.focus();
  };

  const clearOutput = () => {
    outputChunksRef.current = [];
    cursorRef.current = 0;
    setDisplayOutput("");
  };

  const queueCommand = (command: string) => {
    setInputValue(command);
    inputRef.current?.focus();
  };

  const shellReady = !checkingShells && shellAvailability !== undefined;
  const pythonCommands = session ? getPythonCommands(session.shell) : [];

  return (
    <div style={{ ...S.page, height: compact ? "360px" : "calc(100vh - 120px)" }}>
      <div style={S.topbar}>
        <div style={S.titleBlock}>
          <span style={S.appTitle}>{title}</span>
          <span style={S.subtitle}>Runs on the OCNE host computer/server after approval.</span>
        </div>
        <div style={S.shellBtnRow}>
          {SHELLS.map((shell) => {
            const available = Boolean(shellAvailability?.[shell]);
            const isActive = session?.shell === shell && sessionAlive;
            const disabled = !shellReady || !available || isCreating || !allowComputerAccess;
            return (
              <button
                key={shell}
                onClick={() => handleStartShell(shell)}
                disabled={disabled}
                style={{
                  ...S.shellBtn,
                  ...(isActive ? S.shellBtnActive : {}),
                  ...(disabled ? S.shellBtnDisabled : {}),
                }}
              >
                <span style={S.shellIcon}>{SHELL_ICON[shell]}</span>
                <span>{SHELL_LABELS[shell]}</span>
              </button>
            );
          })}
        </div>
        {session && (
          <button onClick={() => killSessionMutation.mutate({ sessionId: session.id })} style={S.killBtn}>
            Stop
          </button>
        )}
      </div>

      <label style={S.permissionBar}>
        <input
          type="checkbox"
          checked={allowComputerAccess}
          onChange={(event) => setAllowComputerAccess(event.target.checked)}
        />
        <span>I allow this terminal to run commands on the OCNE host computer/server. Commands can change files there.</span>
      </label>

      <div style={S.terminalPane}>
        {session && (
          <div style={{ ...S.statusBar, ...(sessionAlive ? S.statusBarAlive : S.statusBarDead) }}>
            <span style={S.statusDot}>{sessionAlive ? "ON" : "OFF"}</span>
            <span>
              {SHELL_LABELS[session.shell]} - {sessionAlive ? "Running" : "Exited"} -{" "}
              <code style={S.sessionIdCode}>{session.id.slice(0, 8)}</code>
            </span>
          </div>
        )}

        <div ref={outputDivRef} style={S.outputArea}>
          {!session && !isCreating ? (
            <div style={S.emptyHint}>
              <div style={S.emptyIcon}>[]</div>
              <div>{allowComputerAccess ? "Select an available shell above." : "Approve terminal access above, then select a shell."}</div>
            </div>
          ) : isCreating ? (
            <div style={S.emptyHint}>
              <div style={S.spinner}>...</div>
              <div>Starting session...</div>
            </div>
          ) : (
            <pre style={S.outputPre}>{displayOutput || "\u00a0"}</pre>
          )}
        </div>

        {session && sessionAlive && (
          <>
            <div style={S.quickActions}>
              <span style={S.quickActionsLabel}>Python</span>
              {pythonCommands.map((item) => (
                <button key={item.label} onClick={() => queueCommand(item.command)} style={S.quickBtn}>
                  {item.label}
                </button>
              ))}
            </div>
            <div style={S.inputRow}>
              <span style={S.promptGlyph}>{session.shell === "powershell" ? "PS >" : session.shell === "cmd" ? "CMD >" : "$"}</span>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendInput();
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
                    if (nextIndex >= 0) {
                      setHistoryIndex(nextIndex);
                      setInputValue(history[nextIndex] || "");
                    }
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (historyIndex === null) return;
                    const nextIndex = historyIndex + 1;
                    if (nextIndex >= history.length) {
                      setHistoryIndex(null);
                      setInputValue("");
                    } else {
                      setHistoryIndex(nextIndex);
                      setInputValue(history[nextIndex] || "");
                    }
                  }
                  if (e.key === "c" && e.ctrlKey && session) {
                    sendInputMutation.mutate({ sessionId: session.id, input: "\x03", allowComputerAccess: true });
                  }
                }}
                style={S.cmdInput}
                placeholder="Type a command and press Enter..."
                spellCheck={false}
              />
              <button onClick={clearOutput} style={S.sendBtn}>Clear</button>
              <button onClick={handleSendInput} style={S.sendBtn}>Run</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    background: "#0d1117",
    color: "#c9d1d9",
    fontFamily: 'Consolas, "Cascadia Code", "Courier New", monospace',
    overflow: "hidden",
    border: "1px solid #21262d",
    borderRadius: "12px",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    borderBottom: "1px solid #21262d",
    background: "#161b22",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  titleBlock: { display: "flex", flexDirection: "column", gap: "2px", marginRight: "8px" },
  appTitle: { fontSize: "14px", fontWeight: 700, color: "#58a6ff", letterSpacing: "0.5px" },
  subtitle: { color: "#8b949e", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif" },
  shellBtnRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  shellBtn: {
    display: "flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "6px",
    border: "1px solid #30363d", background: "#21262d", color: "#c9d1d9", cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
  },
  shellBtnActive: { border: "1px solid #58a6ff", background: "#132035", color: "#58a6ff" },
  shellBtnDisabled: { opacity: 0.45, cursor: "not-allowed", pointerEvents: "none" },
  shellIcon: { fontSize: "11px", fontWeight: 700, opacity: 0.7 },
  killBtn: {
    marginLeft: "auto", padding: "5px 12px", borderRadius: "6px", border: "1px solid #f85149",
    background: "transparent", color: "#f85149", cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
  },
  permissionBar: {
    display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid #21262d",
    background: "#0f172a", color: "#dbeafe", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px", lineHeight: 1.4,
  },
  terminalPane: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  statusBar: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 16px", fontSize: "11px", letterSpacing: "0.3px", flexShrink: 0 },
  statusBarAlive: { background: "#0f2a1a", borderBottom: "1px solid #1a4428", color: "#3fb950" },
  statusBarDead: { background: "#1a1015", borderBottom: "1px solid #3d1f23", color: "#8b949e" },
  statusDot: { fontSize: "10px", fontWeight: 700 },
  sessionIdCode: { fontSize: "10px", background: "#21262d", padding: "1px 5px", borderRadius: "3px" },
  outputArea: { flex: 1, overflowY: "auto", padding: "12px 16px", background: "#010409", minHeight: 0 },
  outputPre: { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "13px", lineHeight: "1.6", color: "#c9d1d9", tabSize: 4 },
  emptyHint: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "#484f58", fontSize: "14px" },
  emptyIcon: { fontSize: "32px", opacity: 0.3 },
  spinner: { fontSize: "24px" },
  inputRow: { display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #21262d", padding: "8px 16px", background: "#0d1117", flexShrink: 0 },
  quickActions: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #21262d", padding: "8px 16px", background: "#070b12", flexShrink: 0 },
  quickActionsLabel: { color: "#8b949e", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif", textTransform: "uppercase" },
  quickBtn: { padding: "4px 10px", borderRadius: "999px", border: "1px solid #1d9bf0", background: "rgba(29,155,240,0.08)", color: "#93c5fd", cursor: "pointer", fontSize: "12px", fontFamily: "Inter, system-ui, sans-serif", flexShrink: 0 },
  promptGlyph: { color: "#3fb950", fontWeight: 700, fontSize: "13px", userSelect: "none", flexShrink: 0 },
  cmdInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#e6edf3", fontFamily: 'Consolas, "Cascadia Code", "Courier New", monospace', fontSize: "13px", caretColor: "#58a6ff", lineHeight: "1.5" },
  sendBtn: { padding: "4px 12px", borderRadius: "5px", border: "1px solid #30363d", background: "#21262d", color: "#c9d1d9", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", flexShrink: 0 },
};
