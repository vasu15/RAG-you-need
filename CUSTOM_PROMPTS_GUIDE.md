# 🤖 Custom AI Prompts - Guide

## ✅ Issues Fixed

### 1. Settings Tab Not Showing ❌ → ✅
**Problem:** Settings page was blank or not loading  
**Fix:** 
- Added proper error handling
- Loading states while fetching config
- Clear error messages if something fails
- Empty state when no collection selected

### 2. Network Failures ❌ → ✅
**Problem:** Multiple API errors in console when chatting  
**Fix:**
- Proper OpenAI integration in answer API
- Better error handling throughout
- Graceful fallbacks if OpenAI fails
- Console logging for debugging

### 3. No Custom Prompts ❌ → ✅
**Problem:** Couldn't customize how AI responds  
**Fix:**
- ✨ **NEW: Custom system prompts per collection!**
- 5 pre-built templates to choose from
- Rich text editor for custom prompts
- Model selection (GPT-3.5, GPT-4, etc.)

---

## 🚀 New Feature: Custom AI Prompts

### What It Does

**Customize how the AI assistant responds to your questions!**

- Define the AI's personality and tone
- Set specific instructions for answering
- Choose different personas (tutor, expert, writer, etc.)
- Select which OpenAI model to use
- Save custom prompts per collection

### Why It's Useful

**For Zaggle Docs Collection:**
```
System Prompt:
"You are a Zaggle company documentation assistant. 
Answer questions about company policies, procedures, 
and guidelines. Be professional, concise, and cite 
specific document sections when possible."
```

**For Personal Knowledge Base:**
```
System Prompt:
"You are a friendly personal assistant. Help me 
understand my notes and research. Explain things 
simply and remind me of connections between topics."
```

---

## 📖 How to Use

### Step 1: Run New Migration

**Go to Supabase SQL Editor:**  
https://supabase.com/dashboard/project/xgfglimmaaydjrafsqhb/editor/sql

**Run this SQL:**
```sql
-- Add system prompt columns
alter table public.rag_configs
add column if not exists system_prompt text default 'You are a helpful AI assistant. Answer the user''s question based on the provided context. Be concise and accurate. If the context doesn''t contain relevant information, say so.';

alter table public.rag_configs
add column if not exists model text default 'gpt-3.5-turbo';

-- Create prompt templates table
create table if not exists public.rag_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  prompt text not null,
  is_default boolean default false,
  created_at timestamptz not null default now()
);

-- Insert default templates
insert into public.rag_prompt_templates (name, description, prompt, is_default)
values
  ('Default Assistant', 'Helpful, concise, accurate responses', 'You are a helpful AI assistant. Answer the user''s question based on the provided context. Be concise and accurate. If the context doesn''t contain relevant information, say so.', true),
  ('Technical Expert', 'Detailed technical explanations', 'You are a technical expert. Provide detailed, accurate answers based on the context provided. Include technical terms and explanations. If you need more context, ask clarifying questions.', false),
  ('Friendly Tutor', 'Patient, educational responses', 'You are a friendly tutor. Explain concepts clearly and simply based on the provided context. Use examples and analogies. Break down complex topics into understandable parts.', false),
  ('Business Analyst', 'Professional business insights', 'You are a business analyst. Provide professional, data-driven insights based on the context. Focus on actionable information and business implications.', false),
  ('Creative Writer', 'Engaging narrative responses', 'You are a creative writer. Use the context to craft engaging, well-written responses. Make the information interesting and memorable while staying accurate.', false)
on conflict do nothing;
```

---

### Step 2: Pull Latest Code

```bash
git pull origin vkClawd
npm install
npm run dev
```

---

### Step 3: Customize Your AI

#### Open Settings Page
http://localhost:3000/config

#### Select Your Collection
Choose "Zaggle Docs" (or any collection)

#### Click "Customize" Button
This opens the AI personality editor

#### Choose a Template (Quick Start)
Click any pre-built template:
- **Default Assistant** - Balanced, helpful
- **Technical Expert** - Detailed, technical
- **Friendly Tutor** - Simple, educational
- **Business Analyst** - Professional, actionable
- **Creative Writer** - Engaging, memorable

#### Or Write Custom Prompt
```
Example for Zaggle:
"You are a Zaggle documentation assistant. 
Answer questions about company policies, HR 
guidelines, and procedures. Be professional 
and cite document names. If information is 
not in the documents, say 'This information 
is not in the current documentation.'"
```

#### Select Model
- **GPT-3.5 Turbo** - Fast, cost-effective (recommended)
- **GPT-4** - Most capable, higher cost
- **GPT-4 Turbo** - Balanced performance

#### Click "Save Settings"
Your prompt is now active!

---

## 🧪 Testing Your Custom Prompt

### Test 1: Default Behavior
1. Go to Chat
2. Ask: "Hello"
3. **With default prompt:** Generic friendly response
4. **With Zaggle prompt:** "Hello! I'm here to help you with Zaggle documentation..."

### Test 2: Professional Tone
1. Ask: "What is the vacation policy?"
2. **With default:** Casual answer
3. **With business analyst:** Professional, structured response

### Test 3: Educational Style
1. Use "Friendly Tutor" template
2. Ask: "Explain expense reimbursement"
3. Get: Step-by-step, simple explanation

---

## 📊 Prompt Engineering Tips

### Good Prompts:

