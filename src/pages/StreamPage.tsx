import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Radio, Users, Eye, MessageSquare, Play, 
  Pause, StopCircle, Share2, Heart
} from "lucide-react";

const MOCK_STREAMS = [
  { 
    id: 1, 
    title: "Building a React Component Library", 
    streamer: "CodeMaster",
    status: "live",
    viewerCount: 156,
    projectId: 1,
    startedAt: "2026-04-28T09:00:00Z"
  },
  { 
    id: 2, 
    title: "Debugging Complex State Issues", 
    streamer: "DevNinja",
    status: "idle",
    viewerCount: 0,
    projectId: 2,
    startedAt: null
  },
];

export default function StreamPage() {
  const [activeStream, setActiveStream] = useState<number | null>(1);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Live Code Streaming</h1>
            <p className="text-slate-400 mt-1">Watch and collaborate on live coding sessions</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Radio className="w-4 h-4 mr-2" />
            Start Streaming
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stream Area */}
          <div className="lg:col-span-2">
            <Card className="bg-[#12121a] border-slate-800">
              <CardContent className="p-0">
                {/* Video Placeholder */}
                <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                  {activeStream === 1 ? (
                    <>
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <Badge className="bg-red-500 text-white">LIVE</Badge>
                        <span className="text-white font-medium">Building a React Component Library</span>
                      </div>
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <div className="flex items-center text-white bg-black/50 px-3 py-1 rounded-full">
                          <Eye className="w-4 h-4 mr-2" />
                          156
                        </div>
                      </div>
                      <div className="text-slate-400">Stream video would appear here</div>
                    </>
                  ) : (
                    <div className="text-slate-400">Select a stream to watch</div>
                  )}
                </div>
                
                {/* Stream Controls */}
                <div className="p-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" className="border-slate-700">
                        <Play className="w-4 h-4 mr-2" />
                        Join Stream
                      </Button>
                      <Button variant="outline" className="border-slate-700">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="border-slate-700">
                        <Heart className="w-4 h-4 mr-2" />
                        Like
                      </Button>
                      <Button variant="outline" className="border-slate-700">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stream Info */}
            <Card className="bg-[#12121a] border-slate-800 mt-4">
              <CardHeader>
                <CardTitle className="text-white">Stream Details</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-white text-lg font-medium">Building a React Component Library</h3>
                <p className="text-slate-400 mt-2">
                  Join CodeMaster as they build a comprehensive React component library from scratch.
                  Learn best practices for component design, TypeScript integration, and documentation.
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="outline" className="border-slate-700">React</Badge>
                  <Badge variant="outline" className="border-slate-700">TypeScript</Badge>
                  <Badge variant="outline" className="border-slate-700">Tutorial</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Live Streams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_STREAMS.map((stream) => (
                  <div
                    key={stream.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeStream === stream.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                    }`}
                    onClick={() => setActiveStream(stream.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stream.status === "live" && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span className="text-white font-medium">{stream.streamer}</span>
                      </div>
                      {stream.status === "live" ? (
                        <Badge className="bg-red-500/20 text-red-400">Live</Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-400">Offline</Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{stream.title}</p>
                    {stream.status === "live" && (
                      <div className="flex items-center gap-1 mt-2 text-slate-500 text-sm">
                        <Eye className="w-3 h-3" />
                        {stream.viewerCount} watching
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Your Streams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-4">You haven't started any streams yet.</p>
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                  <Radio className="w-4 h-4 mr-2" />
                  Go Live
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}