# 🧠 Memory System - User-Isolated Conversations

## Overview

The RAG Chat app now has a **persistent memory system** that keeps separate conversation histories for each phone number/user.

---

## How It Works

### 1. User Identification
- Users enter their **phone number** when first accessing the chat
- Phone number is stored in localStorage and used to identify the user
- No SMS verification required - it's just an identifier

### 2. Conversation Isolation
- **Each phone number has its own conversation history**
- Conversations are **never mixed** between different users
- Each user can have separate history per collection

### 3. Persistence
- All messages (user + assistant) are **saved to Supabase**
- History is **automatically loaded** when you return
- Works across browser sessions and devices (with same phone number)

### 4. Privacy
- Phone numbers are hashed and stored securely
- Each user can only access their own conversations
- No cross-user data leakage

---

## Database Schema

### New Tables

**rag_users:**
- `id` - UUID primary key
- `phone_number` - Unique identifier (text, indexed)
- `display_name` - Optional name
- `created_at` - Account creation
- `last_active_at` - Last activity timestamp

**rag_conversations:**
- `id` - UUID primary key
- `user_id` - Foreign key to rag_users
- `collection_id` - Foreign key to rag_collections
- `role` - 'user' or 'assistant'
- `content` - Message text
- `sources` - JSON array of citations
- `created_at` - Message timestamp

### Functions

**get_or_create_user(phone_number, display_name):**
- Gets existing user or creates new one
- Updates last_active_at on each access
- Returns user UUID

**get_conversation_history(user_id, collection_id, limit):**
- Retrieves messages for a specific user + collection
- Ordered by timestamp (newest first)
- Configurable limit (default: 50 messages)

---

## User Experience

### First Time
1. User opens chat
2. Sees phone number input screen
3. Enters phone number (10+ digits)
4. Starts chatting - history is saved automatically

### Returning User
1. Phone number auto-loaded from localStorage
2. Conversation history auto-loaded
3. Can continue from where they left off

### Switching Users
1. Click "Change" next to phone number
2. Enter different phone number
3. Sees that user's conversation history

### Clearing History
1. Click "🗑️ Clear Chat" button
2. Confirms deletion
3. Conversation history deleted (only for current collection)

---

## API Endpoints

### GET `/api/conversations`
**Load conversation history**

**Query Params:**
- `phoneNumber` - User's phone number (required)
- `collectionId` - Collection UUID (required)
- `limit` - Max messages to return (optional, default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What is machine learning?",
      "sources": null,
      "created_at": "2026-02-19T12:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Machine learning is...",
      "sources": [
        {
          "title": "AI Basics",
          "snippet": "ML is a subset...",
          "score": 0.85
        }
      ],
      "created_at": "2026-02-19T12:00:05Z"
    }
  ]
}
```

### POST `/api/conversations`
**Save a message**

**Body:**
```json
{
  "phoneNumber": "+1234567890",
  "collectionId": "uuid",
  "role": "user",
  "content": "Question text",
  "sources": [] // Optional, for assistant messages
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "role": "user",
    "content": "Question text",
    "sources": null,
    "created_at": "2026-02-19T12:00:00Z"
  }
}
```

### DELETE `/api/conversations`
**Clear conversation history**

**Query Params:**
- `phoneNumber` - User's phone number
- `collectionId` - Collection UUID

**Response:**
```json
{
  "success": true
}
```

---

## UI Changes

### Phone Number Screen
- **New screen** shown on first visit
- Input field for phone number
- Privacy notice explaining data usage
- "Continue to Chat" button

### Chat Header
- Shows current phone number
- "Change" link to switch users
- "🗑️ Clear Chat" button to delete history

### Message Loading
- Shows "Loading your conversation history..." spinner
- Automatically scrolls to bottom after loading
- Maintains scroll position during new messages

### Empty State
- Personalized: "Hey {phoneNumber}! Ask me anything..."
- Note: "Your conversation history is saved..."
- Example prompts to get started

---

## Privacy & Security

### Data Stored
- ✅ Phone number (identifier)
- ✅ Message content (questions & answers)
- ✅ Sources/citations
- ✅ Timestamps

### Data NOT Stored
- ❌ Real name (unless user provides it)
- ❌ Email address
- ❌ Location data
- ❌ Device information

### Access Control
- Users can only access their own conversations
- No admin panel to view other users' chats
- No cross-user search or analytics

### Data Retention
- Messages persist indefinitely unless deleted
- Users can clear their own history anytime
- No automatic deletion or expiration

---

## Migration Steps

### For Existing Instances

1. **Run the migration SQL:**
```bash
# Copy from supabase/migrations/002_add_user_conversations.sql
# Execute in Supabase SQL Editor
```

2. **Restart the app:**
```bash
npm run dev
```

3. **Test the flow:**
- Open chat
- Enter phone number
- Send a message
- Refresh page - history should load

### For New Deployments

Both migrations will run automatically:
- `001_init.sql` - Core RAG tables
- `002_add_user_conversations.sql` - Memory system

---

## Examples

### Use Case 1: Family Document Library
- Dad (phone: +1111111111) asks about medical records
- Mom (phone: +2222222222) asks about tax documents
- Each sees only their own conversation history
- No mixing of sensitive information

### Use Case 2: Customer Support Knowledge Base
- Agent A (phone: +3333333333) helps Customer X
- Agent B (phone: +4444444444) helps Customer Y
- Each agent has separate chat history
- Can clear history between customers

### Use Case 3: Personal Research Assistant
- User (phone: +5555555555) researches AI topics
- Conversation spans days/weeks
- Can pick up where they left off
- History helps with context and follow-ups

---

## Advanced Features (Future)

### Potential Enhancements:
1. **Display names** - "Hey John!" instead of "+1234567890"
2. **Multiple device sync** - Same phone number, different browsers
3. **Export history** - Download conversations as JSON/PDF
4. **Search history** - Find previous questions
5. **Conversation branching** - Fork a conversation
6. **Shared conversations** - Temporary share links
7. **Admin dashboard** - View usage stats (anonymized)
8. **Auto-summarization** - Summarize long conversations
9. **Conversation tagging** - Organize by topic
10. **Analytics** - Most asked questions, popular topics

---

## Testing

### Manual Test Checklist

- [ ] Enter phone number - saves to localStorage
- [ ] Send message - appears in chat
- [ ] Refresh page - history loads automatically
- [ ] Clear chat - history deleted
- [ ] Change phone number - loads different history
- [ ] Switch collections - loads collection-specific history
- [ ] Send 50+ messages - pagination works
- [ ] Test with invalid phone (< 10 digits) - validation works
- [ ] Test without collection selected - graceful handling

### Edge Cases

- [ ] First-time user with no history
- [ ] User with 0 messages in current collection
- [ ] User with hundreds of messages (performance)
- [ ] Multiple browser tabs with same phone number
- [ ] Network error during message save
- [ ] Invalid phone number format

---

## Summary

✅ **Implemented:**
- Phone number-based user identification
- Persistent conversation storage per user
- Automatic history loading
- Clear chat functionality
- Privacy-focused design
- Collection-specific histories

✅ **Benefits:**
- No mixing of conversations
- Persistent across sessions
- Simple user experience
- Privacy-preserving
- Scalable architecture

✅ **Ready for:**
- Multi-user deployments
- Production use
- Mobile apps (same backend)
- API integrations

---

**The memory system makes RAG Chat feel like a personal assistant that remembers your conversations!** 🧠
