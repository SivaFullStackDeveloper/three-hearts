# Three Hearts One Destiny — WhatsApp UI + Local History + Full Social Filter

## Folder Structure
Place `index-v3.html` inside a `public/` folder and rename it to `index.html`:

```text
three-hearts-one-destiny/
├── package.json
├── server.js
├── README.md
└── public/
    └── index.html
```

## What's Included
1. **Local & Server Chat Saving:**
   - Messages are saved in the user's browser (`localStorage`) so refreshing the page keeps their chat history.
   - The server also keeps the latest 200 messages in `chat_history.json` so new joiners see recent group conversation.
2. **WhatsApp-Style Interface:**
   - Dark WhatsApp group chat theme (`#0b141a` background, `#005c4b` outgoing bubbles with double blue ticks, color-coded member names, and a built-in emoji picker button `😊`).
3. **Comprehensive Social Media, Number & Email Blocker:**
   - Allows all emojis and normal conversation, while permanently banning any IP that tries to share or ask for:
     - Phone numbers (digits, spaced digits like `9 8 7 6 5 4 3 2 1 0`, or spelled-out digits like `nine eight seven six five four`)
     - Email addresses (`gmail`, `yahoo`, `outlook`, `icloud`, `protonmail`, `@`, `at gmail`)
     - Links & domains (`.com`, `.in`, `http`, `www`)
     - **60+ Social, Messaging, Dating & Payment Platforms:** Instagram (`insta`, `ig`), WhatsApp (`wa`), Snapchat (`snap`), Telegram (`tg`), Facebook (`fb`), Twitter/X, TikTok, YouTube, LinkedIn, Reddit, Pinterest, Threads, Bluesky, Discord, Signal, Viber, WeChat, Line, KakaoTalk, Skype, Imo, Botim, ShareChat, Moj, Josh, Chingari, Koo, Hike, Tango, Bigo, Chamet, Azar, Omegle, Tinder, Bumble, Hinge, TrulyMadly, QuackQuack, Happn, Aisle, Yubo, Locket, BeReal, Twitch, Steam, BGMI/PUBG, and UPI/GPay/PhonePe/Paytm IDs.
4. **IP Logs & Admin API:**
   - View logs: `GET http://localhost:3000/api/logs?key=destiny-admin-2026`
   - Download logs: `GET http://localhost:3000/api/logs/download?key=destiny-admin-2026`
