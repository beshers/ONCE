# Chat Features Implementation Plan

## Overview
Your php-backend already has a solid foundation with:
- `messages` table (text, code, file, image, voice types)
- `chatRooms` and `chatRoomMembers` tables
- Basic read receipts (`isRead` field)
- Notifications system

This document outlines implementation for all 20 requested features.

---

## Phase 1: Core Messaging Enhancements (Week 1)

### 1. Syntax Highlighting inside Chat Bubbles
**Backend:** Already supports `messageType: "code"` in schema
**Frontend:**
- Add Prism.js or Highlight.js to dependencies
- Create `<CodeMessage />` component that detects language from metadata
- Store language in message metadata: `JSON.stringify({ language: "typescript" })`

```typescript
// api/chatRouter.ts - Update send mutation
messageType: z.enum(["text", "code", "file", "image", "voice", "markdown"]).default("text"),
```

### 2. Threaded Conversations (Replies)
**Database:**
```sql
ALTER TABLE messages ADD COLUMN parent_id INT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN thread_reply_count INT DEFAULT 0;
```

**Backend:**
```typescript
// chatRouter.ts - Add endpoints
getThread: authedQuery.input(z.object({ parentId: z.number() }))
  .query(async ({ input }) => {
    // Return all replies to parent message
  }),

replyToMessage: authedQuery.input(z.object({
  parentId: z.number(),
  content: z.string().min(1),
  messageType: z.enum(["text", "code"]).default("text")
})).mutation(...)
```

**Frontend:**
- Add "Reply" button on hover
- Show reply count badge
- Expand thread inline or in modal

### 3. Emoji Reactions & Custom Developer Emojis
**Database:**
```sql
CREATE TABLE message_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_reaction (message_id, user_id, emoji)
);
```

**Backend:**
```typescript
addReaction: authedQuery.input(z.object({
  messageId: z.number(),
  emoji: z.string()
})).mutation(...)

removeReaction: authedQuery.input(z.object({
  messageId: z.number(),
  emoji: z.string()
})).mutation(...)
```

**Frontend:**
- Add emoji picker (use `emoji-picker-react`)
- Show reaction counts on messages
- Support custom developer emoji set

---

## Phase 2: Rich Content & Sharing (Week 2)

### 4. Direct "Share to Chat" from Editor
**Frontend:**
- Add "Share to Chat" button in editor toolbar
- When clicked, open chat modal with code snippet pre-filled

```typescript
// In editor component
const shareToChat = (code: string, language: string) => {
  navigate('/chat?share=true', { 
    state: { code, language } 
  });
};
```

### 5. Rich Link Previews (GitHub, StackOverflow, Jira)
**Backend:**
```typescript
// api/linkPreview.ts
import { metadata } from 'cheerio';

export async function fetchLinkPreview(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  return {
    title: $('meta[property="og:title"]').attr('content') || $('title').text(),
    description: $('meta[property="og:description"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    favicon: $('link[rel="icon"]').attr('href'),
    type: detectLinkType(url) // 'github' | 'stackoverflow' | 'jira' | 'generic'
  };
}
```

**Frontend:**
- Auto-detect URLs in messages
- Fetch preview on message render (debounced)
- Cache previews in localStorage

### 6. File & Asset Drag-and-Drop
**Frontend:**
- Add drop zone overlay to chat input
- Use File API for drag events
- Upload to server, send as `messageType: "file"`

```typescript
const handleDrop = async (e: React.DragEvent) => {
  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const { url } = await fetch('/api/upload', { method: 'POST', body: formData }).then(r => r.json());
    sendMessage({ content: url, messageType: 'file', metadata: JSON.stringify({ name: file.name, size: file.size }) });
  }
};
```

---

## Phase 3: Real-time Communication (Week 3)

### 7. Voice & Video Calls with Screen Sharing
**Tech Stack:** WebRTC with simple-peer or LiveKit

**Backend (Signaling):**
```typescript
// api/callRouter.ts
createCall: authedQuery.input(z.object({
  targetUserId: z.string(),
  type: z.enum(['voice', 'video'])
})).mutation(async ({ ctx, input }) => {
  const callId = generateId();
  // Store call in Redis with TTL
  await redis.setex(`call:${callId}`, 300, JSON.stringify({
    initiator: ctx.user.id,
    target: input.targetUserId,
    type: input.type,
    status: 'pending'
  }));
  return { callId };
});
```

**Frontend:**
- Use `simple-peer` for WebRTC
- Implement call UI with mute/video toggle
- Add screen sharing via `navigator.mediaDevices.getDisplayMedia()`

### 8. Read Receipts & Presence Indicators
**Already partially implemented** - Add real-time updates:

**Backend:**
```typescript
// Update user status on connect/disconnect
updatePresence: authedQuery.mutation(async ({ ctx }) => {
  await db.update(users).set({ 
    isOnline: true, 
    lastSeenAt: new Date() 
  }).where(eq(users.id, ctx.user.id));
});
```

**Frontend:**
- Use WebSocket to broadcast presence
- Show green/yellow/gray dot for online/away/offline
- "Last seen X minutes ago" for offline users

---

## Phase 4: Organization & Search (Week 4)

### 9. Message Search & Filtering
**Backend:**
```typescript
searchMessages: authedQuery.input(z.object({
  query: z.string(),
  roomId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  messageType: z.enum(['text', 'code', 'file', 'image']).optional(),
  limit: z.number().default(50)
})).query(async ({ ctx, input }) => {
  // Full-text search on messages.content
  // Filter by other criteria
});
```

**Frontend:**
- Search bar in chat header
- Filter dropdown (by type, date, room)
- Highlight matching text in results

### 10. Pinned Messages & Important Announcements
**Database:**
```sql
ALTER TABLE chat_rooms ADD COLUMN pinned_message_id INT DEFAULT NULL;
CREATE TABLE pinned_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  room_id INT NOT NULL,
  pinned_by VARCHAR(255) NOT NULL,
  pinned_at TIMESTAMP DEFAULT NOW()
);
```

**Frontend:**
- Pin icon on message hover (for room admins)
- Pinned messages section at top of chat
- Announcement banner style for important pins

### 11. Custom Chat Rooms (Public/Private/Project-based)
**Already supported** - `chatRooms.type` enum: `"direct", "group", "project"`

Enhancements:
- Room settings modal (name, description, avatar)
- Invite link generation
- Project-linked rooms auto-sync members

---

## Phase 5: AI & Automation (Week 5)

### 12. AI Chat Assistant for Debugging
**Integration:** Use existing AI (Kimi or add OpenAI)

```typescript
// api/aiChatRouter.ts
askAI: authedQuery.input(z.object({
  question: z.string(),
  context: z.object({
    code: z.string().optional(),
    error: z.string().optional(),
    language: z.string().optional()
  }).optional()
})).mutation(async ({ input }) => {
  const response = await aiService.debug(input.question, input.context);
  return { response };
});
```

**Frontend:**
- Floating AI button in chat
- Context menu: "Explain error", "Suggest fix", "Review code"
- Stream responses for long explanations

### 13. Slash Commands (/run, /deploy, /invite)
**Frontend:**
```typescript
const slashCommands = {
  '/run': { 
    action: (args) => runCode(args), 
    help: '/run [language] - Execute code snippet' 
  },
  '/deploy': { 
    action: (args) => deployProject(args), 
    help: '/deploy [project] - Deploy a project' 
  },
  '/invite': { 
    action: (args) => inviteUser(args), 
    help: '/invite @username - Invite user to room' 
  },
  '/task': {
    action: (args) => createTask(args),
    help: '/task [title] - Create task from message'
  }
};
```

---

## Phase 6: Notifications & Permissions (Week 6)

### 14. Mute & Notification Customization per Channel
**Database:**
```sql
CREATE TABLE channel_notifications (
  user_id VARCHAR(255) NOT NULL,
  room_id INT NOT NULL,
  mute_until TIMESTAMP NULL,
  notification_level ENUM('all', 'mentions', 'none') DEFAULT 'all',
  custom_sound VARCHAR(100),
  PRIMARY KEY (user_id, room_id)
);
```

**Frontend:**
- Room settings → Notifications tab
- Options: All messages, Mentions only, Custom schedule
- Sound selection dropdown

### 15. Granular Permission Settings (Roles)
**Database:**
```sql
ALTER TABLE chat_room_members ADD COLUMN role ENUM('owner', 'admin', 'moderator', 'member') DEFAULT 'member';
ALTER TABLE chat_room_members ADD COLUMN permissions JSON;
```

**Permissions structure:**
```json
{
  "canPinMessages": true,
  "canManageMembers": false,
  "canEditRoom": false,
  "canDeleteMessages": false,
  "canSilence": false
}
```

### 16. Direct Mentions (@user, @team, @here)
**Backend:**
```typescript
// Parse mentions in message content
const mentionRegex = /@(user|team|here)\[(\w+)\]/g;
// Store mentions in separate table
CREATE TABLE message_mentions (
  message_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  mention_type ENUM('user', 'team', 'here') NOT NULL,
  PRIMARY KEY (message_id, user_id)
);
```

**Frontend:**
- Autocomplete @ mentions in input
- @here notifies all online members
- @team notifies team members (from project)

---

## Phase 7: Advanced Features (Week 7-8)

### 17. Chat-to-Task Integration (Convert message to Issue)
**Backend:**
```typescript
messageToTask: authedQuery.input(z.object({
  messageId: z.number(),
  title: z.string().optional(), // defaults to message content
  projectId: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
})).mutation(async ({ ctx, input }) => {
  const message = await db.select().from(messages).where(eq(messages.id, input.messageId));
  // Create task in project_tasks table
  // Link back to message
});
```

**Frontend:**
- "Convert to Task" option on message context menu
- Task created with link to original message
- Updates notify original message author

### 18. End-to-End Encryption for Private DMs
**Implementation:**
- Use Web Crypto API for key generation
- Store public keys in user profile
- Encrypt message content before sending

```typescript
// Client-side encryption
const encryptMessage = async (message: string, recipientPublicKey: CryptoKey) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    recipientPublicKey,
    data
  );
  return { iv: Array.from(iv), content: Array.from(new Uint8Array(encrypted)) };
};
```

### 19. Translation Support for Global Teams
**Backend:**
```typescript
translateMessage: authedQuery.input(z.object({
  messageId: z.number(),
  targetLanguage: z.string()
})).query(async ({ input }) => {
  const message = await db.select().from(messages).where(eq(messages.id, input.messageId));
  const translated = await translationService.translate(message.content, input.targetLanguage);
  return { translated };
});
```

**Frontend:**
- Detect message language automatically
- Show "Translate" button on hover
- Use Google Translate API or LibreTranslate
- Cache translations

