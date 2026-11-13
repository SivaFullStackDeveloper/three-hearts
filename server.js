const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('trust proxy', true);

const BAN_FILE = path.join(__dirname, 'banned_ips.json');
const LOG_FILE = path.join(__dirname, 'user_logs.json');
const CHAT_HISTORY_FILE = path.join(__dirname, 'chat_history.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'destiny-admin-2026';

// --- Ban Storage ---
function loadBannedIPs() {
  try {
    if (fs.existsSync(BAN_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(BAN_FILE, 'utf8')));
    }
  } catch (err) {
    console.error('Error reading ban file:', err);
  }
  return new Set();
}

const bannedIPs = loadBannedIPs();

function banIP(ip) {
  bannedIPs.add(ip);
  fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
}

// --- Local Chat History Storage ---
function loadChatHistory() {
  try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading chat history:', err);
  }
  return [];
}

const chatHistory = loadChatHistory();

function saveHistoryFile() {
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

function saveMessageToHistory(msgObj) {
  chatHistory.push(msgObj);
  if (chatHistory.length > 250) {
    chatHistory.shift();
  }
  saveHistoryFile();
}

// --- Activity & IP Logging ---
function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading log file:', err);
  }
  return [];
}

const activityLogs = loadLogs();

function appendLog(entry) {
  const record = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  activityLogs.push(record);
  if (activityLogs.length > 5000) {
    activityLogs.shift();
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify(activityLogs, null, 2));
}

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address;
}

// --- Admin API Endpoints ---
app.get('/api/logs', (req, res) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
  }
  res.json({
    total_logs: activityLogs.length,
    banned_ips: [...bannedIPs],
    logs: activityLogs
  });
});

app.get('/api/logs/download', (req, res) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  }
  res.download(LOG_FILE, 'user_logs.json');
});

// --- Block Banned IPs ---
app.use((req, res, next) => {
  if (bannedIPs.has(req.ip)) {
    appendLog({ event: 'BLOCKED_PAGE_VISIT', ip: req.ip, userAgent: req.headers['user-agent'] || '' });
    return res.status(403).send(`
      <body style="background:#0b141a;color:#f15c6d;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
        <div><h1>403 • Access Revoked</h1><p>You have been permanently banned from Three Hearts One Destiny for violating group rules.</p></div>
      </body>
    `);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// --- Comprehensive Social Media, Phone Number, Number-Words & Email Filter ---
const SOCIAL_KEYWORDS = [
  'instagram', 'insta', 'ig',
  'facebook', 'fb', 'messenger',
  'whatsapp', 'whats app', 'wa',
  'snapchat', 'snap', 'sc',
  'telegram', 'tg', 'tele',
  'twitter', 'tweet', 'x.com',
  'tiktok', 'tik tok',
  'youtube', 'yt', 'youtu.be',
  'linkedin', 'reddit', 'pinterest', 'tumblr', 'threads', 'bluesky', 'bsky', 'mastodon', 'quora', 'medium',
  'discord', 'signal', 'viber', 'wechat', 'weixin', 'line', 'line id', 'kakao', 'kakaotalk', 'kik',
  'skype', 'zoom', 'imo', 'botim', 'zalo', 'wickr', 'threema', 'element', 'session', 'simplex', 'badoo',
  'sharechat', 'share chat', 'moj', 'josh', 'chingari', 'roposo', 'koo', 'hike', 'heloshare', 'tango',
  'bigo', 'bigo live', 'chamet', 'azar', 'omegle', 'ometv',
  'tinder', 'bumble', 'hinge', 'okcupid', 'happn', 'aisle', 'trulymadly', 'quackquack', 'grindr',
  'yubo', 'wink', 'hoop', 'locket', 'bereal',
  'twitch', 'steam', 'psn', 'xbox', 'roblox', 'pubg', 'bgmi', 'freefire', 'valorant', 'riot id',
  'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'paypal', 'venmo', 'cashapp',
  'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'protonmail', 'email', 'e-mail', 'mail me',
  'phone', 'mobile', 'cell', 'number', 'num', 'contact', 'call me', 'text me', 'sms',
  'dm me', 'pm me', 'inbox me', 'message me', 'ping me', 'add me', 'follow me', 'reach me',
  'my id', 'ur id', 'your id', 'send id', 'give id', 'share id', 'drop id', 'userid', 'username', 'handle'
];

// All English & common regional number words (units, teens, tens, scales, ordinals, multipliers)
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fourty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'hundreds', 'thousand', 'thousands', 'lakh', 'lakhs', 'lac', 'lacs', 'crore', 'crores', 'million', 'billion',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'double', 'triple', 'quadruple',
  // Hindi / Hinglish number words commonly used to bypass English filters
  'ek', 'do', 'teen', 'char', 'paanch', 'panch', 'chhe', 'che', 'saat', 'sat', 'aath', 'ath', 'nau', 'das',
  'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'atharah', 'unnis', 'bees',
  'tees', 'chalis', 'pachas', 'saath', 'sattar', 'assi', 'nabbe', 'sau', 'hazaar', 'hazar'
];

const escapedSocial = SOCIAL_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const SOCIAL_REGEX = new RegExp(`\\b(${escapedSocial.join('|')})\\b`, 'i');

const escapedNumbers = NUMBER_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const NUMBER_WORD_REGEX = new RegExp(`\\b(${escapedNumbers.join('|')})\\b`, 'i');

const BLOCKED_PATTERNS = [
  /\d/,                                                         // Block ANY numeric digit (0-9)
  /[\u0966-\u096F\u0660-\u0669\u0C66-\u0C6F\u0B66-\u0B6F]/, // Block Devanagari, Arabic, Telugu, Tamil digits
  /[0-9]\uFE0F?\u20E3/,                                        // Block keycap number emojis (1️⃣ 2️⃣ etc.)
  /[a-zA-Z0-9._%+-]+\s*[@(at)]\s*[a-zA-Z0-9.-]+\.[a-z]{2,}/i, // Email addresses
  /@[a-zA-Z0-9._-]{2,}/,                                        // @handles
  /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-z]{2,6}\b)/i,   // Any URL or domain
  SOCIAL_REGEX,
  NUMBER_WORD_REGEX
];