✅ **Specific Role:**
```
"You are a [role] specializing in [domain]."
```

✅ **Clear Instructions:**
```
"Answer questions by: 
1. Citing the source document
2. Providing page numbers if available
3. Using bullet points for clarity"
```

✅ **Tone Guidance:**
```
"Be professional but friendly. Use simple language. 
Avoid jargon unless necessary."
```

✅ **Fallback Behavior:**
```
"If the answer isn't in the provided context, say: 
'I don't see this information in the current documents. 
Would you like me to suggest where to find it?'"
```

### Bad Prompts:

❌ **Too Vague:**
```
"Be helpful."  // What does helpful mean?
```

❌ **Contradictory:**
```
"Be very detailed but extremely concise."  // Pick one!
```

❌ **Too Long:**
```
[500 word essay about AI behavior]  // Keep it under 200 words
```

---

## 🎯 Use Cases

### Customer Support Docs
```
"You are a customer support AI. Answer questions 
about products and policies. Be empathetic and 
solution-oriented. Always end with 'Is there 
anything else I can help with?'"
```

### Technical Documentation
```
"You are a senior engineer. Provide accurate 
technical answers with code examples when relevant. 
Explain complex concepts step-by-step."
```

### Company Knowledge Base
```
"You are an internal company assistant for [Company]. 
Help employees find information about policies, 
procedures, and resources. Cite handbook sections."
```

### Research Papers
```
"You are a research assistant. Summarize findings 
accurately, cite paper titles and authors, and 
highlight key insights and methodologies."
```

### Legal Documents
```
"You are a legal research assistant. Answer 
questions about contracts and policies. Be precise, 
cite specific clauses, and note any ambiguities."
```

---

## 🔧 Troubleshooting

### Settings Page Blank

**Check:**
1. Browser console (F12) - any errors?
2. Collection selected?
3. Database migration ran?

**Fix:**
- Refresh page
- Select a collection from dropdown
- Run migration SQL if not done

### "Failed to Load" Error

**Causes:**
- Supabase connection issue
- Migration not run
- Invalid collection ID

**Fix:**
1. Check `.env.local` has correct keys
2. Run migration SQL
3. Check Supabase dashboard for errors

### Prompt Not Affecting Answers

**Check:**
1. Did you click "Save Settings"?
2. Refresh chat page after saving
3. Check if OpenAI API key is set

**Test:**
```bash
# Check if config saved
curl "http://localhost:3000/api/config?collectionId=YOUR_ID"
# Should show your custom system_prompt
```

### Network Errors in Console

**Before fix:** Multiple 500 errors  
**After fix:** Should see 200 OK responses

**If still seeing errors:**
1. Check browser DevTools → Network tab
2. Look for failed requests (red)
3. Click on failed request
4. Check "Response" tab for error message
5. Report exact error

---

## 📈 Impact on Answers

### Before Custom Prompts:
```
Q: What is the vacation policy?
A: Based on retrieved chunks: employees are entitled 
   to vacation days...
```
*Simple concatenation, no intelligence*

### After Custom Prompts:
```
Q: What is the vacation policy?
A: According to the Employee Handbook (Section 4.2), 
   Zaggle offers:
   
   • 15 days paid vacation annually
   • Pro-rated for new hires
   • Must be approved 2 weeks in advance
   
   Would you like details about holiday rollover?
```
*Structured, professional, contextual*

---

## 💡 Pro Tips

### 1. Different Prompts for Different Collections

**IT Docs Collection:**
```
"You are an IT support specialist..."
```

**HR Docs Collection:**
```
"You are an HR assistant..."
```

### 2. Iterative Refinement

Start simple:
```
"You are a helpful assistant."
```

Add specificity:
```
"You are a helpful assistant for Zaggle employees."
```

Add instructions:
```
"You are a helpful assistant for Zaggle employees. 
Cite document names and be professional."
```

Add fallback:
```
"...If information is missing, suggest who to contact."
```

### 3. Test Different Models

**For quick questions:** GPT-3.5 Turbo  
**For complex analysis:** GPT-4  
**For balanced use:** GPT-4 Turbo  

### 4. Monitor Costs

GPT-4 costs ~10-15x more than GPT-3.5

**Recommendation:**
- Use GPT-3.5 Turbo by default
- Switch to GPT-4 only if needed

---

## 📊 Before & After Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **Settings Page** | Blank/broken | ✅ Works with prompts |
| **AI Responses** | Generic | ✅ Customizable |
| **Error Handling** | Silent failures | ✅ Clear messages |
| **Personality** | Fixed | ✅ 5+ templates |
| **Model Choice** | None | ✅ GPT-3.5/4 selection |
| **Per-Collection** | No | ✅ Yes |

---

## 🎉 Summary

### ✅ Fixed Issues:
1. Settings page now loads correctly
2. Network errors resolved
3. Proper OpenAI integration
4. Better error messages

### ✨ New Features:
1. Custom system prompts
2. 5 pre-built templates
3. Rich prompt editor
4. Model selection
5. Per-collection prompts

### 🚀 Next Steps:
1. Run migration (Step 1)
2. Pull latest code (Step 2)
3. Customize your prompt (Step 3)
4. Test with Zaggle docs
5. Refine based on results

---

**Your AI assistant is now fully customizable!** 🤖✨

Try different prompts and see what works best for your use case!