### 20. Custom Developer Emojis
**Database:**
```sql
CREATE TABLE custom_emojis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Frontend:**
- Emoji picker with "Developer" category
- Upload custom emoji (admin approval for global)
- Shortcode support: `:git-merge:`, `:pr-approved:`, etc.

---

## Implementation Priority Matrix

| Feature | Complexity | Dependencies | Priority |
|---------|------------|--------------|----------|
| Syntax Highlighting | Low | Prism.js | P0 |
| Threaded Replies | Medium | DB schema | P0 |
| Emoji Reactions | Medium | New table | P0 |
| Message Search | Medium | Full-text search | P1 |
| Read Receipts | Low | WebSocket | P1 |
| Rich Link Previews | Medium | Cheerio | P1 |
| File Drag-Drop | Medium | File upload API | P1 |
| Slash Commands | Medium | Command parser | P2 |
| Mentions | Medium | Parse + notify | P2 |
| Pinned Messages | Low | DB + UI | P2 |
| Custom Rooms | Low | Already exists | P2 |
| AI Debugger | High | AI API | P3 |
| Voice/Video | High | WebRTC | P3 |
| Presence | Low | WebSocket | P3 |
| Notifications | Medium | Settings UI | P3 |
| Permissions | Medium | RBAC | P4 |
| Task Integration | Medium | Projects | P4 |
| E2E Encryption | High | Web Crypto | P4 |
| Translation | Medium | Translation API | P4 |
| Custom Emojis | Low | Upload + CDN | P5 |

---

## Database Schema Changes Summary

```sql
-- Phase 1
ALTER TABLE messages ADD COLUMN parent_id INT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN thread_reply_count INT DEFAULT 0;
CREATE TABLE message_reactions (...);

-- Phase 4
ALTER TABLE chat_rooms ADD COLUMN pinned_message_id INT DEFAULT NULL;
CREATE TABLE pinned_messages (...);

-- Phase 6
CREATE TABLE channel_notifications (...);
ALTER TABLE chat_room_members ADD COLUMN role ENUM(...);
ALTER TABLE chat_room_members ADD COLUMN permissions JSON;
CREATE TABLE message_mentions (...);

