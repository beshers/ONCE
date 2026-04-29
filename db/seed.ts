import { getDb } from "../api/queries/connection";
import { badges } from "./schema";

const defaultBadges = [
  { name: "First Steps", description: "Created your first project", icon: "👣", color: "#00d4ff", requirementType: "projects_created", requirementValue: 1 },
  { name: "Project Starter", description: "Created 5 projects", icon: "🚀", color: "#10b981", requirementType: "projects_created", requirementValue: 5 },
  { name: "Project Master", description: "Created 20 projects", icon: "🏗️", color: "#f59e0b", requirementType: "projects_created", requirementValue: 20 },
  { name: "Snippet Sharer", description: "Shared your first code snippet", icon: "📋", color: "#8b5cf6", requirementType: "snippets_shared", requirementValue: 1 },
  { name: "Knowledge Spreader", description: "Shared 10 code snippets", icon: "📚", color: "#ec4899", requirementType: "snippets_shared", requirementValue: 10 },
  { name: "Social Coder", description: "Sent 50 messages", icon: "💬", color: "#3b82f6", requirementType: "messages_sent", requirementValue: 50 },
  { name: "Code Reviewer", description: "Reviewed code 5 times", icon: "🔍", color: "#f97316", requirementType: "code_reviews", requirementValue: 5 },
  { name: "Rising Star", description: "Earned 500 XP", icon: "⭐", color: "#eab308", requirementType: "xp", requirementValue: 500 },
  { name: "Expert Developer", description: "Earned 2000 XP", icon: "👑", color: "#dc2626", requirementType: "xp", requirementValue: 2000 },
  { name: "Legend", description: "Earned 5000 XP", icon: "🏆", color: "#fbbf24", requirementType: "xp", requirementValue: 5000 },
];

async function seed() {
  const db = getDb();
  console.log("Seeding badges...");
  for (const badge of defaultBadges) {
    try {
      await db.insert(badges).values(badge).onDuplicateKeyUpdate({ set: badge });
    } catch (e) {
      console.log(`Badge ${badge.name} might already exist`);
    }
  }
  console.log("Seed complete!");
}

seed().catch(console.error);
