import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bookmark, FolderOpen, Plus, Search, ExternalLink, 
  Trash2, Edit, Share2, MoreHorizontal
} from "lucide-react";

const MOCK_BOOKMARKS = [
  { id: 1, title: "React Documentation", url: "https://react.dev", description: "Official React docs", tags: ["react", "javascript"], collection: "Development" },
  { id: 2, title: "TypeScript Handbook", url: "https://typescriptlang.org", description: "Learn TypeScript", tags: ["typescript"], collection: "Development" },
  { id: 3, title: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Web development", tags: ["web", "html", "css"], collection: "Reference" },
];

const MOCK_COLLECTIONS = [
  { id: 1, name: "Development", color: "#00d4ff", count: 15 },
  { id: 2, name: "Reference", color: "#10b981", count: 8 },
  { id: 3, name: "Tools", color: "#f59e0b", count: 12 },
];

export default function BookmarksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Bookmarks & Collections</h1>
            <p className="text-slate-400 mt-1">Save and organize your favorite resources</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Bookmark
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Collections Sidebar */}
          <div className="space-y-4">
            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Collections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedCollection === null ? "default" : "ghost"}
                  className={`w-full justify-start ${selectedCollection === null ? "bg-cyan-500" : ""}`}
                  onClick={() => setSelectedCollection(null)}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  All Bookmarks
                  <Badge variant="secondary" className="ml-auto">{MOCK_BOOKMARKS.length}</Badge>
                </Button>
                {MOCK_COLLECTIONS.map((collection) => (
                  <Button
                    key={collection.id}
                    variant={selectedCollection === collection.name ? "default" : "ghost"}
                    className={`w-full justify-start ${selectedCollection === collection.name ? "bg-cyan-500" : ""}`}
                    onClick={() => setSelectedCollection(collection.name)}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" style={{ color: collection.color }} />
                    {collection.name}
                    <Badge variant="secondary" className="ml-auto">{collection.count}</Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["react", "typescript", "javascript", "web", "html", "css"].map((tag) => (
                    <Badge key={tag} variant="outline" className="border-slate-700 cursor-pointer hover:bg-slate-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookmarks Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_BOOKMARKS
                .filter(b => !selectedCollection || b.collection === selectedCollection)
                .map((bookmark) => (
                  <Card key={bookmark.id} className="bg-[#12121a] border-slate-800 hover:border-cyan-500/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{bookmark.title}</h3>
                          <p className="text-slate-400 text-sm mt-1">{bookmark.description}</p>
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 text-sm flex items-center mt-2 hover:underline"
                          >
                            {bookmark.url.replace("https://", "")}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                          <div className="flex gap-2 mt-3">
                            {bookmark.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="border-slate-700 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}