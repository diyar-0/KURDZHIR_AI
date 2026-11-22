# KURDZHIR AI، وەشانی Classic (React + Vite)

چاتێکی ئاسایی و سادە بە کوردی سۆرانی و ڕاستبۆچەپ (RTL)، بە دیزاینی «ڕۆژ»: هێمای ڕۆژی ٢١ تیشکی، سەوزی قووڵ و زەردی ڕۆژ.
بە Gemini و Groq بەستراوەتەوە و وەڵامەکان بە **stream** دێن، واتە دەق هەر لەو کاتەوە دەردەکەوێت کە مۆدێل دەستی پێکرد.

## کارپێکردن

پێویستت بە [Node.js](https://nodejs.org) (وەشانی ٢٢.١٣ یان نوێتر) هەیە.

یەک جار:

```bash
npm install
```

دواتر هەموو کاتێک تەنها ئەمە:

```bash
npm run dev
```

ئەم یەک فەرمانە **هەردووکیان** پێکەوە هەڵدەستێنێت: سێرڤەری AI (پۆرتی 8787) و ڕووکارەکە (پۆرتی 5173).
دواتر ئەو ناونیشانەی لە تێرمیناڵ دەردەکەوێت بکەرەوە (بەزۆری http://localhost:5173).
بۆ وەستاندنی هەردووکیان: `Ctrl + C`.

ئەگەر بتەوێت بە جیا کار پێبکەن: `npm run server` و `npm run web`.

## تاقیکردنەوە

بۆ جێبەجێکردنی تاقیکردنەوە خۆکارەکان:

```bash
npm test
```

ئەگەر براوزەر ڕێگەی خەزنکردن نەدات یان شوێنی خەزن پڕ بێت، ئەپەکە ئاگادارت دەکاتەوە کە گفتوگۆکان خەزن نەکراون.

فایلی `.env` بەم شێوەیە:

```
GEMINI_API_KEY=کلیلەکەت
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_ALLOWED_MODELS=gemini-3.5-flash-lite
GROQ_API_KEY=کلیلی Groq
GROQ_MODEL_1=openai/gpt-oss-120b
GROQ_MODEL_2=openai/gpt-oss-20b
FREESEA_API_KEY=کلیلەکەی Freesea
CHAT_RATE_LIMIT=15
CHAT_RATE_WINDOW_MS=60000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

مۆدێلەکانی Gemini لە `GEMINI_MODEL` و `GEMINI_ALLOWED_MODELS` و مۆدێلەکانی Groq لە ڕێکخستنی AI دەردەکەون. `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` کلیلی گشتیی browser ـن؛ هەرگیز `service_role` key لە `.env` ـی frontend دابنەنێ.

## ئەوەی کار دەکات

- چات بە بلبل: پەیامی تۆ بە سەوزی، وەڵامی AI بە ڕۆژێکی بچووکەوە.
- لیستی گفتوگۆ: گەڕان، ناونانەوە، پینکردن، سڕینەوە و گەڕاندنەوەی سڕاوەکان.
- بەکارهێنانی بێ هەژمار لە local storage؛ بە Google Sign-In چوونەژوورەوە و sync ـی چات لە Supabase.
- هەناردە/هاوردەکردنی پشتگیریی گفتوگۆکان، پاککردنەوەی چات و سڕینەوەی هەژمار.
- سڕینەوەی چاتە ناپینکراوەکان بە پشتڕاستکردنەوە؛ چاتە پینکراوەکان دەمێننەوە.
- گۆڕینی دابینکەری Gemini/Groq و مۆدێل، شێوازی وەڵام و درێژییەکەی لە ڕێکخستندا.
- Markdown و بلۆکی کۆد لەگەڵ دوگمەی کۆپی.
- دوگمەی وەستان، دووبارە، باشبوو و کۆپی بۆ هەر وەڵامێک.
- هاوپێچکردنی دەق، PDF ـی دەقی و وێنەی JPG/PNG/WebP (تا ٣ فایل).
- نووسین بە دەنگ (Chrome و Edge باشترن). زمانەکەی لە `src/data.js` دەگۆڕدرێت.
- ڕووکاری ڕۆژ و شەو، responsive layout و کۆنترۆڵی کیبۆرد.
- سنووردانانی داواکاریی AI بەپێی IP بۆ کەمکردنەوەی بەکارهێنانی نالەبار.

## ڕێکخستنی Supabase و Gmail

١. پڕۆژەیەک لە Supabase دروست بکە و لە **Project Settings → API**، Project URL و publishable/anon key وەربگرە.
٢. ئەو دوو نرخە لە `.env` ـدا دابنێ: `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.
٣. لە **Authentication → Providers → Google**، Google provider چالاک بکە و OAuth Client ID/Secret ـەکەت تەنها لە Supabase dashboard دابنێ. Redirect URI ـی Supabase کە dashboard پیشانی دەدات لە Google Cloud Console تۆمار بکە؛ هەروەها `http://localhost:5173` لە Site URL / Redirect URLs زیاد بکە.
٤. SQL ـی `supabase/migrations/20261109000000_initial.sql` لە SQL Editor ـی Supabase جێبەجێ بکە (یان بە Supabase CLI migration ـەکان push بکە).
٥. بۆ سڕینەوەی هەژمار، Edge Function ـەکە deploy بکە: `supabase functions deploy delete-account`. `SUPABASE_SERVICE_ROLE_KEY` تەنها وەک secret ـی Edge Function بهێڵە؛ مەیخە ناو `.env` ـی browser.
٦. دوای گۆڕینی `.env`، dev server دووبارە هەڵبکەرەوە. بێ Supabase ڕووکارەکە بە شێوەی local کاردەکات، بەڵام Google Sign-In و sync بەردەست نابن.

چات و هاوپێچەکان لە هەژمارەکەتدا بە JSONB خەزن دەکرێن. RLS سنووری هەر بەکارهێنەرێک بۆ داتای خۆی جێبەجێ دەکات. بۆ بەکارهێنانی production، Google OAuth redirect ـی دۆمەینەکەت زیاد بکە و rate limiting ـی سێرڤەر بە gateway یان storage ـێکی پایەدار بەهێزتر بکە؛ سنووری ئێستا لە مێمۆری سێرڤەرە و دوای restart نوێ دەبێتەوە.

## ڕێکخستنی AI و گەڕانی وێب

- `GEMINI_API_KEY` پێویستە؛ سێرڤەری `server.js` کلیلی AI لە `.env` دەخوێنێتەوە و لە براوزەر نایخاتەڕوو.
- `GEMINI_MODEL` ئارەزوومەندانەیە؛ ئەگەر دانەنرێت سێرڤەر `gemini-3.1-flash-lite` بەکاردەهێنێت.
- `GEMINI_MODEL` و `GROQ_MODEL_1`... مۆدێلەکانی هەر provider ـێک دەخەنە هەڵبژاردنی AI؛ بۆ بەکارهێنانی مۆدێلەکانی Groq، `GROQ_API_KEY` دابنێ.
- `GEMINI_ALLOWED_MODELS` دەتوانێت مۆدێلەی زیادەی Gemini بە لیستی بەکۆما جیاکراو زیاد بکات.
- `CHAT_RATE_LIMIT` و `CHAT_RATE_WINDOW_MS` سنووری داواکارییەکانی IP دیاری دەکەن.
- `FREESEA_API_KEY` تەنها بۆ ئامرازی گەڕانی وێب پێویستە. بێ ئەو کلیلیە، چات کاردەکات بەڵام گەڕانی وێب بەردەست نابێت.
- `src/api.js` پەیوەندیی ڕووکارەکە بە `POST /api/chat` بەڕێوەدەبات؛ `src/agent/agentCore.js` و `src/agent/toolRegistry.js` بەشی مۆدێل و ئامرازەکانی سێرڤەرن.

## گۆڕینی دیزاین

- ڕەنگەکان: سەرەتای `src/styles.css` (`--brand` سەوز، `--sun` زەرد، بۆ ڕۆژ و شەو).
- ناو، ناوی مۆدێل و کارتەکانی بەخێرهاتن: `src/data.js`.

## پێکهاتە

```
src/
  api.js              تەنها شوێنی پەیوەندی بە AI (بیگۆڕە)
  data.js             ناو، کارتەکان، زمانی دەنگ
  App.jsx             لۆژیکی سەرەکی
  styles.css          هەموو دیزاینەکان
  components/         Sidebar, Welcome, Message, Composer, Sun, Markdown, CodeBlock, Toast, Icon
  hooks/              useChats, useTheme, useTypewriter, useSpeech
  lib/                markdown, chats, clipboard, storage
```