-- Phase 7
CREATE TABLE custom_emojis (...);
```

---

## Next Steps

1. **Week 1:** Implement Phase 1 (Syntax highlighting, threads, reactions)
2. **Week 2:** Implement Phase 2 (Rich content, sharing)
3. **Week 3:** Implement Phase 3 (Real-time features)
4. **Week 4:** Implement Phase 4 (Search, pins, rooms)
5. **Week 5:** Implement Phase 5 (AI, slash commands)
6. **Week 6:** Implement Phase 6 (Notifications, permissions)
7. **Week 7-8:** Implement Phase 7 (Advanced features)

---

# Advanced Video Conferencing Features

## Overview
These 20 features transform the chat system into a full-featured video collaboration platform with integrated code sharing, live sync, and professional meeting capabilities.

---

## Phase VC-1: Core Video Infrastructure

### 1. Integrated Code Sharing & Live Sync during Calls
**Backend:**
```typescript
// api/callRouter.ts
import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { calls, callParticipants } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const callRouter = createRouter({
  // Create a call with code sharing enabled
  createCall: authedQuery
    .input(z.object({
      targetUserId: z.string().optional(),
      roomId: z.number().optional(),
      type: z.enum(["voice", "video"]).default("video"),
      enableCodeShare: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(calls).values({
        type: input.type,
        roomId: input.roomId,
        initiatorId: ctx.user.id,
        status: "pending",
        settings: JSON.stringify({ enableCodeShare: input.enableCodeShare })
      }).$returningId();
      
      // Add initiator as participant
      await db.insert(callParticipants).values({
        callId: id,
        userId: ctx.user.id,
        role: "host",
        status: "joined"
      });
      
      return { callId: id };
    }),

  // Share code snippet during call
  shareCode: authedQuery
    .input(z.object({
      callId: z.number(),
      code: z.string(),
      language: z.string().default("typescript"),
      cursorPosition: z.number().default(0),
      selectionRange: z.object({ start: z.number(), end: z.number() }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Store shared code in call session
      await db.update(calls).set({
        sharedCode: input.code,
        codeLanguage: input.language,
        codeCursorPosition: input.cursorPosition,
        codeSelectionRange: input.selectionRange ? JSON.stringify(input.selectionRange) : null
      }).where(and(eq(calls.id, input.callId), eq(calls.initiatorId, ctx.user.id)));
      
      return { success: true };
    }),

  // Get live shared code (polled by participants)
  getSharedCode: authedQuery
    .input(z.object({ callId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [call] = await db.select().from(calls).where(eq(calls.id, input.callId));
      return {
        code: call?.sharedCode,
        language: call?.codeLanguage,
        cursorPosition: call?.codeCursorPosition,
        selectionRange: call?.codeSelectionRange ? JSON.parse(call.codeSelectionRange) : null
      };
    })
});
```

**Frontend:**
- Real-time code editor overlay during calls
- WebSocket for live cursor sync
- Monaco Editor with collaborative editing

---

### 2. Remote Control (Request control of a teammate's cursor)
**Database:**
```sql
CREATE TABLE call_remote_control (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  host_user_id VARCHAR(255) NOT NULL,
  controller_user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'revoked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_call_control (call_id, controller_user_id)
);
```

**Backend:**
```typescript
requestControl: authedQuery.input(z.object({
  callId: z.number(),
  hostUserId: z.string()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  await db.insert(callRemoteControl).values({
    callId: input.callId,
    hostUserId: input.hostUserId,
    controllerUserId: ctx.user.id,
    status: 'pending'
  });
  // Notify host user
  return { success: true };
}),

respondToControl: authedQuery.input(z.object({
  requestId: z.number(),
  approve: z.boolean()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  await db.update(callRemoteControl)
    .set({ status: input.approve ? 'approved' : 'rejected' })
    .where(eq(callRemoteControl.id, input.requestId));
  return { success: true };
})
```

**Frontend:**
- "Request Control" button on participant video
- Host sees approval dialog
- Mouse/keyboard events forwarded via WebSocket

---

### 3. Persistent Virtual Meeting Rooms (Always-on "War Rooms")
**Database:**
```sql
ALTER TABLE chat_rooms ADD COLUMN has_permanent_call BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_rooms ADD COLUMN call_settings JSON;

CREATE TABLE permanent_calls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  status ENUM('active', 'paused', 'ended') DEFAULT 'active',
  settings JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP NULL
);
```

**Backend:**
```typescript
// Permanent room calls stay active 24/7
createPermanentCall: authedQuery.input(z.object({
  roomId: z.number()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  const [{ id }] = await db.insert(permanentCalls).values({
    roomId: input.roomId,
    hostId: ctx.user.id,
    status: 'active'
  }).$returningId();
  
  await db.update(chatRooms)
    .set({ hasPermanentCall: true })
    .where(eq(chatRooms.id, input.roomId));
  
  return { callId: id };
}),

getPermanentCall: authedQuery.input(z.object({
  roomId: z.number()
})).query(async ({ input }) => {
  const db = getDb();
  const [call] = await db.select().from(permanentCalls)
    .where(and(eq(permanentCalls.roomId, input.roomId), eq(permanentCalls.status, 'active')));
  return call;
})
```

**Frontend:**
- "War Room" badge on persistent rooms
- Join button always visible
- Auto-reconnect on page refresh

---

### 4. High-Fidelity Screen Sharing (60 FPS / 4K support)
**Frontend (WebRTC config):**
```typescript
const screenShareConstraints = {
  video: {
    displaySurface: 'monitor', // Request screen, not window
    width: { ideal: 3840 },    // 4K
    height: { ideal: 2160 },
    frameRate: { ideal: 60, max: 60 }
  },
  audio: false
};

// For window sharing (lower bandwidth)
const windowShareConstraints = {
  video: {
    displaySurface: 'browser',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: true // Include system audio
};

const startScreenShare = async (type: 'screen' | 'window' = 'screen') => {
  const stream = await navigator.mediaDevices.getDisplayMedia(
    type === 'screen' ? screenShareConstraints : windowShareConstraints
  );
  return stream;
};
```

**Backend (SFU consideration):**
- Use MediaSoup or Janus WebRTC gateway for SFU
- Support simulcast layers: 360p, 720p, 1080p, 4K
- Adaptive bitrate based on network conditions

---

### 5. Noise Cancellation & Background Blur
**Frontend:**
```typescript
import { AIVisualizer } from '@doubtfire-labs/audio-processing';

// Web Audio API with noise suppression
const applyNoiseCancellation = (audioStream: MediaStream) => {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(audioStream);
  
  // Use WebRTC's built-in noise suppression
  const audioTrack = audioStream.getAudioTracks()[0];
  const constraints = audioTrack.getSettings();
  
  // Request noise suppression if available
  if (constraints.noiseSuppression) {
    // Already handled by browser
    return audioStream;
  }
  
  // Fallback: Use noise suppressor node
  const noiseSuppressor = audioContext.createDynamicsCompressor();
  source.connect(noiseSuppressor);
  noiseSuppressor.connect(audioContext.destination);
  
  return audioStream;
};

// Background blur using TensorFlow.js body segmentation
const applyBackgroundBlur = (videoStream: MediaStream) => {
  const model = await BodyPix.load();
  const video = document.createElement('video');
  video.srcObject = videoStream;
  
  // Process frames with BodyPix
  // Apply blur to background segments
  // Return processed stream
};
```

**Alternative:** Use @doubtfire-labs/audio-processing for RNNoise

---

### 6. Live Transcript & Automated Meeting Minutes
**Backend:**
```typescript
// api/transcriptRouter.ts
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_KEY });

export const transcriptRouter = createRouter({
  // Start real-time transcription
  startTranscription: authedQuery.input(z.object({
    callId: z.number()
  })).mutation(async ({ input }) => {
    // Create AssemblyAI real-time transcript
    const transcript = await client.transcripts.create({
      audio_url: `wss://your-server/calls/${input.callId}/audio`,
      speaker_labels: true,
      auto_chapters: true
    });
    return { transcriptId: transcript.id };
  }),

  // Get live transcript
  getLiveTranscript: authedQuery.input(z.object({
    callId: z.number()
  })).query(async ({ input }) => {
    const db = getDb();
    const transcripts = await db.select().from(callTranscripts)
      .where(eq(callTranscripts.callId, input.callId))
      .orderBy(callTranscripts.timestamp);
    return transcripts;
  }),

  // Generate meeting minutes
  generateMinutes: authedQuery.input(z.object({
    callId: z.number()
  })).mutation(async ({ input }) => {
    const db = getDb();
    const transcripts = await db.select().from(callTranscripts)
      .where(eq(callTranscripts.callId, input.callId));
    
    const fullText = transcripts.map(t => t.text).join(' ');
    
    // Use AI to summarize
    const summary = await aiService.summarize(`Generate meeting minutes from:
      ${fullText}
      
      Include: Key decisions, Action items, Participants, Next steps`);
    
    // Store minutes
    await db.insert(callMinutes).values({
      callId: input.callId,
      content: summary,
      generatedAt: new Date()
    });
    
    return { summary };
  })
});
```

**Database:**
```sql
CREATE TABLE call_transcripts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  speaker_name VARCHAR(100),
  text TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  confidence FLOAT
);

CREATE TABLE call_minutes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  content TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 7. In-Call Technical Drawing & Annotation Tools
**Frontend:**
```typescript
// Canvas-based annotation overlay
import { Fabric } from 'fabric';

const AnnotationCanvas = ({ stream }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  useEffect(() => {
    fabricRef.current = new Fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      freeDrawingBrush: new Fabric.PencilBrush()
    });
  }, []);

  const tools = [
    { name: 'pen', color: '#ff0000', size: 3 },
    { name: 'highlighter', color: '#ffff00', size: 20 },
    { name: 'arrow', type: 'line' },
    { name: 'rectangle', type: 'rect' },
    { name: 'text', type: 'i-text' },
    { name: 'eraser' }
  ];

  const broadcastAnnotation = (annotation) => {
    // Send via WebSocket to other participants
    socket.emit('annotation', { callId, annotation });
  };

  return (
    <div className="annotation-layer">
      <canvas ref={canvasRef} />
      <Toolbar tools={tools} />
    </div>
  );
};
```

**Backend:**
```typescript
// Broadcast annotations to all participants
broadcastAnnotation: authedQuery.input(z.object({
  callId: z.number(),
  annotation: z.object({
    type: z.string(),
    data: z.any()
  })
})).mutation(async ({ ctx, input }) => {
  // Publish to Redis channel for call
  await redis.publish(`call:${input.callId}:annotations`, {
    userId: ctx.user.id,
    annotation: input.annotation
  });
})
```

---

### 8. Breakout Rooms for Sub-Teams
**Database:**
```sql
CREATE TABLE breakout_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_call_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE breakout_room_members (
  breakout_room_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (breakout_room_id, user_id)
);
```

**Backend:**
```typescript
createBreakoutRoom: authedQuery.input(z.object({
  parentCallId: z.number(),
  name: z.string(),
  memberIds: z.array(z.string())
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  const [{ id }] = await db.insert(breakoutRooms).values({
    parentCallId: input.parentCallId,
    name: input.name,
    createdBy: ctx.user.id
  }).$returningId();

  // Add members
  for (const userId of input.memberIds) {
    await db.insert(breakoutRoomMembers).values({
      breakoutRoomId: id,
      userId
    });
  }

  // Create mini call for breakout
  const [{ callId }] = await db.insert(calls).values({
    type: 'video',
    breakoutRoomId: id,
    status: 'active'
  }).$returningId();

  return { breakoutRoomId: id, callId };
}),

joinBreakoutRoom: authedQuery.input(z.object({
  breakoutRoomId: z.number()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  const [breakout] = await db.select().from(breakoutRooms)
    .where(eq(breakoutRooms.id, input.breakoutRoomId));
  
  const [call] = await db.select().from(calls)
    .where(eq(calls.breakoutRoomId, input.breakoutRoomId));
  
  return { callId: call.id };
})
```

**Frontend:**
- Host creates breakout rooms with drag-drop participants
- Timer for breakout sessions
- "Return to main room" button
- Auto-return when time expires

---

### 9. Call Recording with Searchable Transcripts
**Backend:**
```typescript
startRecording: authedQuery.input(z.object({
  callId: z.number()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  
  // Update call status
  await db.update(calls).set({
    isRecording: true,
    recordingStartedAt: new Date()
  }).where(eq(calls.id, input.callId));

  // Start media recording job (use FFmpeg or cloud service)
  await recordingService.start({
    callId: input.callId,
    outputFormat: 'mp4',
    quality: '1080p'
  });

  return { success: true };
}),

stopRecording: authedQuery.input(z.object({
  callId: z.number()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  
  const recording = await recordingService.stop(input.callId);
  
  // Save recording metadata
  await db.insert(callRecordings).values({
    callId: input.callId,
    url: recording.url,
    duration: recording.duration,
    size: recording.size,
    transcriptId: recording.transcriptId
  });

  return { recording };
}),

searchRecordings: authedQuery.input(z.object({
  callId: z.number().optional(),
  query: z.string(),
  fromDate: z.string().optional()
})).query(async ({ input }) => {
  const db = getDb();
  // Full-text search on transcripts
  const results = await db.select({
    recording: callRecordings,
    transcript: callTranscripts
  }).from(callRecordings)
    .leftJoin(callTranscripts, eq(callRecordings.callId, callTranscripts.callId))
    .where(sql`MATCH(transcript.text) AGAINST(${input.query} IN BOOLEAN MODE)`);
  
  return results;
})
```

**Database:**
```sql
CREATE TABLE call_recordings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  duration INT DEFAULT 0,
  size BIGINT DEFAULT 0,
  transcript_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 10. Floating "Picture-in-Picture" Mode for Coding
**Frontend:**
```typescript
// Use WebRTC PiP API
const enablePiP = async (videoElement: HTMLVideoElement) => {
  try {
    if (document.pictureInPictureEnabled) {
      await videoElement.requestPictureInPicture();
    }
  } catch (error) {
    console.error('PiP not supported:', error);
  }
};

// Custom PiP for code sharing
const CodeSharePiP = () => {
  const [isPiP, setIsPiP] = useState(false);

  const enterPiP = () => {
    // Create floating window
    const pipWindow = window.open('', 'CodeShare', 'width=600,height=400');
    pipWindow.document.write(`
      <html>
        <head>
          <title>Code Share</title>
          <script src="https://cdn.monaco-editor.com/min/vs/loader.js"></script>
        </head>
        <body>
          <div id="editor" style="height:100vh"></div>
          <script>
            require.config({ paths: { vs: 'https://cdn.monaco-editor.com/min/vs' }});
            require(['vs/editor/editor.main'], function() {
              var editor = monaco.editor.create(document.getElementById('editor'), {
                value: '${sharedCode}',
                language: '${language}',
                readOnly: true
              });
            });
          </script>
        </body>
      </html>
    `);
    setIsPiP(true);
  };

  return (
    <button onClick={enterPiP}>
      <Icon name="pip" /> Picture-in-Picture
    </button>
  );
};
```

---

### 11. One-Click "Jump into Call" from Code Lines
**Frontend:**
```typescript
// In code editor, add gutter button
const CodeGutterActions = ({ lineNumber, code }) => {
  const startCallWithContext = async () => {
    // Get context: 5 lines before and after
    const context = await editor.getLinesContext(lineNumber, 5);
    
    // Create call with code context
    const { callId } = await api.calls.createCall({
      type: 'video',
      codeContext: JSON.stringify({ lineNumber, code: context })
    });
    
    // Navigate to call
    navigate(`/call/${callId}`);
  };

  return (
    <button 
      className="gutter-call-btn"
      onClick={startCallWithContext}
      title="Start call about this code"
    >
      📞
    </button>
  );
};

// Right-click context menu
editor.addAction({
  id: 'start-call-about-code',
  label: 'Start Call About This',
  contextMenuGroupId: 'navigation',
  run: (ed) => {
    const selection = ed.getSelection();
    const code = ed.getModel().getValueInRange(selection);
    startCallWithContext(code);
  }
});
```

---

### 12. Meeting Scheduling with Calendar Sync
**Database:**
```sql
CREATE TABLE scheduled_meetings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  host_id VARCHAR(255) NOT NULL,
  room_id INT,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  recurrence ENUM('none', 'daily', 'weekly', 'monthly') DEFAULT 'none',
  calendar_event_id VARCHAR(255),
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE meeting_participants (
  meeting_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
  notified_at TIMESTAMP,
  PRIMARY KEY (meeting_id, user_id)
);
```

**Backend:**
```typescript
scheduleMeeting: authedQuery.input(z.object({
  title: z.string(),
  description: z.string().optional(),
  roomId: z.number().optional(),
  startTime: z.string(), // ISO datetime
  endTime: z.string(),
  timezone: z.string().default('UTC'),
  participantIds: z.array(z.string()),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  calendarSync: z.boolean().default(false)
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  
  const [{ id }] = await db.insert(scheduledMeetings).values({
    title: input.title,
    description: input.description,
    hostId: ctx.user.id,
    roomId: input.roomId,
    scheduledStart: new Date(input.startTime),
    scheduledEnd: new Date(input.endTime),
    timezone: input.timezone,
    recurrence: input.recurrence
  }).$returningId();

  // Add participants
  for (const userId of input.participantIds) {
    await db.insert(meetingParticipants).values({
      meetingId: id,
      userId,
      status: 'pending'
    });
    
    // Send notification
    await notificationService.send(userId, {
      type: 'meeting_invite',
      meetingId: id,
      title: `Meeting: ${input.title}`,
      link: `/meetings/${id}`
    });
  }

  // Calendar sync (Google Calendar API)
  if (input.calendarSync) {
    const calendarEvent = await calendarService.createEvent({
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startTime, timeZone: input.timezone },
      end: { dateTime: input.endTime, timeZone: input.timezone },
      attendees: input.participantIds.map(id => ({ email: `${id}@local` }))
    });
    
    await db.update(scheduledMeetings)
      .set({ calendarEventId: calendarEvent.id })
      .where(eq(scheduledMeetings.id, id));
  }

  return { meetingId: id };
}),

// Calendar webhook for updates
calendarWebhook: createRouter().mutation(async ({ req }) => {
  const event = req.body;
  // Sync Google Calendar changes to local meetings
  await syncMeetingFromCalendar(event);
})
```

**Frontend:**
- Calendar view with meeting slots
- Drag to create meeting
- Google Calendar / Outlook sync
- Reminder notifications

---

### 13. In-Call File & Code Snippet Sharing
**Frontend:**
```typescript
// During call, share files/snippets
const CallSharePanel = ({ callId }) => {
  const [files, setFiles] = useState([]);
  const [snippets, setSnippets] = useState([]);

  const shareFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { url } = await fetch('/api/calls/share-file', {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    // Broadcast to call participants
    socket.emit('call:share', {
      callId,
      type: 'file',
      data: { name: file.name, url, size: file.size }
    });
  };

  const shareSnippet = async (code: string, language: string) => {
    await api.calls.shareCode(callId, code, language);
  };

  return (
    <div className="share-panel">
      <Tab file="Files">
        <DropZone onDrop={shareFile} />
        <FileList files={files} />
      </Tab>
      <Tab file="Snippets">
        <CodeSnippetPicker onSelect={shareSnippet} />
      </Tab>
    </div>
  );
};
```

---

### 14. Background Code Execution during Screen Share
**Frontend:**
```typescript
// Execute code in sandbox while sharing screen
const CodeExecutionPanel = ({ callId }) => {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async (code: string, language: string) => {
    setIsRunning(true);
    
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });

    const result = await response.json();
    setOutput(result.output);
    setIsRunning(false);

    // Broadcast output to call
    socket.emit('call:code-output', {
      callId,
      output: result.output,
      error: result.error
    });
  };

  return (
    <div className="execution-panel">
      <Editor language="javascript" onRun={runCode} />
      <OutputConsole output={output} />
    </div>
  );
};
```

**Backend:**
```typescript
executeCode: authedQuery.input(z.object({
  code: z.string(),
  language: z.enum(['javascript', 'python', 'typescript', 'go', 'rust'])
})).mutation(async ({ input }) => {
  // Use Piston API for code execution
  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: input.language,
      version: '*',
      files: [{ content: input.code }]
    })
  });

  const result = await response.json();
  return {
    output: result.run?.output || '',
    error: result.run?.stderr || '',
    exitCode: result.run?.code
  };
})
```

---

### 15. Speaker Tracking & Active Talker Highlighting
**Frontend:**
```typescript
// Audio analysis for speaker detection
const SpeakerTracker = ({ callId, participants }) => {
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  useEffect(() => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    // Analyze audio levels from each participant stream
    const analyzeSpeakers = async () => {
      for (const participant of participants) {
        const stream = participant.stream;
        if (!stream) continue;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        participant.audioLevel = average;
      }

      // Find loudest speaker
      const loudest = participants.reduce((prev, current) => 
        (current.audioLevel > prev.audioLevel) ? current : prev
      );
      
      if (loudest.audioLevel > threshold) {
        setActiveSpeaker(loudest.userId);
      }
    };

    const interval = setInterval(analyzeSpeakers, 100);
    return () => clearInterval(interval);
  }, [participants]);

  return (
    <div className="video-grid">
      {participants.map(p => (
        <VideoTile 
          key={p.userId}
          participant={p}
          isActive={p.userId === activeSpeaker}
          activeSpeakerBorder={p.userId === activeSpeaker}
        />
      ))}
    </div>
  );
};
```

**Backend:**
```typescript
// Broadcast active speaker to all
broadcastActiveSpeaker: authedQuery.input(z.object({
  callId: z.number(),
  activeSpeakerId: z.string()
})).mutation(async ({ input }) => {
  await redis.publish(`call:${input.callId}:speakers`, {
    activeSpeakerId: input.activeSpeakerId,
    timestamp: Date.now()
  });
})
```

---

### 16. Bandwidth Optimization for Slow Connections
**Frontend:**
```typescript
// Adaptive quality based on bandwidth
class BandwidthOptimizer {
  private connection: RTCPeerConnection;
  private bitrateMonitor: number[] = [];

