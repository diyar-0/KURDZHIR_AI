# KURDZHIR AI — Classic (React + Vite)

چاتێکی ئاسایی و سادە بە کوردی سۆرانی و ڕاستبۆچەپ (RTL)، بە دیزاینی «ڕۆژ»: هێمای ڕۆژی ٢١ تیشکی، سەوزی قووڵ و زەردی ڕۆژ.

ئەم وەشانە بە **Google Gemini** بەستراوەتەوە و وەڵامەکان بە شێوازی **Streaming** دەردەکەون؛ واتە دەق هەر لەو کاتەوە دەردەکەوێت کە مۆدێل دەستی پێکرد.

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

ئەم یەک فەرمانە هەردووکیان پێکەوە هەڵدەستێنێت: سێرڤەری AI (پۆرتی 8787) و ڕووکارەکە (پۆرتی 5173).

دواتر ئەو ناونیشانەی لە تێرمیناڵ دەردەکەوێت بکەرەوە (بەزۆری http://localhost:5173).

بۆ وەستاندنی هەردووکیان: `Ctrl + C`.

ئەگەر بتەوێت بە جیا کار پێبکەن:

```bash
npm run server
npm run web
```

## تاقیکردنەوە

بۆ جێبەجێکردنی تاقیکردنەوە خۆکارەکان:

```bash
npm test
```

ئەگەر براوزەر ڕێگەی خەزنکردن نەدات یان شوێنی خەزن پڕ بێت، ئەپەکە ئاگادارت دەکاتەوە کە گفتوگۆکان خەزن نەکراون.

## ڕێکخستنی Environment

فایلی `.env` بەم شێوەیە ڕێکبخە:

```env
GEMINI_API_KEY=کلیلەکەت
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_ALLOWED_MODELS=gemini-3.5-flash-lite

FREESEA_API_KEY=کلیلەکەی_Freesea

CHAT_RATE_LIMIT=15
CHAT_RATE_WINDOW_MS=60000

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## ئەوەی کار دەکات

- چات بە بلۆکی پەیام: پەیامی بەکارهێنەر بە سەوزی، وەڵامی AI بە هێمای ڕۆژێکی بچووکەوە.
- لیستی گفتوگۆ: گەڕان، ناونانەوە، پینکردن، سڕینەوە و گەڕاندنەوەی سڕاوەکان.
- بەکارهێنانی بێ هەژمار لە Local Storage.
- بە Google Sign-In چوونەژوورەوە و Sync ـی چات لە Supabase.
- هەناردە و هاوردەکردنی گفتوگۆکان.
- پاککردنەوەی چات و سڕینەوەی هەژمار.
- سڕینەوەی چاتە ناپینکراوەکان بە پشتڕاستکردنەوە.
- گۆڕینی مۆدێلی Gemini لە ڕێکخستندا.
- Markdown و بلۆکی کۆد لەگەڵ دوگمەی کۆپی.
- دوگمەی وەستان، دووبارەکردنەوە، باشبوو و کۆپی بۆ هەر وەڵامێک.
- هاوپێچکردنی دەق، PDF ـی دەقی و وێنەی JPG/PNG/WebP (تا ٣ فایل).
- نووسین بە دەنگ (Chrome و Edge باشترن).
- ڕووکاری ڕۆژ و شەو.
- Responsive Layout و کۆنترۆڵی کیبۆرد.
- سنووردانانی داواکاریی AI بەپێی IP بۆ کەمکردنەوەی بەکارهێنانی نالەبار.

## ڕێکخستنی Supabase و Gmail

١. پڕۆژەیەک لە Supabase دروست بکە و لە Project Settings → API، Project URL و Publishable/Anon Key وەربگرە.

٢. ئەو دوو نرخە لە `.env` ـدا دابنێ:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

٣. لە Authentication → Providers → Google، Google Provider چالاک بکە و OAuth Client ID/Secret ـەکەت تەنها لە Supabase Dashboard دابنێ.

٤. Redirect URI ـی Supabase لە Google Cloud Console تۆمار بکە.

٥. `http://localhost:5173` لە Site URL / Redirect URLs زیاد بکە.

٦. SQL ـی `supabase/migrations/20261109000000_initial.sql` لە SQL Editor ـی Supabase جێبەجێ بکە.

٧. بۆ سڕینەوەی هەژمار، Edge Function ـەکە Deploy بکە:

```bash
supabase functions deploy delete-account
```

٨. `SUPABASE_SERVICE_ROLE_KEY` تەنها وەک Secret ـی Edge Function بەکاربهێنە؛ هەرگیز لە `.env` ـی Frontend دایمەزرێنە.

دوای گۆڕینی `.env`، Dev Server دووبارە هەڵبکەرەوە.

بێ Supabase ڕووکارەکە بە شێوەی Local کاردەکات، بەڵام Google Sign-In و Sync بەردەست نابن.

## ڕێکخستنی AI و گەڕانی وێب

- `GEMINI_API_KEY`: کلیلی API ـی Gemini ـە و پێویستە.
- `GEMINI_MODEL`: مۆدێلی سەرەکی Gemini دیاری دەکات.
- `GEMINI_ALLOWED_MODELS`: لیستی مۆدێلە زیادەکانی Gemini بە لیستی بەکۆما جیاکراو زیاد دەکات.
- `FREESEA_API_KEY`: تەنها بۆ ئامرازی گەڕانی وێب پێویستە. بێ ئەم کلیلیە چات کاردەکات، بەڵام گەڕانی وێب بەردەست نابێت.
- `CHAT_RATE_LIMIT`: ژمارەی داواکارییە ڕێگەپێدراوەکان دیاری دەکات.
- `CHAT_RATE_WINDOW_MS`: ماوەی کاتی سنووردانان بە میلیچرکە دیاری دەکات.

کلیلی Gemini لە سێرڤەری `server.js` دەخوێنرێتەوە و لە براوزەر نایەڕوو.

`src/api.js` پەیوەندیی ڕووکارەکە بە `POST /api/chat` بەڕێوەدەبات.

`src/agent/agentCore.js` و `src/agent/toolRegistry.js` بەشی مۆدێل و ئامرازەکانی سێرڤەرن.

## گۆڕینی دیزاین

- ڕەنگەکان: سەرەتای `src/styles.css` (`--brand` سەوز، `--sun` زەرد).
- ناو، ناوی مۆدێل و کارتەکانی بەخێرهاتن: `src/data.js`.

## پێکهاتە

```text
src/
  api.js              پەیوەندی بە AI
  data.js             ناو، کارتەکان، زمانی دەنگ
  App.jsx             لۆژیکی سەرەکی
  styles.css          هەموو دیزاینەکان
  components/         Sidebar, Welcome, Message, Composer,
                      Sun, Markdown, CodeBlock, Toast, Icon
  hooks/              useChats, useTheme, useTypewriter, useSpeech
  lib/                markdown, chats, clipboard, storage
```

## تێبینییەکانی Production

- کلیلی API لە سێرڤەر بپارێزە و هەرگیز لە Frontend بڵاوی مەکەرەوە.
- Google OAuth Redirect ـی دۆمەینەکەت زیاد بکە.
- Rate Limiting ـی سێرڤەر بۆ