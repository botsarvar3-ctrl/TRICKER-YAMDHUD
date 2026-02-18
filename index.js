const express = require("express");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const multer = require("multer");
const {
    makeInMemoryStore,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestBaileysVersion,
    makeWASocket,
    isJidBroadcast
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = 20868;

// Create necessary directories
if (!fs.existsSync("temp")) {
    fs.mkdirSync("temp");
}
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
}

const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active client instances and tasks
const activeClients = new Map();
const activeTasks = new Map();
const taskLogs = new Map();
const userSessions = new Map(); // Store user sessions by IP

// Middleware to track user sessions
app.use((req, res, next) => {
    const userIP = req.ip || req.connection.remoteAddress;
    req.userIP = userIP;
    next();
});

app.get("/", (req, res) => {
    res.send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Xmarty Ayush King</title>
<style>
  :root{
    --bg:#000000;
    --card:#0d0d0d;
    --accent:#ff1a1a; /* Neon Red */
    --muted:#b36b6b;
    --success:#4dff88;
    --danger:#ff3333;
    --glass: rgba(255,0,0,0.05);
    --radius:12px;
    --input-h:52px;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  }

  html,body{
    height:100%;
    margin:0;
    background:linear-gradient(180deg,#000000 0%, #1a1a1a 60%);
    color:#ffcccc;
  }

  .wrap{max-width:980px;margin:24px auto;padding:20px;}

  header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}

  .brand{display:flex;align-items:center;gap:12px}

  .logo{
    width:48px;height:48px;border-radius:10px;
    background:linear-gradient(135deg,var(--accent),#cc0000);
    display:flex;align-items:center;justify-content:center;
    font-weight:700;color:#000;
    box-shadow:0 0 8px var(--accent), 0 0 10px var(--accent);
  }

  h1{font-size:20px;margin:0}
  p.lead{margin:0;color:var(--muted);font-size:13px}

  main{display:grid;grid-template-columns:1fr 400px;gap:20px;align-items:start}

  .card{
    background:var(--card);
    border-radius:var(--radius);
    padding:20px;
    border:1px solid var(--accent);
    box-shadow:0 0 4px var(--accent), 0 0 9px rgba(255,0,0,0.6);
  }

  .form-row{display:flex;flex-direction:column;gap:14px}
  label{font-size:13px;color:var(--muted);margin-bottom:4px}

  input[type="text"], input[type="number"], select, textarea {
    height:var(--input-h);
    padding:12px 14px;border-radius:10px;
    border:1px solid var(--accent);
    background:var(--glass);
    color:inherit;
    font-size:15px;
    width:100%;
    box-sizing:border-box;
    box-shadow:0 0 6px var(--accent), 0 0 12px rgba(255,0,0,0.4);
  }
  input[type="file"]{height:auto;padding:10px}

  button.primary, button.ghost {
    display:inline-flex;align-items:center;justify-content:center;
    padding:0 18px;white-space:nowrap;
    border-radius:10px;cursor:pointer;
    transition:0.2s;
  }

  button.primary{
    height:48px;border:1px solid var(--accent);
    background:linear-gradient(90deg,var(--accent),#cc0000);
    color:#fff;font-weight:700;font-size:15px;
    box-shadow:0 0 6px var(--accent), 0 0 14px rgba(255,0,0,0.6);
  }
  button.primary:hover{filter:brightness(1.15)}

  button.ghost{
    height:44px;
    border:1px solid var(--accent);
    background:transparent;color:var(--accent);font-weight:600;
    box-shadow:0 0 4px var(--accent), 0 0 10px rgba(255,0,0,0.5);
  }
  button.ghost:hover{background:rgba(255,0,0,0.08)}

  .small{font-size:13px;color:var(--muted)}

  .session-id{
    background:rgba(255,0,0,0.05);
    padding:8px 12px;border-radius:8px;
    border:1px solid var(--accent);
    font-family:monospace;
    box-shadow:0 0 6px var(--accent), 0 0 14px rgba(255,0,0,0.5);
  }

  .status-list{display:flex;flex-direction:column;gap:10px}
  .status-item{
    display:flex;justify-content:space-between;align-items:center;
    padding:12px;border-radius:8px;
    background:rgba(255,0,0,0.04);
    border:1px solid var(--accent);
    box-shadow:0 0 6px var(--accent), 0 0 14px rgba(255,0,0,0.5);
  }

  .logs{
    max-height:320px;overflow:auto;padding:14px;
    border-radius:10px;background:#000;
    font-family:monospace;font-size:13px;color:#ffcccc;
    line-height:1.4;
    border:1px solid var(--accent);
    box-shadow:0 0 8px var(--accent), 0 0 18px rgba(255,0,0,0.6);
  }

  footer{margin-top:20px;text-align:center;color:var(--muted);font-size:13px}

  @media (max-width:900px){
    main{grid-template-columns:1fr;}
    .logs{max-height:220px}
  }
  @media (max-width:460px){
    .wrap{padding:12px}
    .logo{width:44px;height:44px}
    input[type="text"], input[type="number"], select { height:44px; font-size:14px }
    button.primary{height:44px;font-size:14px}
  }
</style>

</head>
<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <div class="logo">AK</div>
        <div>
          <h1>WhatsApp Server</h1>
          <p class="lead">XMARTY AYUSH KING</p>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="ghost" onclick="showMySessionId()">Show Session</button>
        <a href="/" style="text-decoration:none"><button class="ghost">Home</button></a>
      </div>
    </header>

    <main>
      <!-- LEFT: actions -->
      <section>
        <div class="card" aria-labelledby="pairTitle">
          <h2 id="pairTitle" style="margin-top:0;margin-bottom:8px">Pair Device</h2>
          <div class="form-row">
            <label for="numberInput">WhatsApp Number (with country code)</label>
            <input id="numberInput" name="number" type="text" placeholder="92300****** OR 91951*****" />
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="primary" onclick="generatePairingCode()">Generate Pairing Code</button>
              <button class="ghost" onclick="clearSession()">Clear Session</button>
            </div>
            <div id="pairingResult" class="helper"></div>
          </div>
        </div>

        <div style="height:14px"></div>

        <div class="card" aria-labelledby="sendTitle">
          <h2 id="sendTitle" style="margin-top:0;margin-bottom:8px">Send Messages</h2>
          <form id="sendForm" action="/send-message" method="POST" enctype="multipart/form-data" class="form-row">
            <label for="targetType">Target Type</label>
            <select id="targetType" name="targetType" required>
              <option value="">-- Select --</option>
              <option value="number">Number</option>
              <option value="group">Group UID</option>
            </select>

            <label for="target">Target Number / Group UID</label>
            <input id="target" name="target" type="text" placeholder="e.g. 92300xxxxxxx or 12345" required />

            <label for="messageFile">Message File (.txt)</label>
            <input id="messageFile" name="messageFile" type="file" accept=".txt" required />

            <label for="prefix">Message Prefix (Hater Name)</label>
            <input id="prefix" name="prefix" type="text" placeholder="Hello," />

            <label for="delaySec">Delay (seconds)</label>
            <input id="delaySec" name="delaySec" type="number" min="1" value="10" required />

            <div style="display:flex;gap:10px;align-items:center">
              <button class="primary" type="submit">Start Sending</button>
              <button class="ghost" type="button" onclick="getMyGroups()">Show Groups</button>
            </div>
          </form>
        </div>

        <div style="height:14px"></div>

        <div class="card" aria-labelledby="sessionActions">
          <h2 id="sessionActions" style="margin-top:0;margin-bottom:8px">Session Controls</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <form id="viewSessionForm" action="/view-session" method="POST" style="display:flex;gap:8px;align-items:center">
              <input name="sessionId" placeholder="Session ID to view" style="height:44px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);background:transparent;color:inherit" required />
              <button class="ghost" type="submit">View</button>
            </form>

            <form id="stopSessionForm" action="/stop-session" method="POST" style="display:flex;gap:8px;align-items:center">
              <input name="sessionId" placeholder="Session ID to stop" style="height:44px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);background:transparent;color:inherit" required />
              <button class="ghost" type="submit">Stop</button>
            </form>
          </div>
      </section>

      <!-- RIGHT: status & logs -->
      <aside>
        <div class="card">
          <h3 style="margin:0 0 10px 0">Status</h3>
          <div class="status-list">
            <div class="status-item">
              <div>Connection</div>
              <div id="connStatus" class="status-value disconnected">DISCONNECTED</div>
            </div>
            <div class="status-item">
              <div>Active Session</div>
              <div id="activeSession" class="session-id">—</div>
            </div>
            <div class="status-item">
              <div>Tasks</div>
              <div id="taskCount" class="small">0</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card">
          <h3 style="margin:0 0 8px 0">Live Logs</h3>
          <div id="logBox" class="logs small">No logs yet.</div>
        </div>
      </aside>
    </main>

    <footer>
      <div class="small">© WhatsApp Server • Keep your pairing codes private</div>
    </footer>
  </div>

  <script>
    // small helper functions - keep same API calls as original
    async function generatePairingCode(){
      const number = document.getElementById('numberInput').value.trim();
      if(!number){ alert('Enter number'); return; }
      const res = await fetch('/code?number=' + encodeURIComponent(number));
      const text = await res.text();
      document.getElementById('pairingResult').innerHTML = text;
      // try extract session id from returned HTML and store (original code did this too)
      // the server sets localStorage via returned HTML script when pairing succeeds
    }

    function showMySessionId(){
      const sessionId = localStorage.getItem('wa_session_id');
      if(sessionId){
        document.getElementById('activeSession').textContent = sessionId;
        document.getElementById('activeSession').style.fontFamily = 'monospace';
      } else {
        alert('No active session in browser localStorage. Generate pairing first.');
      }
    }

    function clearSession(){
      localStorage.removeItem('wa_session_id');
      document.getElementById('activeSession').textContent = '—';
      alert('Local session cleared (browser only).');
    }

    async function getMyGroups(){
      try{
        const res = await fetch('/get-groups');
        const html = await res.text();
        // display groups in log box for quick view
        document.getElementById('logBox').innerHTML = html;
      }catch(e){
        console.error(e);
        document.getElementById('logBox').textContent = 'Error fetching groups';
      }
    }

    // small SSE-like polling to update connection & logs (non-intrusive)
    async function pollStatus(){
      try{
        const sessionId = localStorage.getItem('wa_session_id');
        if(sessionId){
          // fetch session-status page and parse small bits (cheap method)
          const res = await fetch('/session-status?sessionId=' + encodeURIComponent(sessionId));
          if(res.ok){
            const html = await res.text();
            // quick extraction: connection status string between "Connection Status:" and next tag
            const connMatch = html.match(/Connection Status:[\\s\\S]*?<span[^>]*>([^<]+)</i);
            const connText = connMatch ? connMatch[1].trim() : null;
            if(connText){
              const el = document.getElementById('connStatus');
              el.textContent = connText.includes('CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
              el.className = 'status-value ' + (connText.includes('CONNECTED') ? 'connected' : 'disconnected');
            }
            // update task count
            const taskMatches = html.match(/Active Tasks[\\s\\S]*?<div class="task-list">/i);
            document.getElementById('taskCount').textContent = taskMatches ? 'Running' : '0';
            document.getElementById('activeSession').textContent = sessionId;
          }
        }
      }catch(e){
        // ignore
      } finally {
        setTimeout(pollStatus, 8000);
      }
    }
    pollStatus();
  </script>
</body>
</html>
    `);
});

app.get("/code", async (req, res) => {
    const num = req.query.number.replace(/[^0-9]/g, "");
    const userIP = req.userIP;
    const sessionId = `session_${userIP}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const sessionPath = path.join("temp", sessionId);

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        const waClient = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            shouldIgnoreJid: jid => isJidBroadcast(jid),
            getMessage: async key => {
                return {}
            }
        });

        if (!waClient.authState.creds.registered) {
            await delay(1500);
            
            const phoneNumber = num.replace(/[^0-9]/g, "");
            const code = await waClient.requestPairingCode(phoneNumber);
            
            // Store session with user IP
            activeClients.set(sessionId, {  
                client: waClient,  
                number: num,  
                authPath: sessionPath,
                isConnected: false,
                tasks: []
            });  
            
            // Store user session mapping
            userSessions.set(userIP, sessionId);

            res.send(`  
                <div style="
    margin-top: 20px; 
    padding: 20px; 
    background: rgba(20, 0, 0, 0.8); 
    border-radius: 12px; 
    border: 1px solid #ff1a1a;
    box-shadow: 0 0 6px #ff1a1a, 0 0 14px rgba(255,0,0,0.5);
    color: #ffcccc;
">
    <h2 style="margin-top:0; color:#ff4d4d;">Pairing Code: ${code}</h2>  

    <p style="font-size: 18px; margin-bottom: 20px; color:#ffb3b3;">
        Save this code to pair your device
    </p>

    <div class="instructions" style="color:#ffcccc;">
        <p style="font-size: 16px;"><strong>To pair your device:</strong></p>
        <ol>
            <li>Open WhatsApp on your phone</li>
            <li>Go to Settings → Linked Devices → Link a Device</li>
            <li>Enter this pairing code when prompted</li>
            <li>After pairing, start sending messages using the form below</li>
        </ol>
    </div>

    <p style="font-size: 16px; margin-top: 20px; color:#ff9999;">
        <strong>Your Session ID: ${sessionId}</strong>
    </p>
    <p style="font-size: 14px; color:#b36b6b;">
        Save this Session ID to manage your message sending tasks
    </p>

    <script>
        localStorage.setItem('wa_session_id', '${sessionId}');
    </script>

    <a href="/" style="
        display:inline-block;
        margin-top:15px;
        padding:10px 18px;
        border-radius:10px;
        border:1px solid #ff1a1a;
        color:#ff4d4d;
        text-decoration:none;
        font-weight:600;
        box-shadow:0 0 6px #ff1a1a, 0 0 14px rgba(255,0,0,0.4);
        transition:0.2s;
    " 
    onmouseover="this.style.background='rgba(255,0,0,0.1)';" 
    onmouseout="this.style.background='transparent';">
        Go Back to Home
    </a>  
</div>

            `);  
        }  

        waClient.ev.on("creds.update", saveCreds);  
        waClient.ev.on("connection.update", async (s) => {  
            const { connection, lastDisconnect } = s;  
            if (connection === "open") {  
                console.log(`WhatsApp Connected for ${num}! Session ID: ${sessionId}`);  
                const clientInfo = activeClients.get(sessionId);
                if (clientInfo) {
                    clientInfo.isConnected = true;
                }
            } else if (connection === "close") {
                const clientInfo = activeClients.get(sessionId);
                if (clientInfo) {
                    clientInfo.isConnected = false;
                    console.log(`Connection closed for Session ID: ${sessionId}`);
                    
                    // Try to reconnect if not manually stopped
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        console.log(`Attempting to reconnect for Session ID: ${sessionId}...`);
                        await delay(10000);
                        initializeClient(sessionId, num, sessionPath);
                    }
                }
            }  
        });

    } catch (err) {
        console.error("Error in pairing:", err);
        res.send(`<div style="padding: 20px; background: rgba(80,0,0,0.8); border-radius: 10px; border: 1px solid #ff5555;">
                    <h2>Error: ${err.message}</h2><br><a href="/">Go Back</a>
                  </div>`);
    }
});

async function initializeClient(sessionId, num, sessionPath) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        const waClient = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false
        });

        const clientInfo = activeClients.get(sessionId) || {
            number: num,
            authPath: sessionPath,
            tasks: []
        };
        
        clientInfo.client = waClient;
        activeClients.set(sessionId, clientInfo);

        waClient.ev.on("creds.update", saveCreds);  
        waClient.ev.on("connection.update", async (s) => {  
            const { connection, lastDisconnect } = s;  
            if (connection === "open") {  
                console.log(`Reconnected successfully for Session ID: ${sessionId}`);  
                clientInfo.isConnected = true;
            } else if (connection === "close") {
                clientInfo.isConnected = false;
                console.log(`Connection closed again for Session ID: ${sessionId}`);
                
                if (lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log(`Reconnecting again for Session ID: ${sessionId}...`);
                    await delay(1000
