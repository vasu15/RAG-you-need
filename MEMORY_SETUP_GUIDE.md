# 🚀 Memory System Setup Guide

## Quick Start (For Testing)

### Step 1: Run the Database Migration

**Copy this SQL and execute in Supabase SQL Editor:**

```sql
-- Add user sessions and conversation history

create table if not exists public.rag_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists public.rag_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.rag_users(id) on delete cascade,
  collection_id uuid not null references public.rag_collections(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rag_conversations_user_idx on public.rag_conversations(user_id);
create index if not exists rag_conversations_collection_idx on public.rag_conversations(collection_id);
create index if not exists rag_conversations_created_idx on public.rag_conversations(created_at desc);

-- Function to get or create user by phone number
create or replace function public.get_or_create_user(p_phone_number text, p_display_name text default null)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.rag_users
  where phone_number = p_phone_number;
  
  if v_user_id is null then
    insert into public.rag_users (phone_number, display_name)
    values (p_phone_number, p_display_name)
    returning id into v_user_id;
  else
    update public.rag_users
    set last_active_at = now()
    where id = v_user_id;
  end if;
  
  return v_user_id;
end;
$$;

-- Function to get conversation history for a user
create or replace function public.get_conversation_history(
  p_user_id uuid,
  p_collection_id uuid,
  p_limit int default 50
)
returns table (
  id uuid,
  role text,
  content text,
  sources jsonb,
  created_at timestamptz
)
language sql
stable
as $$
  select id, role, content, sources, created_at
  from public.rag_conversations
  where user_id = p_user_id
    and collection_id = p_collection_id
  order by created_at desc
  limit p_limit;
$$;
```

**Expected Result:** "Success. No rows returned"

---

### Step 2: Verify Tables Created

Go to **Supabase → Table Editor** and check:

- ✅ `rag_users` table exists
- ✅ `rag_conversations` table exists

---

### Step 3: Pull Latest Code

```bash
cd /path/to/RAG-you-need
git pull origin vkClawd
npm install  # In case of new dependencies
npm run dev
```

---

### Step 4: Test the Memory System

#### Test 1: First User
1. Open http://localhost:3000/chat
2. Enter phone number: `+1234567890`
3. Click "Continue to Chat"
4. Select a collection
5. Send message: "What is machine learning?"
6. Get response with sources
7. **Refresh the page** → History should load ✅

#### Test 2: Second User (Different History)
1. Click "Change" next to phone number
2. Enter different number: `+0987654321`
3. Click "Continue to Chat"
4. **Verify:** Empty chat (no messages from first user) ✅
5. Send message: "Tell me about cooking"
6. Get response
7. **Refresh** → This user's history loads ✅

#### Test 3: Switch Back to First User
1. Click "Change"
2. Enter first number: `+1234567890`
3. **Verify:** Original conversation about ML loads ✅

#### Test 4: Clear History
1. Click "🗑️ Clear Chat" button
2. Confirm deletion
3. **Verify:** Messages disappear ✅
4. Send new message
5. **Refresh** → Only new message shows ✅

#### Test 5: Multiple Collections
1. Switch to different collection
2. **Verify:** Separate conversation history per collection ✅

---

### Step 5: Check Database

**Verify data in Supabase:**

```sql
-- Check users table
SELECT * FROM public.rag_users;

-- Check conversations
SELECT 
  u.phone_number,
  c.role,
  c.content,
  c.created_at
FROM public.rag_conversations c
JOIN public.rag_users u ON c.user_id = u.id
ORDER BY c.created_at DESC
LIMIT 10;

-- Count messages per user
SELECT 
  u.phone_number,
  COUNT(c.id) as message_count
FROM public.rag_users u
LEFT JOIN public.rag_conversations c ON u.id = c.user_id
GROUP BY u.phone_number;
```

---

## Troubleshooting

### Issue: "Could not find table rag_users"
**Solution:** Migration not run yet. Execute the SQL from Step 1.

### Issue: Phone number screen doesn't show
**Solution:** Clear localStorage:
```js
// In browser console:
localStorage.clear();
location.reload();
```

### Issue: History doesn't load
**Check:**
1. Network tab - API call to `/api/conversations` succeeds?
2. Response has `messages` array?
3. Console for errors?

**Debug:**
```bash
# Check Supabase logs
# Go to Supabase → Database → Logs
```

### Issue: "Failed to save message"
**Check:**
1. Collection ID is valid?
2. Phone number is valid (10+ digits)?
3. Supabase connection working?

**Test API directly:**
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "collectionId": "YOUR_COLLECTION_ID",
    "role": "user",
    "content": "Test message"
  }'
```

---

## Demo Script

**For showing the feature:**

### Scenario: Family Document Library

1. **Setup:**
   - Create collection: "Family Docs"
   - Upload document: "Medical Records.txt"

2. **Dad's Session:**
   - Enter phone: `+1111111111`
   - Ask: "What are the vaccination records?"
   - Get answer with sources
   - Ask: "When was the last checkup?"
   - **Result:** Dad has 2 messages in history

3. **Mom's Session:**
   - Click "Change"
   - Enter phone: `+2222222222`
   - **Verify:** Empty chat (no Dad's messages) ✅
   - Ask: "What are the insurance details?"
   - Get answer
   - **Result:** Mom has 1 message (isolated from Dad)

4. **Switch Back to Dad:**
   - Click "Change"
   - Enter: `+1111111111`
   - **Verify:** Dad's 2 messages load ✅

5. **Refresh Page:**
   - Phone auto-loads from localStorage
   - Messages auto-load
   - **No data loss** ✅

---

## Performance Considerations

### Message Limits
- **Default:** 50 messages loaded
- **Adjustable:** Change `limit` parameter
- **Recommendation:** 50-100 for good UX

### Indexes
- ✅ User ID indexed
- ✅ Collection ID indexed
- ✅ Created timestamp indexed (DESC)
- **Query performance:** <100ms for typical loads

### Storage
- **Per message:** ~500 bytes average
- **1000 messages:** ~500 KB
- **100 users × 1000 messages:** ~50 MB
- **Supabase free tier:** 500 MB (plenty of room)

---

## Security Notes

### What's Stored
- Phone number (plain text - not hashed in v1)
- Message content
- Timestamps

### What's NOT Stored
- No authentication tokens
- No session cookies
- No device fingerprints
- No IP addresses

### Recommendations for Production
1. **Hash phone numbers** before storing
2. **Add rate limiting** on API endpoints
3. **Implement proper auth** (OAuth, JWT, etc.)
4. **Add user deletion** endpoint (GDPR compliance)
5. **Encrypt messages** at rest (Supabase encryption)
6. **Audit logs** for message access

---

## Next Steps

### After Testing Works:

1. **Merge to main:**
```bash
git checkout main
git merge vkClawd
git push origin main
```

2. **Deploy to production:**
```bash
# Run migration in production Supabase
# Deploy app to Vercel/Netlify/your-host
```

3. **Monitor usage:**
- Check Supabase dashboard for table sizes
- Monitor API response times
- Check for errors in logs

---

## Support

### Questions?

1. Check `MEMORY_SYSTEM.md` for detailed docs
2. Review API code in `src/app/api/conversations/route.ts`
3. Check database functions in `002_add_user_conversations.sql`

### Found a Bug?

Report with:
- Phone number format used
- Collection ID
- Browser console errors
- Network tab screenshot
- Steps to reproduce

---

**The memory system is ready to use! Test it and let me know if you need any adjustments.** 🚀
