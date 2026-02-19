# 🔍 Search Transparency & Document Viewer

## Overview

The RAG Chat app now provides **complete transparency** into the hybrid search process and allows users to **view source documents** with highlighted sections.

---

## ✨ New Features

### 1. Hybrid Search Breakdown 📊

**What it shows:**
- **AI (Vector) Search Results** - Semantic similarity scores
- **Keyword (Text) Search Results** - Exact word match scores
- **Merge Process** - How the two are combined
- **Final Ranking** - Weighted scores for each result
- **Configuration** - Current search settings (AI weight vs Keyword weight)

**How to use:**
1. Ask a question
2. See answer
3. Click "🔍 Hybrid Search Breakdown" to expand
4. View detailed scoring for all results

**Example:**
```
Question: "What is machine learning?"

Search Breakdown:
⚙️ Configuration: 70% AI Weight | 30% Keyword Weight

📊 Final Ranked Results:
#1 AI Basics Document - Score: 85%
   AI: 90% | Keyword: 70%
   "Machine learning is a subset of AI..."

#2 Deep Learning Guide - Score: 72%
   AI: 80% | Keyword: 50%
   "Neural networks enable machines to learn..."
```

---

### 2. Document Viewer with Highlighting 📄

**What it does:**
- Click "View full document" on any citation
- Opens full document in modal popup
- **Automatically highlights** the cited section in yellow
- Shows document title and full content
- Preserves paragraph formatting

**How to use:**
1. See sources/citations in chat
2. Click "📄 View full document"
3. Modal opens with full text
4. Cited section is highlighted in yellow
5. Scroll to read full context
6. Click × to close

**Visual Design:**
- Modal overlay with backdrop
- Highlighted paragraphs have:
  - Yellow background (`bg-yellow-100`)
  - Blue left border
  - Padding for emphasis
  - Bold text for readability

---

### 3. Detailed Score Breakdown 🎯