function checkViolation(text) {
  // Normalize leetspeak / obfuscations (e.g., "0ne", "tw0", "thr33", "s3v3n", "i.n.s.t.a")
  const compact = text.toLowerCase().replace(/[\s\.\-\_\*\~\|]/g, '');

  const compactBrands = [
    'instagram', 'insta', 'snapchat', 'whatsapp', 'telegram', 'facebook',
    'discord', 'twitter', 'tiktok', 'linkedin', 'tinder', 'bumble', 'hinge',
    'sharechat', 'gmail', 'yahoo', 'hotmail', 'outlook', 'youtube', 'signal', 'wechat',
    'hundred', 'thousand', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ];
  if (compactBrands.some(brand => compact.includes(brand))) return true;

  return BLOCKED_PATTERNS.some(pattern => pattern.test(text));
}

function sanitizeDisplayName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  const cleaned = rawName.replace(/[^a-zA-Z\s'-]/g, '').trim().slice(0, 18);
  if (!cleaned || checkViolation(cleaned)) return '';
  return cleaned;
}

// --- Socket.IO Group Chat ---
io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';

  if (bannedIPs.has(clientIP)) {
    appendLog({ event: 'BLOCKED_SOCKET_ATTEMPT', ip: clientIP, userAgent });
    socket.emit('permanent_ban', 'You are permanently banned from Three Hearts One Destiny.');
    socket.disconnect(true);
    return;
  }

  let displayName = null;

  socket.on('join_with_name', (requestedName) => {
    if (bannedIPs.has(clientIP)) {
      socket.disconnect(true);
      return;
    }

    const validName = sanitizeDisplayName(requestedName);
    if (!validName) {
      socket.emit('name_error', 'Please enter a valid name or initials (letters only, no numbers or number words).');
      return;
    }

    displayName = validName;
    appendLog({ event: 'JOIN', user: displayName, ip: clientIP, userAgent });

    socket.emit('join_accepted', {
      name: displayName,
      history: chatHistory
    });

    io.emit('online_count', io.engine.clientsCount);
    io.emit('system_message', `${displayName} joined the group`);
  });

  socket.on('group_message', (msg) => {
    if (bannedIPs.has(clientIP)) {
      socket.disconnect(true);
      return;
    }

    if (!displayName) return;
    if (!msg || typeof msg !== 'string') return;
    const cleanMsg = msg.trim().slice(0, 600);
    if (!cleanMsg) return;

    if (checkViolation(cleanMsg)) {
      banIP(clientIP);
      appendLog({
        event: 'BANNED_VIOLATION',
        user: displayName,
        ip: clientIP,
        attemptedMessage: cleanMsg,
        userAgent
      });
      socket.emit('permanent_ban', 'Rule Violation: Sending numbers (digits or words like "one", "seven hundred"), emails, links, or social media details triggers an instant permanent ban.');
      io.emit('system_message', `${displayName} was permanently banned for breaking chat rules`);
      socket.disconnect(true);
      return;
    }

    const now = new Date();
    const otherUsersOnline = io.engine.clientsCount > 1;
    const msgPayload = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      user: displayName,
      text: cleanMsg,
      timestamp: now.toISOString(),
      status: otherUsersOnline ? 'delivered' : 'sent',
      seenBy: [displayName]
    };

    saveMessageToHistory(msgPayload);
    appendLog({ event: 'MESSAGE', user: displayName, ip: clientIP, message: cleanMsg });

    io.emit('group_message', msgPayload);
  });

  socket.on('mark_seen', (messageIds) => {
    if (!displayName || !Array.isArray(messageIds) || messageIds.length === 0) return;
    let updated = false;

    for (const msg of chatHistory) {
      if (messageIds.includes(msg.id) && msg.user !== displayName) {
        if (!Array.isArray(msg.seenBy)) msg.seenBy = [msg.user];
        if (!msg.seenBy.includes(displayName)) {
          msg.seenBy.push(displayName);
          msg.status = 'seen';
          updated = true;
        }
      }
    }

    if (updated) {
      saveHistoryFile();
      io.emit('messages_seen_update', {
        messageIds,
        seenByUser: displayName
      });
    }
  });

  socket.on('disconnect', () => {
    io.emit('online_count', io.engine.clientsCount);
    if (displayName && !bannedIPs.has(clientIP)) {
      appendLog({ event: 'LEAVE', user: displayName, ip: clientIP });
      io.emit('system_message', `${displayName} left the group`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Three Hearts One Destiny running at http://localhost:${PORT}`);
});