  async measureBandwidth(): Promise<number> {
    const stats = await this.connection.getStats();
    let bytesReceived = 0;
    
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        bytesReceived += report.bytesReceived;
      }
    });

    // Calculate bitrate over 1 second
    await new Promise(r => setTimeout(r, 1000));
    const newStats = await this.connection.getStats();
    let newBytes = 0;
    newStats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        newBytes += report.bytesReceived;
      }
    });

    return (newBytes - bytesReceived) * 8 / 1000; // kbps
  }

  async adjustQuality() {
    const bitrate = await this.measureBandwidth();
    
    const qualityMap = [
      { min: 2000, res: '1080p', fps: 30 },
      { min: 1000, res: '720p', fps: 30 },
      { min: 500, res: '480p', fps: 24 },
      { min: 200, res: '360p', fps: 15 },
      { min: 0, res: '180p', fps: 10 }
    ];

    const settings = qualityMap.find(q => bitrate >= q.min);
    await this.setEncodingParameters(settings);
  }

  private async setEncodingParameters(settings: any) {
    const senders = this.connection.getSenders();
    for (const sender of senders) {
      const params = sender.getParameters();
      if (!params.encodings) continue;
      
      params.encodings[0].maxBitrate = settings.min * 1000;
      params.encodings[0].maxFramerate = settings.fps;
      await sender.setParameters(params);
    }
  }
}
```

---

### 17. Live Polling & Reaction Overlays
**Database:**
```sql
CREATE TABLE call_polls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  question VARCHAR(500) NOT NULL,
  options JSON NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_votes (
  poll_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  option_index INT NOT NULL,
  voted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE call_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reaction VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
createPoll: authedQuery.input(z.object({
  callId: z.number(),
  question: z.string(),
  options: z.array(z.string()),
  durationMinutes: z.number().default(5)
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  const [{ id }] = await db.insert(callPolls).values({
    callId: input.callId,
    question: input.question,
    options: JSON.stringify(input.options),
    createdBy: ctx.user.id,
    endsAt: new Date(Date.now() + input.durationMinutes * 60000)
  }).$returningId();

  return { pollId: id };
}),

vote: authedQuery.input(z.object({
  pollId: z.number(),
  optionIndex: z.number()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  await db.insert(pollVotes).values({
    pollId: input.pollId,
    userId: ctx.user.id,
    optionIndex: input.optionIndex
  }).onDuplicateKeyUpdate({ set: { optionIndex: input.optionIndex } });
  
  return { success: true };
}),

addReaction: authedQuery.input(z.object({
  callId: z.number(),
  reaction: z.string() // emoji
})).mutation(async ({ ctx, input }) => {
  await db.insert(callReactions).values({
    callId: input.callId,
    userId: ctx.user.id,
    reaction: input.reaction
  });
})
```

**Frontend:**
- Floating reaction animations (like Twitch)
- Live poll results bar chart
- Quick reaction buttons: 👍 ❤️ 🎉 🔥 😂 😮

---

### 18. Custom Call Backgrounds (IDE-themed)
**Frontend:**
```typescript
const BackgroundPicker = () => {
  const backgrounds = [
    { id: 'vscode-dark', name: 'VS Code Dark', url: '/backgrounds/vscode-dark.jpg' },
    { id: 'jetbrains', name: 'JetBrains', url: '/backgrounds/jetbrains.png' },
    { id: 'matrix', name: 'Matrix', url: '/backgrounds/matrix.gif' },
    { id: 'github', name: 'GitHub', url: '/backgrounds/github.png' },
    { id: 'custom', name: 'Upload Custom', url: null }
  ];

  const applyBackground = async (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const processor = new MediaStreamTrackProcessor({ track: videoTrack });
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });
    
    // Use TensorFlow.js for background replacement
    const model = await SelfieSegmentation.load();
    const transformer = new BackgroundEffect(processor, generator, model, backgroundImage);
    
    return new MediaStream([generator, ...stream.getAudioTracks()]);
  };

  return (
    <div className="background-picker">
      {backgrounds.map(bg => (
        <button key={bg.id} onClick={() => selectBackground(bg)}>
          <img src={bg.url} alt={bg.name} />
        </button>
      ))}
    </div>
  );
};
```

---

### 19. End-to-End Encrypted Voice & Video
**Frontend:**
```typescript
// E2E encryption using Web Crypto API
class E2EVideoCall {
  private keyPair: CryptoKeyPair;
  
  async generateKeys(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'encrypt', 'decrypt']
    );
  }

  async deriveSharedKey(theirPublicKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      { name: 'ECDH', public: theirPublicKey },
      this.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptFrame(frame: RTCVideoFrame, sharedKey: CryptoKey): Promise<ArrayBuffer> {
    const frameData = frame.data;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      frameData
    );
    
    return concat(iv, encrypted);
  }

  async decryptFrame(encryptedData: ArrayBuffer, sharedKey: CryptoKey): Promise<ArrayBuffer> {
    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);
    
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      data
    );
  }
}
```

**Key Exchange:**
- Use ECDH for key exchange
- Store public keys in user profiles
- Signal keys via WebSocket before call starts

---

### 20. Guest Access via Secure Links
**Backend:**
```typescript
generateGuestLink: authedQuery.input(z.object({
  callId: z.number(),
  expiresIn: z.number().default(24), // hours
  maxUses: z.number().default(10),
  guestName: z.string().optional()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + input.expiresIn * 3600000);
  
  await db.insert(guestAccessLinks).values({
    callId: input.callId,
    token,
    createdBy: ctx.user.id,
    expiresAt,
    maxUses: input.maxUses,
    guestName: input.guestName
  });

  const link = `${process.env.BASE_URL}/call/join?token=${token}`;
  return { link, expiresAt, maxUses };
}),

// Verify guest access
verifyGuestAccess: createRouter().input(z.object({
  token: z.string()
})).query(async ({ input }) => {
  const db = getDb();
  const [link] = await db.select().from(guestAccessLinks)
    .where(and(
      eq(guestAccessLinks.token, input.token),
      sql`expires_at > NOW()`,
      sql`used_count < max_uses`
    ));

  if (!link) throw new Error('Invalid or expired link');

  return { callId: link.callId, guestName: link.guestName };
}),

// Join as guest (limited permissions)
joinAsGuest: createRouter().input(z.object({
  token: z.string(),
  guestName: z.string()
})).mutation(async ({ input }) => {
  const db = getDb();
  
  // Verify and increment usage
  await db.execute(sql`
    UPDATE guest_access_links 
    SET used_count = used_count + 1 
    WHERE token = ${input.token} 
    AND used_count < max_uses 
    AND expires_at > NOW()
  `);

  // Create temporary guest user
  const guestId = `guest_${crypto.randomBytes(8).toString('hex')}`;
  
  return { 
    guestId, 
    callId: (await verifyGuestAccess({ token: input.token })).callId 
  };
})
```

**Database:**
```sql
CREATE TABLE guest_access_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_by VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INT DEFAULT 10,
  used_count INT DEFAULT 0,
  guest_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Frontend:**
- Guest sees limited UI (no settings, no recording controls)
- "Guest" badge on their video
- Auto-kick when link expires

---

## Video Conferencing Implementation Priority

| Feature | Complexity | Priority |
|---------|------------|----------|
| Integrated Code Sharing & Live Sync | High | P0 |
| Remote Control | Medium | P1 |
| Persistent War Rooms | Medium | P1 |
| High-Fidelity Screen Share | High | P0 |
| Noise Cancellation & Background Blur | Medium | P1 |
| Live Transcript & Meeting Minutes | High | P2 |
| In-Call Drawing & Annotation | Medium | P2 |
| Breakout Rooms | Medium | P2 |
| Recording with Transcripts | High | P1 |
| Floating PiP Mode | Low | P2 |
| Jump into Call from Code | Low | P1 |
| Meeting Scheduling & Calendar | High | P2 |
| File & Snippet Sharing | Medium | P1 |
| Background Code Execution | Medium | P2 |
| Speaker Tracking | Medium | P2 |
| Bandwidth Optimization | High | P2 |
| Live Polling & Reactions | Low | P2 |
| Custom Backgrounds | Low | P3 |
| E2E Encryption | High | P3 |
| Guest Access Links | Medium | P1 |

