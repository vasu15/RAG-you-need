# Hardcoded Prompts Reference

All prompts in the codebase that are **not** configured by the user (no DB/config UI). User-configured prompts (collection system prompt, global personality) are stored in Supabase and edited in the app; they are not listed here.

---

## 1. Query rewriter system prompt

**File:** `src/lib/rewriter/prompts.ts`  
**Export:** `REWRITER_SYSTEM_PROMPT`

Used by the LLM that rewrites follow-up messages into standalone search queries (before retrieval). Topic-agnostic; not editable in the UI.

**Full text:**

```
You are a search query rewriter. Your ONLY job is to make the user's latest message into a standalone search query.

Given the conversation history and the latest user message, output a single self-contained search query that would work WITHOUT any conversation context.

RULES:
1. If the message is already standalone and clear — return it exactly as-is. Do not rephrase clear queries.
2. If it has implicit references (pronouns, "also", "same", "too", topic continuation, "and the...?") — resolve them using conversation history.
3. Preserve all specific names, terms, and details from the conversation.
4. Do NOT add information that isn't in the conversation.
5. Do NOT answer the question.
6. Max 25 words.
7. Output ONLY the rewritten query. No quotes, no prefix, no explanation.
8. When the latest message REFERS TO or CONTINUES the conversation (same topic, pronouns, "also", "same", "that") — resolve references using history and output a standalone query that carries over the relevant context.
9. When the latest message DOES NOT REFER to the conversation (new question, new topic, or clearly standalone) — output that message as a standalone query only; do NOT add names, products, or details from history.

EXAMPLES:
[... see src/lib/rewriter/prompts.ts for full examples ...]
```

**User message format** (built by `buildRewriterMessage(historyStr, latestMessage)`):

- With history: `History:\n{historyStr}\n\nLatest: {latestMessage}\n→`
- No history: `History: [none]\n\nLatest: {latestMessage}\n→`

---

## 2. Answer API – default RAG system prompt (fallback)

**File:** `src/app/api/answer/route.ts`  
**Variable:** `defaultPrompt`

Used when neither **global personality** nor **collection system prompt** is set. Defines how the answer LLM should use the retrieved context.

**Full text:**

```
You are a RAG assistant. You receive a question and a retrieved context. Answer using that context. When the context clearly contains the answer, give a direct answer. When the context is ambiguous or supports multiple interpretations, ask a targeted question so you can give a clear answer. When the context does not contain relevant information, say so.
```

**Selection logic:**

- If global personality is enabled and `rag_global_settings.global_system_prompt` is set → use that.
- Else use `rag_configs.system_prompt` for the collection if set.
- Else use `defaultPrompt` above.

---

## 3. Answer API – user message template (RAG instruction)

**File:** `src/app/api/answer/route.ts`  
**Variable:** `userMessage` (template string)

Instruction sent to the answer LLM as the **user** message; wraps the retrieved context and the user question. Not configurable.

**Template:**

```
Answer the following question using only the context below. Sources are ordered by relevance (Source 1 is most relevant).

Context from documents:

${context}

Question: ${query}
```

`context` = concatenation of `[Source N: {title}]\n{content}` for each top chunk. `query` = current user question.

---

## 4. Answer API – no results reply

**File:** `src/app/api/answer/route.ts`  
**Location:** When `top.length === 0` (no retrieval results)

Shown to the user when hybrid search returns no chunks. Not configurable.

**Full text:**

```
I couldn't find any relevant information in the documents to answer your question.
```

---

## 5. Answer API – fallback when LLM fails

**File:** `src/app/api/answer/route.ts`  
**Location:** When no API key or all providers fail

Used when the answer LLM is not called or returns nothing. Not configurable.

**Template:**

```
Based on the documents:

${top[0].content.slice(0, 500)}
```

So the user sees the first 500 characters of the top chunk.

---

## Summary

| # | Purpose                     | File                        | Configurable? |
|---|-----------------------------|-----------------------------|---------------|
| 1 | Query rewriter system       | `src/lib/rewriter/prompts.ts` | No            |
| 2 | Default RAG system prompt   | `src/app/api/answer/route.ts` | No (fallback) |
| 3 | RAG user message template   | `src/app/api/answer/route.ts` | No            |
| 4 | No results reply            | `src/app/api/answer/route.ts` | No            |
| 5 | LLM failure fallback        | `src/app/api/answer/route.ts` | No            |

User-configured prompts (not in this list):

- **Per collection:** `rag_configs.system_prompt` (Settings / Config UI).
- **Global personality:** `rag_global_settings.global_system_prompt` when “Apply personality to all” is on (Settings / Global).