**Every result now shows:**
- **Final Score** - Weighted combination (0-100%)
- **AI Score** - Semantic similarity (0-100%)
- **Keyword Score** - Text relevance (0-100%)
- **Rank** - Position in results (#1, #2, etc.)

**Color Coding:**
- 🔵 **Blue** - AI/Vector scores
- 🟢 **Green** - Keyword/Text scores
- 📊 **Final** - Combined score (main metric)

**Example Display:**
```
#1 Document Title
"Preview of content chunk..."
━━━━━━━━━━━━━━━━━━━━━━
Score: 85%
AI: 90% | Keyword: 70%
```

---

### 4. Citations & Sources 📚

**Enhanced citation cards:**
- Document title
- Content snippet (150 chars)
- Relevance score percentage
- "View full document" button
- Clickable to open document viewer
- Shows which chunk was used

**Example:**
```
📚 Sources & Citations

1. AI Basics Document                    85%
   "Machine learning is a subset..."
   📄 View full document

2. Deep Learning Guide                   72%
   "Neural networks enable..."
   📄 View full document
```

---

## 🎨 UI Components

### Search Breakdown Card
- **Collapsible** - Click to expand/collapse
- **Badge** - Shows number of results
- **Sections:**
  - Configuration (weights)
  - Final ranked results
  - Individual scores per result
- **Color-coded badges** for different score types

### Document Viewer Modal
- **Full-screen overlay** with dark backdrop
- **White card** centered on screen
- **Header:**
  - Document title
  - Description text
  - Close button (×)
- **Content area:**
  - Scrollable full document
  - Highlighted paragraphs
  - Preserved formatting

### Citation Cards
- **Numbered** for easy reference
- **Score badge** on right
- **Content preview** in italics
- **View document button** at bottom
- **Hover effect** for interactivity

---

## 📊 Technical Implementation

### API Endpoints

**GET `/api/documents/[id]`**
- Fetches full document by ID
- Returns all chunks in order
- Reconstructs full content
- Includes metadata

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "source_type": "paste",
    "created_at": "2026-02-19...",
    "fullContent": "Full reconstructed text...",
    "chunks": [
      {
        "id": "chunk-uuid",
        "chunk_index": 0,
        "content": "First chunk...",
        "meta": {}
      }
    ]
  }
}
```

### Hybrid Search Enhanced

**Modified `runHybridSearch()`:**
- Returns `vectorCandidates` array in debug mode
- Returns `textCandidates` array in debug mode
- Each candidate includes:
  - Chunk ID
  - Score
  - Content snippet (200 chars)
  - Document title

**Debug Response:**
```json
{
  "results": [...],
  "debug": {
    "config": { "w_vec": 0.7, "w_text": 0.3, ... },
    "counts": { "vec": 10, "text": 8, "merged": 12 },
    "vectorCandidates": [
      {
        "chunkId": "...",
        "score": 0.85,
        "content": "Snippet...",
        "title": "Document"
      }
    ],
    "textCandidates": [...]
  }
}
```

### Document Reconstruction

**Algorithm:**
1. Fetch document by ID
2. Get all chunks ordered by `chunk_index`
3. Join chunks with `\n\n` separator
4. Return full content + chunk list
5. Frontend splits by paragraphs
6. Highlights paragraphs containing citation text

---

## 🎯 User Benefits

### For End Users
✅ **Understand results** - See why something ranked #1  
✅ **Verify information** - Check source documents  
✅ **Build trust** - Transparency increases confidence  
✅ **Learn the system** - See how hybrid search works  
✅ **Find context** - Read full document for more info

### For Developers
✅ **Debug search** - See what's happening under the hood  
✅ **Tune parameters** - Understand impact of weight changes  
✅ **Validate quality** - Check if right chunks are retrieved  
✅ **Explain to users** - Show why certain results appear  
✅ **Educational** - Demonstrate RAG concepts

### For Researchers
✅ **Analyze retrieval** - Study search effectiveness  
✅ **Compare methods** - Vector vs keyword performance  
✅ **Optimize settings** - Data-driven tuning  
✅ **Audit results** - Ensure quality and relevance

---

## 📖 User Guide

### Viewing Search Breakdown

1. **Ask a question** in chat
2. **Scroll to answer** - Wait for response
3. **Find the breakdown card** - Gray card with 🔍 icon
4. **Click to expand** - Shows all search details
5. **Review results:**
   - Check configuration weights
   - See final ranked list
   - Compare AI vs Keyword scores
6. **Click to collapse** - Hide details when done

### Viewing Source Documents

1. **Find citation** in answer sources
2. **Click "View full document"** button
3. **Modal opens** with full text
4. **Scroll to yellow highlight** - Auto-highlighted section
5. **Read context** around the citation
6. **Click ×** or backdrop to close

### Understanding Scores

**Final Score (0-100%):**
- Weighted combination of AI + Keyword
- Formula: `(AI% × 70) + (Keyword% × 30)`
- Higher = More relevant

**AI Score (0-100%):**
- Semantic similarity to query
- Uses OpenAI embeddings
- Understands meaning, not just words

**Keyword Score (0-100%):**
- Text matching relevance
- PostgreSQL full-text search
- Finds exact word matches

**Example:**
```
Query: "machine learning algorithms"