---

## Database Schema Summary (Video Features)

```sql
-- Core calls table (extend existing)
ALTER TABLE calls ADD COLUMN is_recording BOOLEAN DEFAULT FALSE;
ALTER TABLE calls ADD COLUMN shared_code TEXT;
ALTER TABLE calls ADD COLUMN code_language VARCHAR(20);
ALTER TABLE calls ADD COLUMN code_cursor_position INT;
ALTER TABLE calls ADD COLUMN code_selection_range JSON;

-- Remote control
CREATE TABLE call_remote_control (...);

-- Permanent rooms
CREATE TABLE permanent_calls (...);

-- Transcripts & minutes
CREATE TABLE call_transcripts (...);
CREATE TABLE call_minutes (...);
CREATE TABLE call_recordings (...);

-- Breakout rooms
CREATE TABLE breakout_rooms (...);
CREATE TABLE breakout_room_members (...);

-- Scheduling
CREATE TABLE scheduled_meetings (...);
CREATE TABLE meeting_participants (...);

-- Polls & reactions
CREATE TABLE call_polls (...);
CREATE TABLE poll_votes (...);
CREATE TABLE call_reactions (...);

-- Guest access
CREATE TABLE guest_access_links (...);
```

---

---

# Settings & Preferences Features

## Overview
These 20 features provide comprehensive user control over privacy, customization, security, and accessibility settings for the platform.

---

## Phase S-1: Privacy & Security

### 1. Granular Privacy Controls (Visibility of profile, code, and activity)
**Database:**
```sql
CREATE TABLE privacy_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  profile_visibility ENUM('public', 'team', 'private') DEFAULT 'team',
  code_visibility ENUM('public', 'team', 'private') DEFAULT 'team',
  activity_visibility ENUM('public', 'team', 'private') DEFAULT 'team',
  show_online_status BOOLEAN DEFAULT TRUE,
  show_last_seen BOOLEAN DEFAULT TRUE,
  show_stats BOOLEAN DEFAULT TRUE,
  allow_direct_messages ENUM('everyone', 'team', 'none') DEFAULT 'everyone',
  show_in_search BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const settingsRouter = createRouter({
  getPrivacySettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(privacySettings)
      .where(eq(privacySettings.userId, ctx.user.id));
    return settings || defaultPrivacySettings;
  }),

  updatePrivacySettings: authedQuery.input(z.object({
    profileVisibility: z.enum(['public', 'team', 'private']).optional(),
    codeVisibility: z.enum(['public', 'team', 'private']).optional(),
    activityVisibility: z.enum(['public', 'team', 'private']).optional(),
    showOnlineStatus: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
    showStats: z.boolean().optional(),
    allowDirectMessages: z.enum(['everyone', 'team', 'none']).optional(),
    showInSearch: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(privacySettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  })
});
```

**Frontend:**
- Privacy dashboard with toggles
- Preview as different visibility levels
- Activity log of visibility changes

---

### 2. Custom Keybinding Remapping (Full keyboard shortcut customization)
**Database:**
```sql
CREATE TABLE user_keybindings (
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  keybinding VARCHAR(100) NOT NULL,
  PRIMARY KEY (user_id, action)
);

-- Default keybindings
INSERT INTO user_keybindings (action, keybinding) VALUES
  ('save_file', 'Ctrl+S'),
  ('run_code', 'Ctrl+Enter'),
  ('toggle_terminal', 'Ctrl+`'),
  ('search_files', 'Ctrl+P'),
  ('global_search', 'Ctrl+Shift+F'),
  ('new_file', 'Ctrl+N'),
  ('close_tab', 'Ctrl+W'),
  ('format_code', 'Ctrl+Shift+I'),
  ('toggle_sidebar', 'Ctrl+B'),
  ('comment_line', 'Ctrl+/');
```

**Backend:**
```typescript
getKeybindings: authedQuery.query(async ({ ctx }) => {
  const db = getDb();
  const bindings = await db.select().from(userKeybindings)
    .where(eq(userKeybindings.userId, ctx.user.id));
  
  // Merge with defaults
  return { ...defaultKeybindings, ...Object.fromEntries(bindings.map(b => [b.action, b.keybinding])) };
}),

updateKeybinding: authedQuery.input(z.object({
  action: z.string(),
  keybinding: z.string()
})).mutation(async ({ ctx, input }) => {
  const db = getDb();
  await db.insert(userKeybindings).values({
    userId: ctx.user.id,
    action: input.action,
    keybinding: input.keybinding
  }).onDuplicateKeyUpdate({ set: { keybinding: input.keybinding } });
  return { success: true };
}),

resetKeybindings: authedQuery.mutation(async ({ ctx }) => {
  const db = getDb();
  await db.delete(userKeybindings).where(eq(userKeybindings.userId, ctx.user.id));
  return { success: true };
})
```

**Frontend:**
- Visual keybinding editor
- Conflict detection
- Import/export keybinding presets
- "Press key" capture mode

---

### 3. API Key & Secret Management (Secure storage for tokens and environment variables)
**Database:**
```sql
CREATE TABLE user_secrets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  encrypted_value TEXT NOT NULL,
  description VARCHAR(255),
  environment ENUM('development', 'staging', 'production') DEFAULT 'development',
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_secret_name (user_id, name)
);
```

**Backend:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ENCRYPTION_KEY = process.env.SECRETS_KEY; // Derived key
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, authTagHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

export const secretsRouter = createRouter({
  listSecrets: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const secrets = await db.select({
      id: userSecrets.id,
      name: userSecrets.name,
      description: userSecrets.description,
      environment: userSecrets.environment,
      lastUsedAt: userSecrets.lastUsedAt,
      expiresAt: userSecrets.expiresAt,
      createdAt: userSecrets.createdAt
    }).from(userSecrets).where(eq(userSecrets.userId, ctx.user.id));
    return secrets;
  }),

  createSecret: authedQuery.input(z.object({
    name: z.string().min(1).max(100),
    value: z.string(),
    description: z.string().optional(),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    expiresAt: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const encrypted = encrypt(input.value);
    await db.insert(userSecrets).values({
      userId: ctx.user.id,
      name: input.name,
      encryptedValue: encrypted,
      description: input.description,
      environment: input.environment,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
    });
    return { success: true };
  }),

  getSecret: authedQuery.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = getDb();
    const [secret] = await db.select().from(userSecrets)
      .where(and(eq(userSecrets.id, input.id), eq(userSecrets.userId, ctx.user.id)));
    
    if (!secret) throw new Error('Secret not found');
    
    // Update last used
    await db.update(userSecrets).set({ lastUsedAt: new Date() })
      .where(eq(userSecrets.id, input.id));
    
    return { value: decrypt(secret.encryptedValue) };
  }),

  deleteSecret: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(userSecrets).where(
      and(eq(userSecrets.id, input.id), eq(userSecrets.userId, ctx.user.id))
    );
    return { success: true };
  })
});
```

**Frontend:**
- Secret manager UI with copy button
- Environment selector (dev/staging/prod)
- Expiration warnings
- Audit log of secret access

---

### 4. Notification Frequency & Channel Mapping (Email vs. Desktop vs. Push)
**Database:**
```sql
CREATE TABLE notification_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_frequency ENUM('instant', 'hourly', 'daily', 'weekly') DEFAULT 'instant',
  desktop_enabled BOOLEAN DEFAULT TRUE,
  desktop_sound BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  -- Per-type settings (JSON)
  type_settings JSON DEFAULT '{}',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification types
-- type_settings JSON structure:
-- {
--   "friend_request": { "email": true, "desktop": true, "push": true },
--   "project_invite": { "email": true, "desktop": true, "push": false },
--   "message": { "email": false, "desktop": true, "push": true },
--   "code_review": { "email": true, "desktop": true, "push": true },
--   "system": { "email": false, "desktop": true, "push": false }
-- }
```

**Backend:**
```typescript
export const notificationSettingsRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.user.id));
    return settings || defaultNotificationSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    emailEnabled: z.boolean().optional(),
    emailFrequency: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
    desktopEnabled: z.boolean().optional(),
    desktopSound: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    typeSettings: z.record(z.string(), z.object({
      email: z.boolean(),
      desktop: z.boolean(),
      push: z.boolean()
    })).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    timezone: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(notificationSettings).values({
      userId: ctx.user.id,
      ...input,
      typeSettings: input.typeSettings ? JSON.stringify(input.typeSettings) : undefined
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  })
});
```

**Frontend:**
- Channel toggles (Email/Desktop/Push)
- Per-notification-type configuration
- Quiet hours scheduler
- Test notification button

---

### 5. Custom Theme & CSS Injection (For personalized UI styling)
**Database:**
```sql
CREATE TABLE user_themes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  css_variables JSON NOT NULL,
  custom_css TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_theme_name (user_id, name)
);

-- Default theme variables
-- {
--   "--bg-primary": "#1e1e1e",
--   "--bg-secondary": "#252526",
--   "--text-primary": "#d4d4d4",
--   "--accent-color": "#007acc",
--   "--border-color": "#3c3c3c"
-- }
```

**Backend:**
```typescript
export const themeRouter = createRouter({
  listThemes: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(userThemes).where(eq(userThemes.userId, ctx.user.id));
  }),

  createTheme: authedQuery.input(z.object({
    name: z.string().min(1).max(100),
    cssVariables: z.record(z.string(), z.string()),
    customCss: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [{ id }] = await db.insert(userThemes).values({
      userId: ctx.user.id,
      name: input.name,
      cssVariables: JSON.stringify(input.cssVariables),
      customCss: input.customCss
    }).$returningId();
    return { themeId: id };
  }),

  setActiveTheme: authedQuery.input(z.object({
    themeId: z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    // Deactivate all themes
    await db.update(userThemes).set({ isActive: false })
      .where(eq(userThemes.userId, ctx.user.id));
    // Activate selected
    await db.update(userThemes).set({ isActive: true })
      .where(and(eq(userThemes.id, input.themeId), eq(userThemes.userId, ctx.user.id)));
    return { success: true };
  }),

  getActiveTheme: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [theme] = await db.select().from(userThemes)
      .where(and(eq(userThemes.userId, ctx.user.id), eq(userThemes.isActive, true)));
    return theme;
  })
});
```

**Frontend:**
- Theme builder with color pickers
- CSS variable preview
- Custom CSS editor with syntax highlighting
- Import/export theme JSON

---

### 6. Font Customization (Ligatures support and adjustable line height)
**Database:**
```sql
ALTER TABLE users ADD COLUMN editor_font_family VARCHAR(100) DEFAULT 'JetBrains Mono';
ALTER TABLE users ADD COLUMN editor_font_size INT DEFAULT 14;
ALTER TABLE users ADD COLUMN editor_line_height FLOAT DEFAULT 1.5;
ALTER TABLE users ADD COLUMN editor_ligatures BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN editor_letter_spacing FLOAT DEFAULT 0;
ALTER TABLE users ADD COLUMN editor_font_smoothing ENUM('default', 'antialiased', 'subpixel-antialiased', 'none') DEFAULT 'default';
```

