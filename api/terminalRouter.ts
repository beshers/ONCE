import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const SHELL_CANDIDATES = {
  powershell: [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    "/usr/bin/pwsh",
    "/opt/microsoft/powershell/7/pwsh",
  ],
  cmd: ["C:\\Windows\\System32\\cmd.exe"],
  bash: ["/bin/bash", "/usr/bin/bash"],
  sh: ["/bin/sh", "/usr/bin/sh"],
} as const;

const SHELL_ARGS: Record<ShellType, string[]> = {
  powershell: ["-NoLogo", "-NoExit", "-NonInteractive"],
  cmd: [],
  bash: ["--noprofile", "--norc", "-i"],
  sh: ["-i"],
};

type ShellType = keyof typeof SHELL_CANDIDATES;

interface TerminalSession {
  id: string;
  userId: string;
  shell: ShellType;
  process: ChildProcessWithoutNullStreams;
  outputBuffer: string[];
  createdAt: Date;
  alive: boolean;
}

const sessions = new Map<string, TerminalSession>();

function resolveShell(shell: ShellType) {
  return SHELL_CANDIDATES[shell].find((candidate) => existsSync(candidate));
}

export const terminalRouter = createRouter({
  checkShells: authedQuery.query(() => {
    return {
      powershell: Boolean(resolveShell("powershell")),
      cmd: Boolean(resolveShell("cmd")),
      bash: Boolean(resolveShell("bash")),
      sh: Boolean(resolveShell("sh")),
      platform: process.platform,
    };
  }),

  createSession: authedQuery
    .input(z.object({ shell: z.enum(["powershell", "cmd", "bash", "sh"]), allowComputerAccess: z.literal(true) }))
    .mutation(({ ctx, input }) => {
      const id = randomUUID();
      const shellPath = resolveShell(input.shell);
      const args = SHELL_ARGS[input.shell];

      if (!shellPath) {
        throw new Error(`${input.shell} is not available on this server.`);
      }

      const proc = spawn(shellPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
        env: process.env,
      });

      const session: TerminalSession = {
        id,
        userId: String(ctx.user.id),
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
        allowComputerAccess: z.literal(true),
      }),
    )
    .mutation(({ ctx, input }) => {
      const session = sessions.get(input.sessionId);

      if (!session) {
        return { success: false, error: "Session not found" };
      }
      if (session.userId !== String(ctx.user.id)) {
        return { success: false, error: "You do not own this terminal session" };
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
    .query(({ ctx, input }) => {
      const session = sessions.get(input.sessionId);

      if (!session || session.userId !== String(ctx.user.id)) {
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

  listSessions: authedQuery.query(({ ctx }) => {
    return Array.from(sessions.values()).filter((s) => s.userId === String(ctx.user.id)).map((s) => ({
      id: s.id,
      shell: s.shell,
      createdAt: s.createdAt,
      alive: s.alive,
      outputLength: s.outputBuffer.length,
    }));
  }),

  killSession: authedQuery
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ ctx, input }) => {
      const session = sessions.get(input.sessionId);

      if (session && session.userId === String(ctx.user.id)) {
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
