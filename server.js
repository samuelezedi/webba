const express = require('express');
const { chromium } = require('playwright');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Store active browser sessions
const activeSessions = new Map();

// Main route - handles URL parameters
app.get('/operate', async (req, res) => {
  const { email, password, fileNumber } = req.query;
  const sessionId = req.query.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Validate required parameters
  if (!email || !password || !fileNumber) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Missing Parameters</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
          .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Missing Required Parameters</h2>
          <p>Please provide email, password, and fileNumber in the URL:</p>
          <p><code>?email=your@email.com&password=yourpass&fileNumber=12345</code></p>
        </div>
      </body>
      </html>
    `);
  }

  // Send the HTML page with WebSocket connection
  res.sendFile(path.join(__dirname, 'public', 'index.html'));

  // Start automation after a short delay to let the page load
  setTimeout(() => {
    startAutomation(sessionId, email, password, fileNumber);
  }, 1000);
});

// WebSocket connection handler (moved below - see browser interaction handlers)

// Automation function
async function startAutomation(sessionId, email, password, fileNumber) {
  let browser = null;
  let page = null;

  try {
    // Emit status update
    io.emit('status', { 
      sessionId, 
      status: 'starting', 
      message: 'Launching browser...' 
    });

    // Launch browser - use headless on cloud, visible locally
    const isCloud = process.env.RAILWAY_ENVIRONMENT || 
                   process.env.RENDER || 
                   process.env.FLY_APP_NAME ||
                   process.env.NODE_ENV === 'production';
    const isHeadless = isCloud || process.env.HEADLESS === 'true';
    
    browser = await chromium.launch({ 
      headless: isHeadless,
      args: isHeadless ? ['--no-sandbox', '--disable-setuid-sandbox'] : ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    page = await context.newPage();

    // Store session
    activeSessions.set(sessionId, { browser, page, context });

    io.emit('status', { 
      sessionId, 
      status: 'navigating', 
      message: 'Navigating to login page...' 
    });

    // Navigate to login page
    await page.goto('https://possap.gov.ng/p/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    io.emit('status', { 
      sessionId, 
      status: 'filling', 
      message: 'Filling login credentials...' 
    });

    // Fill email
    await page.fill('input#email[name="Email"]', email);
    await page.waitForTimeout(500);

    // Fill password
    await page.fill('input#pwd[name="Password"]', password);
    await page.waitForTimeout(500);

    io.emit('status', { 
      sessionId, 
      status: 'logging_in', 
      message: 'Clicking login button...' 
    });

    // Click login button
    await page.click('button[type="submit"].btn.btn-block');
    
    // Wait for navigation after login
    await page.waitForURL('**/p/select-service', { timeout: 15000 }).catch(() => {
      // If URL doesn't match exactly, wait a bit and check
      return page.waitForTimeout(3000);
    });

    io.emit('status', { 
      sessionId, 
      status: 'navigating', 
      message: 'Logged in successfully. Navigating to services...' 
    });

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    io.emit('status', { 
      sessionId, 
      status: 'clicking', 
      message: 'Clicking Virtual Verification link...' 
    });

    // Click Virtual Verification link
    await page.click('a.nav-link[href="/p/run-face-verification"]');
    
    // Wait for navigation to face verification page
    await page.waitForURL('**/run-face-verification', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    io.emit('status', { 
      sessionId, 
      status: 'filling', 
      message: 'Filling file number...' 
    });

    // Fill file number
    await page.fill('input#fileNumber[name="fileNumber"]', fileNumber);
    await page.waitForTimeout(500);

    io.emit('status', { 
      sessionId, 
      status: 'clicking', 
      message: 'Clicking Begin Verification button...' 
    });

    // Click Begin Verification button
    await page.click('button[name="proceedBtn"][type="submit"].btn.btn-block');
    
    // Wait for the verification page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    io.emit('status', { 
      sessionId, 
      status: 'ready', 
      message: 'Browser is ready! Please proceed with face capture in the browser window.' 
    });

    // Start streaming browser screenshots if headless
    if (isHeadless) {
      startBrowserStreaming(sessionId, page);
    }

    // Keep browser open for user interaction
    // Browser will remain open until user closes it or session times out

  } catch (error) {
    console.error('Automation error:', error);
    io.emit('status', { 
      sessionId, 
      status: 'error', 
      message: `Error: ${error.message}` 
    });

    // Clean up on error
    if (browser) {
      await browser.close();
    }
    activeSessions.delete(sessionId);
  }
}

// Stream browser screenshots for headless mode
async function startBrowserStreaming(sessionId, page) {
  const streamInterval = setInterval(async () => {
    try {
      const session = activeSessions.get(sessionId);
      if (!session || !session.page) {
        clearInterval(streamInterval);
        return;
      }

      // Take screenshot
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
      
      // Send via WebSocket
      io.emit('browser-screenshot', {
        sessionId,
        image: screenshot.toString('base64')
      });
    } catch (error) {
      console.error('Screenshot error:', error);
      clearInterval(streamInterval);
    }
  }, 500); // Update every 500ms

  // Store interval for cleanup
  const session = activeSessions.get(sessionId);
  if (session) {
    session.streamInterval = streamInterval;
  }
}

// Handle browser interactions (clicks, typing)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('browser-click', async (data) => {
    const { sessionId, x, y } = data;
    const session = activeSessions.get(sessionId);
    
    if (session && session.page) {
      try {
        await session.page.mouse.click(x, y);
      } catch (error) {
        console.error('Click error:', error);
      }
    }
  });

  socket.on('browser-type', async (data) => {
    const { sessionId, text } = data;
    const session = activeSessions.get(sessionId);
    
    if (session && session.page) {
      try {
        await session.page.keyboard.type(text);
      } catch (error) {
        console.error('Type error:', error);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Cleanup endpoint (optional)
app.get('/cleanup/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (session) {
    if (session.streamInterval) {
      clearInterval(session.streamInterval);
    }
    if (session.browser) {
      await session.browser.close();
    }
    activeSessions.delete(sessionId);
    res.json({ success: true, message: 'Session cleaned up' });
  } else {
    res.json({ success: false, message: 'Session not found' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Access the operator at: http://localhost:${PORT}/operate?email=YOUR_EMAIL&password=YOUR_PASS&fileNumber=YOUR_FILE_NUMBER`);
});