**Backend:**
```typescript
export const editorSettingsRouter = createRouter({
  getFontSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
    return {
      fontFamily: user.editorFontFamily,
      fontSize: user.editorFontSize,
      lineHeight: user.editorLineHeight,
      ligatures: user.editorLigatures,
      letterSpacing: user.editorLetterSpacing,
      fontSmoothing: user.editorFontSmoothing
    };
  }),

  updateFontSettings: authedQuery.input(z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().min(8).max(32).optional(),
    lineHeight: z.number().min(1).max(3).optional(),
    ligatures: z.boolean().optional(),
    letterSpacing: z.number().optional(),
    fontSmoothing: z.enum(['default', 'antialiased', 'subpixel-antialiased', 'none']).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.update(users).set(input).where(eq(users.id, ctx.user.id));
    return { success: true };
  })
});
```

**Frontend:**
- Font family dropdown with preview
- Size slider with live preview
- Line height adjustment
- Ligatures toggle (Fira Code, JetBrains Mono)
- Available fonts list

---

### 7. Data Export & Portability (Download all personal code and chat history)
**Backend:**
```typescript
import { createWriteStream } from 'fs';
import { archiver } from 'archiver';

export const dataExportRouter = createRouter({
  requestExport: authedQuery.input(z.object({
    includeProjects: z.boolean().default(true),
    includeSnippets: z.boolean().default(true),
    includeChatHistory: z.boolean().default(true),
    includeSettings: z.boolean().default(true),
    format: z.enum(['zip', 'tar.gz']).default('zip')
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const exportId = generateId();
    
    // Queue export job
    await exportQueue.add('export-data', {
      userId: ctx.user.id,
      exportId,
      options: input
    });

    return { exportId, estimatedTime: '5 minutes' };
  }),

  getExportStatus: authedQuery.input(z.object({
    exportId: z.string()
  })).query(async ({ ctx, input }) => {
    const db = getDb();
    const [exportJob] = await db.select().from(dataExports)
      .where(and(eq(dataExports.id, input.exportId), eq(dataExports.userId, ctx.user.id)));
    return exportJob;
  }),

  downloadExport: authedQuery.input(z.object({
    exportId: z.string()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [exportJob] = await db.select().from(dataExports)
      .where(and(eq(dataExports.id, input.exportId), eq(dataExports.userId, ctx.user.id)));
    
    if (!exportJob || exportJob.status !== 'completed') {
      throw new Error('Export not ready');
    }

    return { downloadUrl: exportJob.downloadUrl };
  })
});

// Export worker
async function processExport(job: Job) {
  const { userId, exportId, options } = job.data;
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(`/exports/${exportId}.zip`);
  archive.pipe(output);

  if (options.includeProjects) {
    const projects = await db.select().from(projects).where(eq(projects.ownerId, userId));
    for (const project of projects) {
      archive.append(JSON.stringify(project), { name: `projects/${project.name}.json` });
    }
  }

  if (options.includeSnippets) {
    const snippets = await db.select().from(codeSnippets).where(eq(codeSnippets.userId, userId));
    archive.append(JSON.stringify(snippets), { name: 'snippets.json' });
  }

  if (options.includeChatHistory) {
    const messages = await db.select().from(messages).where(eq(messages.senderId, userId));
    archive.append(JSON.stringify(messages), { name: 'chat-history.json' });
  }

  if (options.includeSettings) {
    const settings = await getAllUserSettings(userId);
    archive.append(JSON.stringify(settings), { name: 'settings.json' });
  }

  await archive.finalize();
  
  // Update export status
  await db.update(dataExports).set({
    status: 'completed',
    downloadUrl: `/exports/${exportId}.zip`,
    completedAt: new Date()
  }).where(eq(dataExports.id, exportId));
}
```

