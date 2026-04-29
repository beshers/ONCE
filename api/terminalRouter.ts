import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const SHELL_PATHS = {
  powershell: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  cmd: "C:\\Windows\\System32\\cmd.exe",
} as const;

const SHELL_ARGS: Record<keyof typeof SHELL_PATHS, string[]> = {
  powershell: ["-NoLogo", "-NoExit", "-NonInteractive"],
  cmd: [],
};

type ShellType = keyof typeof SHELL_PATHS;

interface TerminalSession {
  id: string;
  shell: ShellType;
  process: ChildProcessWithoutNullStreams;
  outputBuffer: string[];
  createdAt: Date;
  alive: boolean;
}

const sessions = new Map<string, TerminalSession>();

export const terminalRouter = createRouter({
  checkShells: authedQuery.query(() => {
    return {
      powershell: existsSync(SHELL_PATHS.powershell),
      cmd: existsSync(SHELL_PATHS.cmd),
    };
  }),

  createSession: authedQuery
    .input(z.object({ shell: z.enum(["powershell", "cmd"]) }))
    .mutation(({ input }) => {
      const id = randomUUID();
      const shellPath = SHELL_PATHS[input.shell];
      const args = SHELL_ARGS[input.shell];

      if (!existsSync(shellPath)) {
        throw new Error(`Shell not found at: ${shellPath}`);
      }

      const proc = spawn(shellPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
        env: process.env,
      });

      const session: TerminalSession = {
        id,
        shell: input.shell,
        process: proc,
        outputBuffer: [],
        createdAt: new Date(),
        alive: true,
      };

      proc.stdout.setEncoding("utf8");
      proc.stdout.on("data", (chunk: string) => {
        session.outputBuffer.push(chunk);
      });

      proc.stderr.setEncoding("utf8");
      proc.stderr.on("data", (chunk: string) => {
        session.outputBuffer.push(chunk);
      });

      proc.on("close", (code) => {
        session.alive = false;
        session.outputBuffer.push(`\r\n\r\n[Session ended - exit code: ${code ?? "?"}]\r\n`);
      });

      proc.on("error", (err) => {
        session.alive = false;
        session.outputBuffer.push(`\r\n[Spawn error: ${err.message}]\r\n`);
      });

      proc.stdin.on("error", () => {
        session.alive = false;
      });

      sessions.set(id, session);

      return {
        sessionId: id,
        shell: input.shell,
      };
    }),

  sendInput: authedQuery
    .input(
      z.object({
        sessionId: z.string(),
        input: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const session = sessions.get(input.sessionId);

      if (!session) {
        return { success: false, error: "Session not found" };
      }
      if (!session.alive) {
        return { success: false, error: "Session has exited" };
      }
      if (session.process.stdin.destroyed) {
        return { success: false, error: "stdin is closed" };
      }

      session.process.stdin.write(input.input + "\n");

      return { success: true };
    }),

  getOutput: authedQuery
    .input(
      z.object({
        sessionId: z.string(),
        fromIndex: z.number().int().min(0).default(0),
      }),
    )
    .query(({ input }) => {
      const session = sessions.get(input.sessionId);

      if (!session) {
        return { chunks: [], totalChunks: 0, alive: false, notFound: true };
      }

      const newChunks = session.outputBuffer.slice(input.fromIndex);

      return {
        chunks: newChunks,
        totalChunks: session.outputBuffer.length,
        alive: session.alive,
        notFound: false,
      };
    }),

  listSessions: authedQuery.query(() => {
    return Array.from(sessions.values()).map((s) => ({
      id: s.id,
      shell: s.shell,
      createdAt: s.createdAt,
      alive: s.alive,
      outputLength: s.outputBuffer.length,
    }));
  }),

  killSession: authedQuery
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = sessions.get(input.sessionId);

      if (session) {
        try {
          session.process.kill("SIGTERM");
        } catch {
          // already dead
        }
        sessions.delete(input.sessionId);
      }

      return { success: true };
    }),
});