Result: "ML techniques for classification"
- AI Score: 95% (understands ML = machine learning)
- Keyword Score: 60% (only "machine" matched exactly)
- Final: (95 × 0.7) + (60 × 0.3) = 84.5%
```

---

## 🧪 Testing Guide

### Test Search Breakdown

1. Upload document with AI concepts
2. Ask: "What is neural networks?"
3. Expand search breakdown
4. Verify:
   - ✅ Config shows current weights
   - ✅ Results are ranked by score
   - ✅ Each result has AI and Keyword scores
   - ✅ Scores add up correctly

### Test Document Viewer

1. Click "View full document" on source
2. Verify:
   - ✅ Modal opens centered
   - ✅ Document title shows in header
   - ✅ Full content displays
   - ✅ Cited section highlighted in yellow
   - ✅ Can scroll through document
   - ✅ Close button works
   - ✅ Clicking backdrop closes modal

### Test Score Accuracy

1. Upload two documents:
   - Doc A: About "machine learning"
   - Doc B: About "cooking recipes"
2. Ask: "What is machine learning?"
3. Check:
   - ✅ Doc A ranks higher
   - ✅ Doc A has high AI score
   - ✅ Doc B has low score (if it appears)

---

## 🔧 Configuration

### Search Weights (in Settings)

**AI Weight (w_vec):**
- Default: 70%
- Range: 0-100%
- Higher = More semantic understanding
- Best for: Conceptual questions

**Keyword Weight (w_text):**
- Default: 30%
- Range: 0-100%
- Higher = More exact matching
- Best for: Specific terms, names

**Constraint:** AI% + Keyword% must = 100%

---

## 🎨 Customization

### Highlight Color

**Current:** Yellow (`bg-yellow-100`)

**To change:**
Edit `chat/page.tsx`:
```tsx
className={`mb-4 ${
  isHighlighted 
    ? 'bg-yellow-100 border-l-4 border-yellow-500' // Change colors here
    : ''
}`}
```

**Alternatives:**
- Blue: `bg-blue-100 border-blue-500`
- Green: `bg-green-100 border-green-500`
- Orange: `bg-orange-100 border-orange-500`

### Score Display

**Current format:** Percentage (0-100%)

**To change to decimal:**
```tsx
// From:
{(result.finalScore * 100).toFixed(0)}%

// To:
{result.finalScore.toFixed(2)}
```

---

## 🚀 Future Enhancements

### Potential Additions:
1. **Export breakdown** - Download as JSON/CSV
2. **Compare queries** - Side-by-side search results
3. **Highlight multiple chunks** - If citation spans paragraphs
4. **PDF viewer** - For uploaded PDF documents
5. **Edit highlighting** - Let users select text to highlight
6. **Share document view** - Link to specific highlighted section
7. **Search history** - Review past breakdowns
8. **A/B testing** - Compare different weight configurations
9. **Relevance feedback** - Thumbs up/down on results
10. **Custom annotations** - Add notes to documents

---

## 📊 Example Workflow

### Research Use Case

**Scenario:** Researching AI ethics

1. **Upload documents:**
   - "AI Ethics Principles.txt"
   - "Machine Learning Bias Study.txt"
   - "Responsible AI Guidelines.txt"

2. **Ask:** "What are the main concerns about AI bias?"

3. **View answer** with citations

4. **Expand search breakdown:**
   - See all 3 documents were considered
   - Ethics doc ranked #1 (95%)
   - Bias study #2 (88%)
   - Guidelines #3 (72%)

5. **Click "View full document"** on Bias study

6. **Read highlighted section** about algorithmic discrimination

7. **Scroll down** to read methodology section

8. **Close and verify** - Satisfied with source quality

9. **Continue conversation** - Ask follow-up questions

---

## 🎯 Summary

**What users see:**
- ✅ **Transparent search** - How results are found and ranked
- ✅ **Full documents** - Complete source material with highlighting
- ✅ **Score breakdown** - AI + Keyword + Final scores
- ✅ **Verification** - Ability to check sources directly

**Impact:**
- 📈 **Trust** - Users see the search process
- 🎓 **Education** - Learn how RAG works
- ✅ **Accuracy** - Verify information easily
- 🔍 **Discovery** - Find related content in documents

**Technical quality:**
- 🚀 **Fast** - Modal loads instantly (content cached)
- 💾 **Efficient** - Only fetches documents when clicked
- 🎨 **Beautiful** - Modern UI with smooth animations
- 📱 **Responsive** - Works on mobile and desktop

---

**The search is now completely transparent and verifiable!** 🎉
