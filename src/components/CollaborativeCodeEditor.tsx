import { useEffect, useMemo, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { useAuth } from "@/hooks/useAuth";

type CollaborativeCodeEditorProps = {
  projectId: number;
  fileId: number;
  fileName: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
};

function collabUrl() {
  const explicit = import.meta.env.VITE_COLLAB_WS_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/collab`;
}

function userColor(seed: string) {
  const colors = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#60a5fa", "#fb7185"];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}

export default function CollaborativeCodeEditor({
  projectId,
  fileId,
  fileName,
  language,
  value,
  onChange,
}: CollaborativeCodeEditorProps) {
  const { user } = useAuth({ requireAuth: false });
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const syncedRef = useRef(false);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const roomName = useMemo(() => `project-${projectId}-file-${fileId}`, [projectId, fileId]);
  const displayName =
    (user as any)?.name ||
    (user as any)?.fullName ||
    (user as any)?.username ||
    (user as any)?.email ||
    "OCNE user";
  const color = userColor(String((user as any)?.id || displayName));

  const cleanup = () => {
    bindingRef.current?.destroy();
    providerRef.current?.destroy();
    ydocRef.current?.destroy();
    bindingRef.current = null;
    providerRef.current = null;
    ydocRef.current = null;
    syncedRef.current = false;
  };

  useEffect(() => cleanup, []);

  const handleMount: OnMount = (editor, monaco) => {
    cleanup();

    const ydoc = new Y.Doc();
    const yText = ydoc.getText("monaco");
    const provider = new WebsocketProvider(collabUrl(), roomName, ydoc, {
      connect: true,
    });

    provider.awareness.setLocalStateField("user", {
      name: displayName,
      color,
      colorLight: `${color}33`,
      fileName,
    });

    provider.on("sync", (isSynced: boolean) => {
      if (!isSynced || syncedRef.current) return;
      syncedRef.current = true;
      if (yText.length === 0 && valueRef.current) {
        ydoc.transact(() => {
          yText.insert(0, valueRef.current);
        }, "ocne-initial-content");
      }
    });

    const model = editor.getModel();
    if (!model) return;

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor as Monaco.editor.IStandaloneCodeEditor]),
      provider.awareness,
    );

    yText.observe(() => {
      onChange(yText.toString());
    });

    monaco.editor.setTheme("vs-dark");
    bindingRef.current = binding;
    providerRef.current = provider;
    ydocRef.current = ydoc;
  };

  useEffect(() => {
    providerRef.current?.awareness.setLocalStateField("user", {
      name: displayName,
      color,
      colorLight: `${color}33`,
      fileName,
    });
  }, [displayName, color, fileName]);

  return (
    <Editor
      key={`${roomName}-${language}`}
      height="100%"
      language={language || "plaintext"}
      value={value}
      theme="vs-dark"
      onMount={handleMount}
      options={{
        automaticLayout: true,
        fontSize: 13,
        fontFamily: 'Consolas, "Cascadia Code", "Courier New", monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "off",
        tabSize: 2,
        renderWhitespace: "selection",
        smoothScrolling: true,
      }}
    />
  );
}
