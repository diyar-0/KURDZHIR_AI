# KURDZHIR AI — Classic (React + Vite)

A simple AI chat application built for Sorani Kurdish with full Right-to-Left (RTL) support, featuring the unique **ROJ (Sun)** identity: a 21-ray sun symbol, deep green, and golden yellow.

This version is powered by **Google Gemini** and supports real-time **Streaming** responses, allowing text to appear as soon as the AI model starts generating it.

## Installation & Setup

**Requirements**

- [Node.js](https://nodejs.org), version 22.13 or newer.

**Install dependencies (first time only):**

```bash
npm install
```

**Start the application:**

```bash
npm run dev
```

This single command starts both services:

- AI Server (Port 8787)
- React + Vite Frontend (Port 5173)

Open the URL displayed in your terminal, usually:

`http://localhost:5173`

To stop both services, press `Ctrl + C`.

**Run services separately:**

```bash
npm run server
npm run web
```

## Testing

Run automated tests:

```bash
npm test
```

If browser storage is unavailable or full, the application notifies you that conversations could not be saved.

## Environment Configuration

Create a `.env` file in the project root and configure it as follows:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_ALLOWED_MODELS=gemini-3.5-flash-lite

FREESEA_API_KEY=YOUR_FREESEA_API_KEY

CHAT_RATE_LIMIT=15
CHAT_RATE_WINDOW_MS=60000

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Features

- Chat interface with user messages in green and AI responses featuring a small Sun symbol.
- Conversation management: search, rename, pin, delete, and restore deleted conversations.
- Guest access using Local Storage without requiring an account.
- Google Sign-In and chat synchronization through Supabase.
- Conversation import and export.
- Chat clearing and account deletion.
- Confirmation before deleting unpinned conversations; pinned conversations are preserved.
- Gemini model selection through settings.
- Markdown rendering and code blocks with copy functionality.
- Stop, regenerate, rate, and copy controls for every AI response.
- File attachments: text, text-based PDF, and JPG/PNG/WebP images (up to 3 files).
- Voice input, with Chrome and Edge recommended.
- Light and dark themes.
- Responsive layout and keyboard controls.
- IP-based AI request rate limiting to reduce abuse.

## Supabase & Google Authentication Setup

1. Create a project in Supabase.
2. Go to **Project Settings → API** and obtain your Project URL and Publishable/Anon Key.
3. Add the following values to your `.env` file:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

4. Go to **Authentication → Providers → Google** and enable Google authentication.
5. Configure your OAuth Client ID and Secret in the Supabase Dashboard.
6. Register the Supabase Redirect URI in Google Cloud Console.
7. Add `http://localhost:5173` to your Site URL / Redirect URLs.
8. Execute the following SQL migration in the Supabase SQL Editor:

`supabase/migrations/20261109000000_initial.sql`

9. Deploy the account deletion Edge Function:

```bash
supabase functions deploy delete-account
```

10. Keep `SUPABASE_SERVICE_ROLE_KEY` exclusively as an Edge Function secret. Never expose it in frontend environment variables.

After changing `.env`, restart the development server.

Without Supabase configuration, the application continues to work locally, but Google Sign-In and cloud synchronization will be unavailable.

## AI & Web Search Configuration

- `GEMINI_API_KEY`: Required Google Gemini API key.
- `GEMINI_MODEL`: Specifies the default Gemini model.
- `GEMINI_ALLOWED_MODELS`: Adds additional allowed Gemini models using a comma-separated list.
- `FREESEA_API_KEY`: Required only for the web search tool. Without this key, chat continues to work, but web search is unavailable.
- `CHAT_RATE_LIMIT`: Defines the maximum number of allowed requests.
- `CHAT_RATE_WINDOW_MS`: Defines the rate-limiting time window in milliseconds.

The Gemini API key is read by the `server.js` server and is never exposed directly to the browser.

`src/api.js` handles communication between the frontend and `POST /api/chat`.

`src/agent/agentCore.js` and `src/agent/toolRegistry.js` contain the server-side AI model and tool management logic.

## Customization

- **Colors:** Edit the CSS variables at the beginning of `src/styles.css` (`--brand` for green and `--sun` for yellow).
- **Branding, model names, and welcome cards:** Edit `src/data.js`.

## Project Structure

```text
src/
  api.js              AI communication
  data.js             Branding, cards, voice language
  App.jsx             Main application logic
  styles.css          Application styles
  components/         Sidebar, Welcome, Message, Composer,
                      Sun, Markdown, CodeBlock, Toast, Icon
  hooks/              useChats, useTheme, useTypewriter, useSpeech
  lib/                markdown, chats, clipboard, storage
```

## Production Notes

- Keep API keys secure on the server and never expose them in frontend code.
- Add your production domain to Google OAuth Redirect URLs.
- Strengthen server-side rate limiting for production using a gateway or persistent storage.

---

# KURDZHIR AI — Classic (React + Vite)

چاتێکی زیرەکی دەستکردی سادە و تایبەت بە زمانی کوردی سۆرانی، بە پشتگیری تەواوی ئاراستەی ڕاستبۆچەپ (RTL)، بە ناسنامەی تایبەتی **ڕۆژ**: هێمای ڕۆژی ٢١ تیشکی، سەوزی قووڵ و زەردی زێڕینی.

ئەم وەشانە بە **Google Gemini** بەستراوەتەوە و وەڵامەکان بە شێوازی **Streaming** دەردەکەون؛ واتە دەق هەر لەو کاتەوە دەردەکەوێت کە مۆدێلی زیرەکی دەست بە دروستکردنی وەڵام دەکات.

## دامەزراندن و ئامادەکردن

**پێداویستییەکان**

- [Node.js](https://nodejs.org)، وەشانی ٢٢.١٣ یان نوێتر.

**دامەزراندنی پێداویستییەکان (تەنها یەک جار):**

```bash
npm install
```

**دەستپێکردنی ئەپەکە:**

```bash
npm run dev
```

ئەم فەرمانە هەردوو خزمەتگوزارییەکە پێکەوە دەستپێدەکات:

- سێرڤەری AI (پۆرتی 8787)
- ڕووکاری React + Vite (پۆرتی 5173)

ئەو ناونیشانە بکەرەوە کە لە تێرمیناڵ دەردەکەوێت، بە زۆری:

`http://localhost:5173`

بۆ وەستاندنی هەردوو خزمەتگوزارییەکە `Ctrl + C` دابگرە.

**کارپێکردنی خزمەتگوزارییەکان بە جیا:**

```bash
npm run server
npm run web
```

## تاقیکردنەوە

بۆ جێبەجێکردنی تاقیکردنەوە خۆکارەکان:

```bash
npm test
```

ئەگەر شوێنی خەزنکردنی براوزەر بەردەست نەبێت یان پڕ بێت، ئەپەکە ئاگادارت دەکاتەوە کە گفتوگۆکان خەزن نەکراون.

## ڕێکخستنی ژینگەی کار

فایلێکی `.env` لە ڕەگی سەرەکی پرۆژەکە دروست بکە و بەم شێوەیە ڕێکی بخە:

```env
GEMINI_API_KEY=کلیلی_Gemini
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_ALLOWED_MODELS=gemini-3.5-flash-lite

FREESEA_API_KEY=کلیلی_Freesea

CHAT_RATE_LIMIT=15
CHAT_RATE_WINDOW_MS=60000

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## تایبەتمەندییەکان

- ڕووکاری چات: پەیامی بەکارهێنەر بە سەوزی و وەڵامی AI لەگەڵ هێمای ڕۆژێکی بچووک.
- بەڕێوەبردنی گفتوگۆکان: گەڕان، ناونانەوە، پینکردن، سڕینەوە و گەڕاندنەوەی گفتوگۆ سڕاوەکان.
- چوونەژوورەوە وەک میوان بە بەکارهێنانی Local Storage، بەبێ پێویستی بە هەژمار.
- چوونەژوورەوە بە Google و هاوکاتکردنی گفتوگۆکان لە ڕێگەی Supabase.
- هاوردە و هەناردەکردنی گفتوگۆکان.
- پاککردنەوەی چات و سڕینەوەی هەژمار.
- پشتڕاستکردنەوە پێش سڕینەوەی چاتە ناپینکراوەکان؛ چاتە پینکراوەکان دەمێننەوە.
- هەڵبژاردنی مۆدێلی Gemini لە ڕێکخستنەکاندا.
- پیشاندانی Markdown و بلۆکی کۆد لەگەڵ تایبەتمەندیی کۆپیکردن.
- کۆنترۆڵی وەستاندن، دووبارەکردنەوە، هەڵسەنگاندن و کۆپیکردن بۆ هەر وەڵامێکی AI.
- هاوپێچکردنی فایل: دەق، PDF ـی دەقی و وێنەی JPG/PNG/WebP (تا ٣ فایل).
- نووسین بە دەنگ، بە پێشنیاری Chrome و Edge.
- ڕووکاری ڕۆژ و شەو.
- دیزاینی Responsive و کۆنترۆڵی کیبۆرد.
- سنووردانانی داواکاریی AI بەپێی IP بۆ کەمکردنەوەی بەکارهێنانی نالەبار.

## ڕێکخستنی Supabase و چوونەژوورەوە بە Google

١. پڕۆژەیەک لە Supabase دروست بکە.

٢. بچۆ بۆ **Project Settings → API** و Project URL و Publishable/Anon Key وەربگرە.

٣. ئەم نرخانە لە فایلی `.env` دابنێ:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

٤. بچۆ بۆ **Authentication → Providers → Google** و چوونەژوورەوە بە Google چالاک بکە.

٥. OAuth Client ID و Secret ـەکەت لە Supabase Dashboard ڕێکبخە.

٦. Redirect URI ـی Supabase لە Google Cloud Console تۆمار بکە.

٧. `http://localhost:5173` لە Site URL / Redirect URLs زیاد بکە.

٨. ئەم SQL Migration ـە لە SQL Editor ـی Supabase جێبەجێ بکە:

`supabase/migrations/20261109000000_initial.sql`

٩. بۆ سڕینەوەی هەژمار، Edge Function ـەکە Deploy بکە:

```bash
supabase functions deploy delete-account
```

١٠. `SUPABASE_SERVICE_ROLE_KEY` تەنها وەک Secret ـی Edge Function بەکاربهێنە. هەرگیز لە Environment ـی Frontend ئاشکرای مەکەرەوە.

دوای گۆڕینی `.env`، سێرڤەری گەشەپێدان دووبارە هەڵبکەرەوە.

بێ ڕێکخستنی Supabase، ئەپەکە بە شێوەی ناوخۆیی کاردەکات، بەڵام چوونەژوورەوە بە Google و هاوکاتکردنی داتا لە Cloud بەردەست نابن.

## ڕێکخستنی AI و گەڕانی وێب

- `GEMINI_API_KEY`: کلیلی API ـی Google Gemini ـە و پێویستە.
- `GEMINI_MODEL`: مۆدێلی بنەڕەتی Gemini دیاری دەکات.
- `GEMINI_ALLOWED_MODELS`: مۆدێلە زیادە ڕێگەپێدراوەکانی Gemini بە لیستی بە کۆما جیاکراو زیاد دەکات.
- `FREESEA_API_KEY`: تەنها بۆ ئامرازی گەڕانی وێب پێویستە. بێ ئەم کلیلیە چات کاردەکات، بەڵام گەڕانی وێب بەردەست نابێت.
- `CHAT_RATE_LIMIT`: زۆرترین ژمارەی داواکاریی ڕێگەپێدراو دیاری دەکات.
- `CHAT_RATE_WINDOW_MS`: ماوەی سنووردانان بە میلیچرکە دیاری دەکات.

کلیلی Gemini لە سێرڤەری `server.js` دەخوێنرێتەوە و لە براوزەر ئاشکرا ناکرێت.

`src/api.js` پەیوەندی لە نێوان ڕووکارەکە و `POST /api/chat` بەڕێوەدەبات.

`src/agent/agentCore.js` و `src/agent/toolRegistry.js` بەشی لۆژیکی AI و بەڕێوەبردنی ئامرازەکانی سێرڤەرن.

## گۆڕینی دیزاین

- **ڕەنگەکان:** دەستکاری CSS Variables لە سەرەتای `src/styles.css` بکە (`--brand` بۆ سەوز و `--sun` بۆ زەرد).
- **ناسنامەی براند، ناوی مۆدێل و کارتەکانی بەخێرهاتن:** دەستکاری `src/data.js` بکە.

## پێکهاتەی پرۆژە

```text
src/
  api.js              پەیوەندی بە AI
  data.js             ناسنامەی براند، کارتەکان، زمانی دەنگ
  App.jsx             لۆژیکی سەرەکی ئەپەکە
  styles.css          هەموو ستایلەکانی ئەپەکە
  components/         Sidebar, Welcome, Message, Composer,
                      Sun, Markdown, CodeBlock, Toast, Icon
  hooks/              useChats, useTheme, useTypewriter, useSpeech
  lib/                markdown, chats, clipboard, storage
```

## تێبینییەکانی بڵاوکردنەوەی وەشانی کۆتایی (Production)

- کلیلی API لە سێرڤەر بپارێزە و هەرگیز لە کۆدی Frontend ئاشکرای مەکەرەوە.
- دۆمەینی Production ـەکەت لە Google OAuth Redirect URLs زیاد بکە.
- بۆ بەهێزکردنی سنووردانانی داواکاری لە وەشانی Production، Gateway یان Storage ـێکی پایەدارتر بەکاربهێنە.