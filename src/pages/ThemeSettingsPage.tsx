import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme, themeConfig } from "@/providers/ThemeProvider";
import { 
  Sun, Moon, Contrast, Sparkles, Check
} from "lucide-react";

const themeIcons = {
  dark: Moon,
  light: Sun,
  'high-contrast': Contrast,
  soft: Sparkles,
};

export default function ThemeSettingsPage() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Theme Settings</h1>
          <p className="text-slate-400 mt-1">Customize the appearance of your workspace</p>
        </div>

        <Card className="bg-[#12121a] border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Select Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.entries(themes) as [string, typeof themes.dark][]).map(([key, config]) => {
                const Icon = themeIcons[key as keyof typeof themeIcons];
                const isActive = theme === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => setTheme(key as any)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isActive 
                        ? "border-cyan-500 bg-cyan-500/10" 
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.background }}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={{ color: config.primary }}
                        />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{config.name}</div>
                        <div className="text-slate-400 text-sm">Theme</div>
                      </div>
                      {isActive && (
                        <Check className="w-5 h-5 text-cyan-400 ml-auto" />
                      )}
                    </div>
                    
                    {/* Color Preview */}
                    <div className="flex gap-2 mt-2">
                      <div 
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: config.background }}
                      />
                      <div 
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: config.surface }}
                      />
                      <div 
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: config.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: config.text }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-slate-800 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Advanced Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">Reduce Motion</div>
                <div className="text-slate-400 text-sm">Minimize animations</div>
              </div>
              <Button variant="outline" className="border-slate-700">
                Toggle
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">Compact Mode</div>
                <div className="text-slate-400 text-sm">Reduce spacing</div>
              </div>
              <Button variant="outline" className="border-slate-700">
                Toggle
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">Font Size</div>
                <div className="text-slate-400 text-sm">Adjust text size</div>
              </div>
              <select className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}