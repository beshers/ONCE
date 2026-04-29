import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PenTool, Eraser, Square, Circle, Type, Image, 
  Undo, Redo, Download, Trash2, Save, ZoomIn, ZoomOut
} from "lucide-react";

const TOOLS = [
  { id: "select", icon: null, label: "Select" },
  { id: "pen", icon: PenTool, label: "Pen" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
  { id: "image", icon: Image, label: "Image" },
];

const COLORS = [
  "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
  "#ff00ff", "#00ffff", "#ff8800", "#8800ff", "#00ff88",
];

export default function WhiteboardPage() {
  const [selectedTool, setSelectedTool] = useState("select");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [zoom, setZoom] = useState(100);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Whiteboard</h1>
            <p className="text-slate-400 mt-1">Real-time collaborative whiteboarding</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-700">
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button variant="outline" className="border-slate-700">
              <Redo className="w-4 h-4 mr-2" />
              Redo
            </Button>
            <Button variant="outline" className="border-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Tools Panel */}
          <Card className="bg-[#12121a] border-slate-800 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? "default" : "ghost"}
                  className={`w-full justify-start ${selectedTool === tool.id ? "bg-cyan-500" : ""}`}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  {tool.icon && <tool.icon className="w-4 h-4 mr-2" />}
                  {tool.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Canvas */}
          <Card className="bg-[#12121a] border-slate-800 lg:col-span-4">
            <CardContent className="p-0">
              <div 
                className="h-[600px] bg-white relative"
                style={{ 
                  backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  Click and drag to draw
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Panel */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-lg border-2 ${
                        selectedColor === color ? "border-cyan-500" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Zoom</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="icon" className="border-slate-700">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white">{zoom}%</span>
                  <Button variant="outline" size="icon" className="border-slate-700">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Canvas Size</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Width" defaultValue="1920" className="bg-slate-800 border-slate-700" />
                <Input placeholder="Height" defaultValue="1080" className="bg-slate-800 border-slate-700" />
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                  Resize Canvas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}