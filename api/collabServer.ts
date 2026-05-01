import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

type CollabDoc = {
  name: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
};

const docs = new Map<string, CollabDoc>();

function getDoc(name: string) {
  const existing = docs.get(name);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  const collabDoc: CollabDoc = { name, doc, awareness, clients: new Set() };
  docs.set(name, collabDoc);

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    broadcast(collabDoc, encoding.toUint8Array(encoder), origin);
  });

  awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
    broadcast(collabDoc, encoding.toUint8Array(encoder), origin);
  });

  return collabDoc;
}

function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState === 1) {
    ws.send(message);
  }
}

function broadcast(doc: CollabDoc, message: Uint8Array, origin: unknown) {
  for (const client of doc.clients) {
    if (client !== origin) {
      send(client, message);
    }
  }
}

function readMessage(ws: WebSocket, doc: CollabDoc, message: Uint8Array) {
  const decoder = decoding.createDecoder(message);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  if (messageType === messageSync) {
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.readSyncMessage(decoder, encoder, doc.doc, ws);
    const response = encoding.toUint8Array(encoder);
    if (response.length > 1) {
      send(ws, response);
    }
    return;
  }

  if (messageType === messageAwareness) {
    awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), ws);
    return;
  }

  if (messageType === messageQueryAwareness) {
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(doc.awareness.getStates().keys())),
    );
    send(ws, encoding.toUint8Array(encoder));
  }
}

function sendInitialSync(ws: WebSocket, doc: CollabDoc) {
  const syncStep1 = encoding.createEncoder();
  encoding.writeVarUint(syncStep1, messageSync);
  syncProtocol.writeSyncStep1(syncStep1, doc.doc);
  send(ws, encoding.toUint8Array(syncStep1));

  const syncStep2 = encoding.createEncoder();
  encoding.writeVarUint(syncStep2, messageSync);
  syncProtocol.writeSyncStep2(syncStep2, doc.doc);
  send(ws, encoding.toUint8Array(syncStep2));

  const awarenessStates = Array.from(doc.awareness.getStates().keys());
  if (awarenessStates.length > 0) {
    const awareness = encoding.createEncoder();
    encoding.writeVarUint(awareness, messageAwareness);
    encoding.writeVarUint8Array(awareness, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, awarenessStates));
    send(ws, encoding.toUint8Array(awareness));
  }
}

export function handleCollabConnection(ws: WebSocket, request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const rawName = decodeURIComponent(url.pathname.replace(/^\/api\/collab\/?/, "")) || "default";
  const doc = getDoc(rawName);

  doc.clients.add(ws);
  sendInitialSync(ws, doc);

  ws.on("message", (message) => {
    const data = message instanceof Buffer
      ? new Uint8Array(message)
      : Array.isArray(message)
        ? new Uint8Array(Buffer.concat(message))
        : new Uint8Array(message as ArrayBuffer);
    readMessage(ws, doc, data);
  });

  ws.on("close", () => {
    doc.clients.delete(ws);
    if (doc.clients.size === 0 && doc.awareness.getStates().size === 0) {
      // Keep the Y.Doc in memory so quick reconnects can resume without waiting for DB hydration.
      return;
    }
  });
}