**Database:**
```sql
CREATE TABLE data_exports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  options JSON,
  download_url VARCHAR(500),
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Frontend:**
- Export wizard with checkboxes
- Progress indicator
- Download link via email
- GDPR compliance notice

---

### 8. Hardware Acceleration Toggles (Optimize performance for low-end devices)
**Database:**
```sql
CREATE TABLE performance_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  hardware_acceleration BOOLEAN DEFAULT TRUE,
  gpu_rendering BOOLEAN DEFAULT TRUE,
  reduce_motion BOOLEAN DEFAULT FALSE,
  limit_frames_per_second INT DEFAULT 60,
  lazy_load_icons BOOLEAN DEFAULT FALSE,
  disable_animations BOOLEAN DEFAULT FALSE,
  cache_size_mb INT DEFAULT 100,
  max_concurrent_uploads INT DEFAULT 3,
  background_processing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const performanceRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(performanceSettings)
      .where(eq(performanceSettings.userId, ctx.user.id));
    return settings || defaultPerformanceSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    hardwareAcceleration: z.boolean().optional(),
    gpuRendering: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    limitFramesPerSecond: z.number().optional(),
    lazyLoadIcons: z.boolean().optional(),
    disableAnimations: z.boolean().optional(),
    cacheSizeMb: z.number().optional(),
    maxConcurrentUploads: z.number().optional(),
    backgroundProcessing: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(performanceSettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  }),

  // Auto-detect performance issues
  getPerformanceReport: authedQuery.query(async ({ ctx }) => {
    // Return system capabilities and recommendations
    return {
      hardwareAcceleration: true,
      recommended: {
        reduceMotion: true,
        limitFramesPerSecond: 30
      }
    };
  })
});
```

**Frontend:**
- Toggle switches with tooltips
- Performance test button
- Auto-detect low-end mode
- Reset to recommended defaults

---

### 9. Network & Proxy Configurations (For corporate or restricted environments)
**Database:**
```sql
CREATE TABLE network_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  proxy_enabled BOOLEAN DEFAULT FALSE,
  proxy_host VARCHAR(255),
  proxy_port INT,
  proxy_protocol ENUM('http', 'https', 'socks5') DEFAULT 'http',
  proxy_auth_enabled BOOLEAN DEFAULT FALSE,
  proxy_username VARCHAR(255),
  proxy_password_encrypted TEXT,
  custom_ca_cert TEXT,
  bypass_proxy_for_local BOOLEAN DEFAULT TRUE,
  connection_timeout INT DEFAULT 30000,
  max_retries INT DEFAULT 3,
  use_system_proxy BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const networkRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(networkSettings)
      .where(eq(networkSettings.userId, ctx.user.id));
    
    // Don't return sensitive data
    if (settings) {
      return {
        ...settings,
        proxyPassword: settings.proxyPassword ? '••••••••' : null,
        customCaCert: settings.customCaCert ? '••••••••' : null
      };
    }
    return settings;
  }),

  updateSettings: authedQuery.input(z.object({
    proxyEnabled: z.boolean().optional(),
    proxyHost: z.string().optional(),
    proxyPort: z.number().min(1).max(65535).optional(),
    proxyProtocol: z.enum(['http', 'https', 'socks5']).optional(),
    proxyAuthEnabled: z.boolean().optional(),
    proxyUsername: z.string().optional(),
    proxyPassword: z.string().optional(),
    customCaCert: z.string().optional(),
    bypassProxyForLocal: z.boolean().optional(),
    connectionTimeout: z.number().optional(),
    maxRetries: z.number().optional(),
    useSystemProxy: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    
    // Encrypt password if provided
    if (input.proxyPassword) {
      input.proxyPassword = encrypt(input.proxyPassword);
    }
    
    await db.insert(networkSettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  }),

  testConnection: authedQuery.input(z.object({
    url: z.string().default('https://api.github.com')
  })).mutation(async ({ ctx, input }) => {
    const settings = await getNetworkSettings(ctx.user.id);
    const result = await testProxyConnection(settings, input.url);
    return result;
  })
});
```

**Frontend:**
- Proxy configuration form
- Test connection button
- Certificate upload for custom CA
- System proxy detection

---

### 10. Language & Localization Preferences
**Database:**
```sql
ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';
ALTER TABLE users ADD COLUMN time_format ENUM('12h', '24h') DEFAULT '12h';
ALTER TABLE users ADD COLUMN first_day_of_week INT DEFAULT 0; -- 0=Sunday, 1=Monday
```

**Backend:**
```typescript
export const localizationRouter = createRouter({
  getLocale: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select({
      language: users.language,
      timezone: users.timezone,
      dateFormat: users.dateFormat,
      timeFormat: users.timeFormat,
      firstDayOfWeek: users.firstDayOfWeek
    }).from(users).where(eq(users.id, ctx.user.id));
    return user;
  }),

  updateLocale: authedQuery.input(z.object({
    language: z.string().min(2).max(10),
    timezone: z.string(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    firstDayOfWeek: z.number().min(0).max(6).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.update(users).set(input).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  // Get available translations
  getTranslations: authedQuery.input(z.object({
    language: z.string()
  })).query(async ({ input }) => {
    const translations = await loadTranslations(input.language);
    return translations;
  })
});
```

**Frontend:**
- Language selector with flags
- Timezone picker with search
- Date/time format preview
- RTL support for Arabic/Hebrew

---

### 11. Two-Factor Authentication (2FA) & Security Logs
**Database:**
```sql
CREATE TABLE user_2fa (
  user_id VARCHAR(255) PRIMARY KEY,
  secret_encrypted TEXT NOT NULL,
  backup_codes JSON NOT NULL, -- Array of hashed backup codes
  enabled_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE TABLE security_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  event_type ENUM('login', 'logout', 'password_change', '2fa_enable', '2fa_disable', 
                  'api_key_created', 'api_key_deleted', 'secret_accessed', 'session_revoked',
                  'email_changed', 'password_changed', 'security_settings_changed') NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE
);
```

**Backend:**
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export const securityRouter = createRouter({
  // Setup 2FA
  setup2FA: authedQuery.mutation(async ({ ctx }) => {
    const secret = authenticator.generateSecret();
    const user = await getUser(ctx.user.id);
    const otpauth = authenticator.keyuri(user.email, 'WEB IDE', secret);
    
    const qrCode = await QRCode.toDataURL(otpauth);
    
    // Store encrypted secret temporarily (not enabled yet)
    await db.insert(temp2faSecrets).values({
      userId: ctx.user.id,
      secret: encrypt(secret),
      expiresAt: new Date(Date.now() + 10 * 60000) // 10 minutes
    });

    return { secret, qrCode };
  }),

  enable2FA: authedQuery.input(z.object({
    code: z.string().length(6)
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    
    // Get pending secret
    const [temp] = await db.select().from(temp2faSecrets)
      .where(and(eq(temp2faSecrets.userId, ctx.user.id), gt(temp2faSecrets.expiresAt, new Date())));
    
    if (!temp) throw new Error('No pending 2FA setup');
    
    // Verify code
    const secret = decrypt(temp.secret);
    const isValid = authenticator.verify({ token: input.code, secret });
    
    if (!isValid) throw new Error('Invalid verification code');
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    
    // Enable 2FA
    await db.insert(user2fa).values({
      userId: ctx.user.id,
      secretEncrypted: secret,
      backupCodes: JSON.stringify(backupCodes.map(code => hashCode(code)))
    }).onDuplicateKeyUpdate({ set: {
      secretEncrypted: secret,
      backupCodes: JSON.stringify(backupCodes.map(code => hashCode(code))),
      enabledAt: new Date()
    }});
    
    // Delete temp secret
    await db.delete(temp2faSecrets).where(eq(temp2faSecrets.userId, ctx.user.id));
    
    // Log event
    await logSecurityEvent(ctx.user.id, '2fa_enable');
    
    return { backupCodes };
  }),

  // Verify 2FA login
  verify2FA: authedQuery.input(z.object({
    sessionId: z.string(),
    code: z.string().optional(),
    backupCode: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [tfa] = await db.select().from(user2fa).where(eq(user2fa.userId, ctx.user.id));
    
    if (!tfa) throw new Error('2FA not enabled');
    
    let isValid = false;
    
    if (input.code) {
      isValid = authenticator.verify({ token: input.code, secret: decrypt(tfa.secretEncrypted) });
    } else if (input.backupCode) {
      const backupCodes = JSON.parse(tfa.backupCodes);
      const hashedInput = hashCode(input.backupCode.toUpperCase());
      isValid = backupCodes.includes(hashedInput);
      
      // Remove used backup code
      if (isValid) {
        const updated = backupCodes.filter(c => c !== hashedInput);
        await db.update(user2fa).set({ backupCodes: JSON.stringify(updated) })
          .where(eq(user2fa.userId, ctx.user.id));
      }
    }
    
    if (!isValid) throw new Error('Invalid code');
    
    // Mark session as 2FA verified
    await db.update(userSessions).set({ isCurrent: true })
      .where(eq(userSessions.id, input.sessionId));
    
    return { success: true };
  }),

  // Get security logs
  getSecurityLogs: authedQuery.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0)
  })).query(async ({ ctx, input }) => {
    const db = getDb();
    return db.select().from(securityLogs)
      .where(eq(securityLogs.userId, ctx.user.id))
      .orderBy(desc(securityLogs.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }),

  // Revoke session
  revokeSession: authedQuery.input(z.object({
    sessionId: z.string()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(userSessions).where(
      and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, ctx.user.id))
    );
    await logSecurityEvent(ctx.user.id, 'session_revoked', { sessionId: input.sessionId });
    return { success: true };
  })
});
```

**Frontend:**
- 2FA setup wizard with QR code
- Backup codes display (one-time)
- Security log timeline
- Active sessions list with revoke button

---

### 12. Auto-Save & Cloud Sync Intervals
**Database:**
```sql
CREATE TABLE sync_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  auto_save_enabled BOOLEAN DEFAULT TRUE,
  auto_save_interval_seconds INT DEFAULT 30,
  cloud_sync_enabled BOOLEAN DEFAULT TRUE,
  cloud_sync_interval_minutes INT DEFAULT 5,
  sync_on_close BOOLEAN DEFAULT TRUE,
  sync_wifi_only BOOLEAN DEFAULT FALSE,
  conflict_resolution ENUM('keep_local', 'keep_remote', 'keep_both') DEFAULT 'keep_both',
  max_sync_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const syncRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(syncSettings)
      .where(eq(syncSettings.userId, ctx.user.id));
    return settings || defaultSyncSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    autoSaveEnabled: z.boolean().optional(),
    autoSaveIntervalSeconds: z.number().min(5).max(300).optional(),
    cloudSyncEnabled: z.boolean().optional(),
    cloudSyncIntervalMinutes: z.number().min(1).max(60).optional(),
    syncOnClose: z.boolean().optional(),
    syncWifiOnly: z.boolean().optional(),
    conflictResolution: z.enum(['keep_local', 'keep_remote', 'keep_both']).optional(),
    maxSyncRetries: z.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(syncSettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  }),

  // Manual sync trigger
  triggerSync: authedQuery.mutation(async ({ ctx }) => {
    await syncQueue.add('sync-user', { userId: ctx.user.id });
    return { queued: true };
  })
});
```

**Frontend:**
- Interval sliders with labels
- WiFi-only toggle
- Conflict resolution selector
- Last sync status display

---

### 13. IDE Extension/Plugin Management
**Database:**
```sql
CREATE TABLE available_plugins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL,
  author VARCHAR(100),
  repository_url VARCHAR(500),
  npm_package VARCHAR(100),
  is_official BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_plugins (
  user_id VARCHAR(255) NOT NULL,
  plugin_id INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  settings JSON,
  installed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, plugin_id)
);
```

**Backend:**
```typescript
export const pluginRouter = createRouter({
  listAvailable: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(availablePlugins).where(eq(availablePlugins.isEnabled, true));
  }),

  listInstalled: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select({
      plugin: availablePlugins,
      userPlugin: userPlugins
    }).from(userPlugins)
      .leftJoin(availablePlugins, eq(userPlugins.pluginId, availablePlugins.id))
      .where(and(eq(userPlugins.userId, ctx.user.id), eq(userPlugins.enabled, true)));
  }),

  install: authedQuery.input(z.object({
    pluginId: z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(userPlugins).values({
      userId: ctx.user.id,
      pluginId: input.pluginId,
      enabled: true
    }).onDuplicateKeyUpdate({ set: { enabled: true, updatedAt: new Date() } });
    return { success: true };
  }),

  uninstall: authedQuery.input(z.object({
    pluginId: z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(userPlugins).where(
      and(eq(userPlugins.userId, ctx.user.id), eq(userPlugins.pluginId, input.pluginId))
    );
    return { success: true };
  }),

  updateSettings: authedQuery.input(z.object({
    pluginId: z.number(),
    settings: z.record(z.any())
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.update(userPlugins).set({
      settings: JSON.stringify(input.settings),
      updatedAt: new Date()
    }).where(and(eq(userPlugins.userId, ctx.user.id), eq(userPlugins.pluginId, input.pluginId)));
    return { success: true };
  })
});
```

**Frontend:**
- Plugin marketplace UI
- Install/uninstall buttons
- Plugin settings modal
- Version compatibility check

---

### 14. Default Branch & Repository Settings
**Database:**
```sql
CREATE TABLE repository_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  default_branch VARCHAR(100) DEFAULT 'main',
  auto_merge_prs BOOLEAN DEFAULT FALSE,
  default_visibility ENUM('public', 'private', 'internal') DEFAULT 'private',
  require_code_review BOOLEAN DEFAULT FALSE,
  min_review_approvals INT DEFAULT 1,
  auto_delete_branches BOOLEAN DEFAULT TRUE,
  default_license VARCHAR(100),
  default_language VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const repoSettingsRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(repositorySettings)
      .where(eq(repositorySettings.userId, ctx.user.id));
    return settings || defaultRepoSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    defaultBranch: z.string().optional(),
    autoMergePrs: z.boolean().optional(),
    defaultVisibility: z.enum(['public', 'private', 'internal']).optional(),
    requireCodeReview: z.boolean().optional(),
    minReviewApprovals: z.number().optional(),
    autoDeleteBranches: z.boolean().optional(),
    defaultLicense: z.string().optional(),
    defaultLanguage: z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(repositorySettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  })
});
```

**Frontend:**
- Branch name input with validation
- Review settings checkboxes
- License selector dropdown

---

### 15. Accessibility Overlays (High contrast, colorblind modes, screen reader focus)
**Database:**
```sql
CREATE TABLE accessibility_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  high_contrast BOOLEAN DEFAULT FALSE,
  colorblind_mode ENUM('none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia') DEFAULT 'none',
  font_size_scale FLOAT DEFAULT 1.0,
  reduce_motion BOOLEAN DEFAULT FALSE,
  reduce_transparency BOOLEAN DEFAULT FALSE,
  cursor_size ENUM('default', 'large', 'extra_large') DEFAULT 'default',
  focus_indicator ENUM('default', 'high_contrast', 'bold') DEFAULT 'default',
  screen_reader_optimized BOOLEAN DEFAULT FALSE,
  keyboard_navigation_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const accessibilityRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(accessibilitySettings)
      .where(eq(accessibilitySettings.userId, ctx.user.id));
    return settings || defaultAccessibilitySettings;
  }),

  updateSettings: authedQuery.input(z.object({
    highContrast: z.boolean().optional(),
    colorblindMode: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']).optional(),
    fontSizeScale: z.number().min(0.5).max(2.0).optional(),
    reduceMotion: z.boolean().optional(),
    reduceTransparency: z.boolean().optional(),
    cursorSize: z.enum(['default', 'large', 'extra_large']).optional(),
    focusIndicator: z.enum(['default', 'high_contrast', 'bold']).optional(),
    screenReaderOptimized: z.boolean().optional(),
    keyboardNavigationOnly: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(accessibilitySettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  })
});
```

**Frontend:**
- Accessibility preset buttons
- Colorblind simulation preview
- Focus indicator options
- Screen reader announcements

---

### 16. Connected Accounts & Third-Party Integrations (OAuth management)
**Database:**
```sql
CREATE TABLE connected_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  provider ENUM('github', 'gitlab', 'bitbucket', 'google', 'microsoft', 'discord', 'slack') NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  scope VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_provider_user (user_id, provider)
);
```

**Backend:**
```typescript
import { OAuth2Client } from 'google-auth-library';

const oauthClients = {
  github: new GitHubOAuth(),
  google: new OAuth2Client(process.env.GOOGLE_CLIENT_ID),
  discord: new DiscordOAuth(),
  slack: new SlackOAuth()
};

export const connectionsRouter = createRouter({
  listConnections: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const accounts = await db.select({
      id: connectedAccounts.id,
      provider: connectedAccounts.provider,
      providerUserId: connectedAccounts.providerUserId,
      scope: connectedAccounts.scope,
      createdAt: connectedAccounts.createdAt,
      updatedAt: connectedAccounts.updatedAt
    }).from(connectedAccounts).where(eq(connectedAccounts.userId, ctx.user.id));
    return accounts;
  }),

  // Initiate OAuth flow
  startOAuth: authedQuery.input(z.object({
    provider: z.enum(['github', 'gitlab', 'bitbucket', 'google', 'microsoft', 'discord', 'slack'])
  })).mutation(async ({ ctx, input }) => {
    const client = oauthClients[input.provider];
    const authUrl = client.generateAuthUrl({
      client_id: process.env[`${input.provider.toUpperCase()}_CLIENT_ID`],
      redirect_uri: `${process.env.BASE_URL}/api/auth/callback/${input.provider}`,
      scope: getProviderScopes(input.provider),
      state: ctx.user.id // Pass user ID as state
    });
    return { authUrl };
  }),

  // Handle OAuth callback
  handleCallback: createRouter().input(z.object({
    provider: z.string(),
    code: z.string(),
    state: z.string() // user ID
  })).mutation(async ({ input }) => {
    const client = oauthClients[input.provider];
    const tokens = await client.getToken(input.code);
    
    // Get user info
    const userInfo = await client.getUserInfo(tokens.access_token);
    
    // Store tokens
    await db.insert(connectedAccounts).values({
      userId: input.state,
      provider: input.provider,
      providerUserId: userInfo.id,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope
    }).onDuplicateKeyUpdate({ set: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      updatedAt: new Date()
    }});
    
    return { success: true };
  }),

  disconnect: authedQuery.input(z.object({
    provider: z.enum(['github', 'gitlab', 'bitbucket', 'google', 'microsoft', 'discord', 'slack'])
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(connectedAccounts).where(
      and(eq(connectedAccounts.userId, ctx.user.id), eq(connectedAccounts.provider, input.provider))
    );
    return { success: true };
  })
});
```

**Frontend:**
- Connected accounts list
- Connect/disconnect buttons
- OAuth permission display
- Token refresh status

---

### 17. Usage Analytics & Performance Monitoring Toggles
**Database:**
```sql
CREATE TABLE analytics_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  usage_analytics_enabled BOOLEAN DEFAULT TRUE,
  crash_reports_enabled BOOLEAN DEFAULT TRUE,
  performance_monitoring BOOLEAN DEFAULT TRUE,
  feature_usage_tracking BOOLEAN DEFAULT TRUE,
  error_telemetry BOOLEAN DEFAULT TRUE,
  share_device_info BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const analyticsRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(analyticsSettings)
      .where(eq(analyticsSettings.userId, ctx.user.id));
    return settings || defaultAnalyticsSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    usageAnalyticsEnabled: z.boolean().optional(),
    crashReportsEnabled: z.boolean().optional(),
    performanceMonitoring: z.boolean().optional(),
    featureUsageTracking: z.boolean().optional(),
    errorTelemetry: z.boolean().optional(),
    shareDeviceInfo: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(analyticsSettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  }),

  // Get user's analytics summary
  getAnalyticsSummary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, ctx.user.id));
    return {
      totalCodingTime: stats?.totalCodingTime || 0,
      projectsCreated: stats?.projectsCreated || 0,
      messagesSent: stats?.messagesSent || 0,
      lastActive: stats?.lastActiveDate
    };
  })
});
```

**Frontend:**
- Toggle switches with explanations
- Data usage breakdown
- Export analytics data

---

### 18. Editor Behavior Rules (Auto-format on save, trim whitespace, etc.)
**Database:**
```sql
CREATE TABLE editor_behavior_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  auto_format_on_save BOOLEAN DEFAULT TRUE,
  auto_format_on_paste BOOLEAN DEFAULT FALSE,
  trim_trailing_whitespace BOOLEAN DEFAULT TRUE,
  insert_final_newline BOOLEAN DEFAULT TRUE,
  auto_close_brackets BOOLEAN DEFAULT TRUE,
  auto_close_quotes BOOLEAN DEFAULT TRUE,
  tab_size INT DEFAULT 2,
  insert_spaces BOOLEAN DEFAULT TRUE,
  detect_indentation BOOLEAN DEFAULT TRUE,
  bracket_pair_colorization BOOLEAN DEFAULT TRUE,
  guides_indentation BOOLEAN DEFAULT TRUE,
  guides_highlight_active BOOLEAN DEFAULT TRUE,
  word_wrap ENUM('off', 'on', 'wordWrapColumn', 'bounded') DEFAULT 'off',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend:**
```typescript
export const editorBehaviorRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db.select().from(editorBehaviorSettings)
      .where(eq(editorBehaviorSettings.userId, ctx.user.id));
    return settings || defaultEditorBehaviorSettings;
  }),

  updateSettings: authedQuery.input(z.object({
    autoFormatOnSave: z.boolean().optional(),
    autoFormatOnPaste: z.boolean().optional(),
    trimTrailingWhitespace: z.boolean().optional(),
    insertFinalNewline: z.boolean().optional(),
    autoCloseBrackets: z.boolean().optional(),
    autoCloseQuotes: z.boolean().optional(),
    tabSize: z.number().optional(),
    insertSpaces: z.boolean().optional(),
    detectIndentation: z.boolean().optional(),
    bracketPairColorization: z.boolean().optional(),
    guidesIndentation: z.boolean().optional(),
    guidesHighlightActive: z.boolean().optional(),
    wordWrap: z.enum(['off', 'on', 'wordWrapColumn', 'bounded']).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.insert(editorBehaviorSettings).values({
      userId: ctx.user.id,
      ...input
    }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { success: true };
  })
});
```

**Frontend:**
- Behavior toggles grouped by category
- Preview of formatting changes
- Language-specific overrides

---

### 19. Custom Domain Mapping (For organization or portfolio pages)
**Database:**
```sql
CREATE TABLE custom_domains (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  verification_token VARCHAR(64),
  verified_at TIMESTAMP,
  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_cert TEXT,
  ssl_key TEXT,
  redirect_to VARCHAR(500),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_domain (domain)
);
```

**Backend:**
```typescript
export const domainRouter = createRouter({
  listDomains: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(customDomains).where(eq(customDomains.userId, ctx.user.id));
  }),

  addDomain: authedQuery.input(z.object({
    domain: z.string().domain()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await db.insert(customDomains).values({
      userId: ctx.user.id,
      domain: input.domain,
      verificationToken
    });

    // Return DNS records to configure
    return {
      domain: input.domain,
      dnsRecords: [
        { type: 'TXT', name: '_verification', value: verificationToken },
        { type: 'CNAME', name: '@', value: 'your-server.com' }
      ]
    };
  }),

  verifyDomain: authedQuery.input(z.object({
    domainId: z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [domain] = await db.select().from(customDomains)
      .where(and(eq(customDomains.id, input.domainId), eq(customDomains.userId, ctx.user.id)));
    
    // Check DNS (simplified)
    const dnsRecords = await resolveDNS(domain.domain);
    const isVerified = dnsRecords.includes(domain.verificationToken);
    
    if (isVerified) {
      await db.update(customDomains).set({ 
        verifiedAt: new Date(),
        isActive: true 
      }).where(eq(customDomains.id, input.domainId));
    }
    
    return { verified: isVerified };
  }),

  deleteDomain: authedQuery.input(z.object({
    domainId: z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(customDomains).where(
      and(eq(customDomains.id, input.domainId), eq(customDomains.userId, ctx.user.id))
    );
    return { success: true };
  })
});
```

**Frontend:**
- Domain input with validation
- DNS record display
- Verification status
- SSL certificate upload

---

### 20. Device Management (Logout from active sessions on other devices)
**Database:**
```sql
-- Already defined in S-11: user_sessions table
-- Add device tracking
ALTER TABLE user_sessions ADD COLUMN device_name VARCHAR(100);
ALTER TABLE user_sessions ADD COLUMN device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop';
ALTER TABLE user_sessions ADD COLUMN last_location VARCHAR(100);
```

**Backend:**
```typescript
export const deviceRouter = createRouter({
  listDevices: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const sessions = await db.select().from(userSessions)
      .where(eq(userSessions.userId, ctx.user.id))
      .orderBy(desc(userSessions.lastActiveAt));
    
    return sessions.map(s => ({
      ...s,
      isCurrent: s.id === getCurrentSessionId()
    }));
  }),

  revokeDevice: authedQuery.input(z.object({
    sessionId: z.string()
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    
    // Don't allow revoking current session
    if (input.sessionId === getCurrentSessionId()) {
      throw new Error('Cannot revoke current session');
    }
    
    await db.delete(userSessions).where(
      and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, ctx.user.id))
    );
    
    await logSecurityEvent(ctx.user.id, 'session_revoked', { sessionId: input.sessionId });
    return { success: true };
  }),

  revokeAllDevices: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const currentSessionId = getCurrentSessionId();
    
    await db.delete(userSessions).where(
      and(eq(userSessions.userId, ctx.user.id), sql`id != ${currentSessionId}`)
    );
    
    await logSecurityEvent(ctx.user.id, 'session_revoked', { action: 'all_except_current' });
    return { success: true };
  })
});
```

**Frontend:**
- Device list with icons
- Current device highlighted
- "Revoke" button per device
- "Revoke all other devices" button
- Last activity timestamp

---

## Settings Implementation Priority

| Feature | Complexity | Priority |
|---------|------------|----------|
| Granular Privacy Controls | Medium | P0 |
| Custom Keybinding Remapping | Medium | P0 |
| API Key & Secret Management | High | P0 |
| Notification Frequency & Channel | Medium | P0 |
| Custom Theme & CSS Injection | Medium | P1 |
| Font Customization | Low | P1 |
| Data Export & Portability | High | P1 |
| Hardware Acceleration Toggles | Low | P1 |
| Network & Proxy Configurations | Medium | P2 |
| Language & Localization | Medium | P2 |
| 2FA & Security Logs | High | P0 |
| Auto-Save & Cloud Sync | Medium | P1 |
| Extension/Plugin Management | High | P2 |
| Default Branch & Repository | Low | P2 |
| Accessibility Overlays | Medium | P1 |
| Connected Accounts & OAuth | High | P1 |
| Analytics & Monitoring Toggles | Low | P2 |
| Editor Behavior Rules | Low | P1 |
| Custom Domain Mapping | High | P3 |
| Device Management | Medium | P1 |

---

## Database Schema Summary (Settings Features)

```sql
-- Privacy
CREATE TABLE privacy_settings (...);

-- Keybindings
CREATE TABLE user_keybindings (...);

-- Secrets
CREATE TABLE user_secrets (...);

-- Notifications
CREATE TABLE notification_settings (...);

-- Themes
CREATE TABLE user_themes (...);

-- Performance
CREATE TABLE performance_settings (...);

-- Network
CREATE TABLE network_settings (...);

-- Security
CREATE TABLE user_2fa (...);
CREATE TABLE security_logs (...);
CREATE TABLE user_sessions (...);

-- Sync
CREATE TABLE sync_settings (...);

-- Plugins
CREATE TABLE available_plugins (...);
CREATE TABLE user_plugins (...);

-- Repository
CREATE TABLE repository_settings (...);

-- Accessibility
CREATE TABLE accessibility_settings (...);

-- Connections
CREATE TABLE connected_accounts (...);

-- Analytics
CREATE TABLE analytics_settings (...);

-- Editor
CREATE TABLE editor_behavior_settings (...);

-- Domains
CREATE TABLE custom_domains (...);
```

---

Would you like me to start implementing any specific settings feature?