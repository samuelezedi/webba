# Web Automation Operator

A web application that automates browser operations on the POSSAP website, handling login, navigation, and form filling, then hands control to the user for face verification.

## Features

- ✅ URL parameter validation (email, password, fileNumber)
- ✅ Automated login to POSSAP website
- ✅ Navigation to Virtual Verification service
- ✅ Automatic form filling
- ✅ Real-time status updates via WebSocket
- ✅ Browser handoff to user for face capture

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers (if not already installed):
```bash
npx playwright install chromium
```

## Usage

1. Start the server:
```bash
npm start
```

2. Access the operator with URL parameters:
```
http://localhost:3000/operate?email=your@email.com&password=yourpassword&fileNumber=12345
```

## How It Works

1. **Parameter Validation**: The operator checks for `email`, `password`, and `fileNumber` in the URL
2. **Browser Launch**: Opens a visible browser window (headed mode)
3. **Automation Flow**:
   - Navigates to `https://possap.gov.ng/p/login`
   - Fills in email and password
   - Clicks login button
   - Navigates to select-service page
   - Clicks "Virtual Verification" link
   - Fills in file number
   - Clicks "Begin Verification" button
4. **User Handoff**: Browser remains open for user to complete face capture

## Status Updates

The web interface shows real-time status updates:
- 🟢 Starting: Browser is launching
- 🟢 Navigating: Moving between pages
- 🟢 Filling: Entering form data
- 🟢 Logging in: Submitting login
- 🔵 Ready: Browser is ready for user interaction

## Notes

- The browser window will be visible on your screen
- The browser stays open after automation completes for user interaction
- All automation steps are logged in the console
- WebSocket connection provides real-time status to the web interface

## Port

Default port is 3000. Set `PORT` environment variable to change it:
```bash
PORT=8080 npm start
```

