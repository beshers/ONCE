import { MonitorUp, Server, Terminal as TerminalIcon } from "lucide-react";
import EmbeddedTerminal from "@/components/EmbeddedTerminal";
import LocalAgentPage from "@/pages/LocalAgentPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TerminalPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-cyan-300">
            <TerminalIcon className="h-4 w-4" />
            Terminal
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">OCNE Terminal</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Run commands on the OCNE host or connect to your own computer through the Local Agent.
          </p>
        </div>
      </div>

      <Tabs defaultValue="agent" className="min-h-0 flex-1">
        <TabsList className="h-11 w-full justify-start rounded-2xl border border-white/10 bg-[#0f0f1a] p-1 sm:w-fit">
          <TabsTrigger value="agent" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950">
            <MonitorUp className="mr-2 h-4 w-4" />
            My Computer Agent
          </TabsTrigger>
          <TabsTrigger value="server" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950">
            <Server className="mr-2 h-4 w-4" />
            Server Terminal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="min-h-0 overflow-auto rounded-3xl border border-white/10 bg-black/20 p-4">
          <LocalAgentPage />
        </TabsContent>

        <TabsContent value="server" className="min-h-0">
          <EmbeddedTerminal title="Server Terminal" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
