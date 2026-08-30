/**
 * Toolio Store - Digital Subscriptions & AI Licenses Catalog Data
 * Brand: Toolio Automation | Store: Toolio Store
 */

const STORE_CONFIG = {
  brandName: "Toolio Automation",
  storeName: "Toolio Store",
  tagline: "Toolio Premium Activation Codes & Selected Digital Subscriptions",
  defaultCurrency: "USDT",
  currencies: {
    USDT: { symbol: " USDT", code: "USDT", rate: 1.00, prefix: false, name: "USDT" },
    USD: { symbol: "$", code: "USD", rate: 1.00, prefix: true, name: "USD" },
    SAR: { symbol: "SAR ", code: "SAR", rate: 3.75, prefix: true, name: "SAR" },
    AED: { symbol: "AED ", code: "AED", rate: 3.67, prefix: true, name: "AED" },
    PKR: { symbol: " PKR", code: "PKR", rate: 278.50, prefix: false, name: "PKR" },
    INR: { symbol: "₹", code: "INR", rate: 86.80, prefix: true, name: "INR" },
    EUR: { symbol: "€", code: "EUR", rate: 0.92, prefix: true, name: "EUR" },
    GBP: { symbol: "£", code: "GBP", rate: 0.79, prefix: true, name: "GBP" }
  },
  paymentMethods: {
    binancePay: {
      id: "binance_pay",
      name: "Binance Pay",
      badge: "Automated Verification",
      binancePayId: "43828133",
      qrImage: "../assets/images/binance-pay-qr.png",
      deepLinkUrl: "https://app.binance.com/uni-qr/6oKZzNKS",
      verificationNote: "Server verification using the Binance Pay Order ID.",
      description: "Pay through Binance Pay, then enter the Order ID from your Binance payment receipt. Verification is processed securely by the Toolio server."
    },
    usdt: {
      id: "usdt",
      name: "USDT — Select Network",
      badge: "Automated Verification",
      verificationNote: "Server verification using the transaction hash on the selected network.",
      description: "Send the exact USDT amount shown for your order on the selected network, then enter the transaction hash for secure verification.",
      networks: {
        bep20: {
          id: "bep20",
          name: "BNB Smart Chain (BEP-20)",
          symbol: "BEP20",
          token: "USDT",
          depositAddress: "0x3807caa4443547fc1b129658e5b42e7ced436390",
          qrImage: "../assets/images/usdt-bep20-qr.png",
          note: "Make sure you choose BNB Smart Chain (BEP-20) when withdrawing USDT from your exchange or wallet."
        },
        opbnb: {
          id: "opbnb",
          name: "opBNB",
          symbol: "opBNB",
          token: "USDT",
          depositAddress: "0x3807caa4443547fc1b129658e5b42e7ced436390",
          qrImage: "../assets/images/usdt-opbnb-qr.png",
          note: "Make sure you choose opBNB network when withdrawing USDT from your exchange or wallet."
        },
        trc20: {
          id: "trc20",
          name: "TRON (TRC-20)",
          symbol: "TRC20",
          token: "USDT",
          depositAddress: "TVNCw7vJvMWwAzw6RknRxawuHgvrTP2XnX",
          qrImage: "../assets/images/usdt-trc20-qr.png",
          note: "Make sure you choose TRON (TRC-20) network when withdrawing USDT from your exchange or wallet."
        }
      }
    },
    easypaisa: {
      id: "easypaisa",
      name: "EasyPaisa",
      badge: "Manual Admin Review",
      accountNumber: "03173727126",
      accountTitle: "Tahir Hameed",
      bankName: "Telenor Microfinance Bank",
      verificationNote: "Manual verification by Toolio admin.",
      description: "Transfer PKR via EasyPaisa App or USSD code and attach transfer details & receipt."
    },
    jazzcash: {
      id: "jazzcash",
      name: "JazzCash",
      badge: "Manual Admin Review",
      accountNumber: "03173727126",
      accountTitle: "Tahir Hameed",
      bankName: "Mobilink Microfinance Bank",
      verificationNote: "Manual verification by Toolio admin.",
      description: "Transfer PKR via JazzCash App to registered account and attach transfer details & receipt."
    },
    wallet: {
      id: "wallet",
      name: "Wallet Balance",
      badge: "Instant Payment",
      verificationNote: "Instant payment from your Toolio wallet balance.",
      description: "Pay using your preloaded Toolio Store account balance."
    }
  },
  binancePayStatuses: {
    awaiting_input: "Awaiting Binance Pay Order ID",
    verifying: "Verifying with Binance",
    confirmed: "Payment Confirmed",
    activation_available: "Activation Code Available",
    not_found: "Order ID Not Found",
    amount_mismatch: "Amount or Currency Mismatch",
    already_used: "Order ID Already Used",
    predates_order: "Payment Predates This Order",
    service_unavailable: "Verification Temporarily Unavailable",
    expired: "Order Expired"
  },
  usdtStatuses: {
    awaiting_input: "Awaiting Transaction Hash",
    verifying: "Verifying Transaction",
    deposit_pending: "Deposit Pending",
    confirming_deposit: "Confirming Deposit",
    confirmed: "Payment Confirmed",
    activation_available: "Activation Code Available",
    not_found: "Transaction Not Found",
    wrong_network: "Wrong Network",
    wrong_token: "Wrong Token",
    wrong_amount: "Wrong Amount",
    wrong_destination: "Wrong Destination Address",
    already_used: "Transaction Already Used",
    predates_order: "Payment Predates This Order",
    service_unavailable: "Verification Temporarily Unavailable",
    expired: "Order Expired"
  },
  manualReviewStatuses: {
    awaiting_input: "Awaiting Payment Details",
    submitted: "Submitted",
    under_review: "Under Admin Review",
    approved: "Approved",
    rejected: "Rejected",
    info_required: "Additional Information Required"
  }
};

/**
 * Featured Hero Product: Toolio Premium
 * Shown prominently on the top-right of the hero section and on dedicated product.html
 */
const TOOLIO_HERO_PRODUCT = {
  id: "toolio-premium",
  name: "Toolio Premium",
  productType: "Activation Code",
  brand: "Toolio Automation",
  badge: "Official Product",
  priceUSD: 2.50,
  duration: "30 Days",
  status: "available",
  image: "../assets/images/toolio-automation-logo.png",
  rating: 5.0,
  description: "A 30-day activation code for Toolio Automation. Unlocks the included automation workflows and media utilities on one device. Supported accounts, generation credits, API credits, and third-party subscriptions are not included.",
  features: [
    "30-day Toolio Premium activation code",
    "Flow Video, Flow Image, and Gemini TTS automation workflows",
    "CapCut Automator, Whiteboard Animator, and sequence utilities",
    "Single-device activation inside the Toolio Automation desktop app"
  ]
};

/**
 * Subscription Categories
 */
const CATEGORIES = [
  { id: "all", name: "All Subscriptions", icon: "grid", count: 12 },
  { id: "ai", name: "AI & Frontier Models", icon: "bot", count: 4 },
  { id: "creative", name: "Video & Design", icon: "video", count: 3 },
  { id: "streaming", name: "Streaming & Movies", icon: "film", count: 3 },
  { id: "security", name: "VPN & Utilities", icon: "shield", count: 2 }
];

/**
 * Catalog Products (Excluding Toolio Premium to prevent duplication)
 */
const PRODUCTS = [
  {
    id: "sub-chatgpt",
    name: "ChatGPT Plus (GPT-5.6 Sol, GPT-5 & Deep Research)",
    categoryId: "ai",
    brand: "OpenAI",
    badge: "GPT-5.6 Sol",
    status: "available",
    warrantyText: "30-Day Warranty",
    image: "../assets/images/store-products/chatgpt.svg",
    rating: 4.95,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 14.99, originalUSD: 20.00, discount: 25 },
      { id: "3m", duration: "3 Months", priceUSD: 39.99, originalUSD: 60.00, discount: 33 }
    ],
    features: [
      "Access to GPT-5.6 Sol, GPT-5.5 & Smart Thinking Router",
      "Autonomous Deep Research with multi-document synthesis",
      "Advanced Voice Mode (AVM) with real-time vision",
      "Higher message caps and priority access during peak hours"
    ]
  },
  {
    id: "sub-claude",
    name: "Claude Pro (Claude Opus 5, Sonnet 5 & Extended Thinking)",
    categoryId: "ai",
    brand: "Anthropic",
    badge: "Opus 5",
    status: "available",
    warrantyText: "14-Day Warranty",
    image: "../assets/images/store-products/claude.svg",
    rating: 4.95,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 15.99, originalUSD: 20.00, discount: 20 }
    ],
    features: [
      "Access to Claude Opus 5 & Claude Sonnet 5 reasoning models",
      "Extended Thinking mode for complex programming & analysis",
      "200K token context window with interactive Artifacts & Projects",
      "5x higher usage limits for software engineering"
    ]
  },
  {
    id: "sub-gemini",
    name: "Gemini Advanced (Gemini 3.7 Flash, 2TB Google One Cloud & Deep Research)",
    categoryId: "ai",
    brand: "Google",
    badge: "Gemini 3.7 Flash",
    status: "available",
    warrantyText: "30-Day Warranty",
    image: "../assets/images/store-products/gemini.svg",
    rating: 4.85,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 8.99, originalUSD: 19.99, discount: 55 }
    ],
    features: [
      "Access to Gemini 3.7 Flash frontier hybrid reasoning model",
      "Gemini integration in Google Docs, Gmail, Sheets & Slides",
      "2TB Google One cloud storage (Drive, Photos, Gmail)",
      "Gemini Live, Deep Research, Canvas, and NotebookLM Plus"
    ]
  },
  {
    id: "sub-midjourney",
    name: "Midjourney Pro (V8.2 + Fast GPU Hours & Stealth Mode)",
    categoryId: "ai",
    brand: "Midjourney",
    badge: "V8.2",
    status: "out_of_stock",
    warrantyText: "Standard Term",
    image: "../assets/images/store-products/midjourney.svg",
    rating: 4.90,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 16.99, originalUSD: 30.00, discount: 43 }
    ],
    features: [
      "Midjourney V8.2 image model with improved aesthetics, image quality, and personalization",
      "30 Fast GPU hours per month with unlimited Relax mode",
      "Stealth Mode to keep image generations private",
      "Web creation access with pan, zoom, and variation tools"
    ]
  },
  {
    id: "sub-capcut",
    name: "CapCut Pro VIP (PC, Mac, iOS & Android)",
    categoryId: "creative",
    brand: "ByteDance",
    badge: "Top Choice",
    status: "available",
    warrantyText: "Full Duration Warranty",
    image: "../assets/images/store-products/capcut.svg",
    rating: 4.90,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 4.99, originalUSD: 12.99, discount: 61 },
      { id: "6m", duration: "6 Months", priceUSD: 21.99, originalUSD: 77.94, discount: 72 },
      { id: "12m", duration: "1 Year", priceUSD: 34.99, originalUSD: 155.88, discount: 77 }
    ],
    features: [
      "All Pro transitions, effects, filters & sound assets unlocked",
      "AI Smart Cutout, Motion Tracking & Auto Captions",
      "4K 60FPS video export with zero watermark",
      "Multi-device access across PC, Mac, iOS, and Android"
    ]
  },
  {
    id: "sub-netflix",
    name: "Netflix Premium 4K Ultra HD (4 Screens)",
    categoryId: "streaming",
    brand: "Netflix",
    badge: "4K UHD",
    status: "available",
    warrantyText: "30-Day Replacement Guarantee",
    image: "../assets/images/store-products/netflix.svg",
    rating: 4.95,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 6.99, originalUSD: 22.99, discount: 70 },
      { id: "3m", duration: "3 Months", priceUSD: 17.99, originalUSD: 68.97, discount: 74 }
    ],
    features: [
      "Ultra HD 4K (3840x2160) streaming + HDR and Dolby Vision",
      "Watch on up to 4 supported devices simultaneously",
      "Download on up to 6 supported devices",
      "Netflix spatial audio on supported titles"
    ]
  },
  {
    id: "sub-spotify",
    name: "Spotify Premium (Ad-Free + Offline Music)",
    categoryId: "streaming",
    brand: "Spotify",
    badge: "Ad-Free",
    status: "available",
    warrantyText: "3-Month Warranty",
    image: "../assets/images/store-products/spotify.svg",
    rating: 4.85,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 3.99, originalUSD: 10.99, discount: 64 },
      { id: "3m", duration: "3 Months", priceUSD: 8.99, originalUSD: 32.97, discount: 72 }
    ],
    features: [
      "Ad-free on-demand music playback",
      "Download songs and playlists for offline listening",
      "High quality 320kbps audio streaming",
      "Unlimited skips and on-demand track selection"
    ]
  },
  {
    id: "sub-youtube",
    name: "YouTube Premium & Music (No Ads + Background)",
    categoryId: "streaming",
    brand: "Google",
    badge: "Ad-Free",
    status: "available",
    warrantyText: "3-Month Warranty",
    image: "../assets/images/store-products/youtube.svg",
    rating: 4.90,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 4.49, originalUSD: 13.99, discount: 68 },
      { id: "3m", duration: "3 Months", priceUSD: 9.99, originalUSD: 41.97, discount: 76 }
    ],
    features: [
      "Ad-free video viewing across YouTube",
      "Background play while using other apps or screen locked",
      "YouTube Music Premium subscription included",
      "Download videos and playlists for offline playback"
    ]
  },
  {
    id: "sub-canva",
    name: "Canva Pro (100M+ Stock Assets & Magic Studio)",
    categoryId: "creative",
    brand: "Canva",
    badge: "Pro Plan",
    status: "available",
    warrantyText: "1-Year Warranty",
    image: "../assets/images/store-products/canva.svg",
    rating: 4.85,
    plans: [
      { id: "12m", duration: "1 Year", priceUSD: 9.99, originalUSD: 119.99, discount: 91 }
    ],
    features: [
      "100M+ premium photos, videos, audio, and graphics",
      "Magic Studio AI tools including Magic Background Remover",
      "Magic Switch and Magic Resize for social media formats",
      "1TB cloud storage and Brand Kit management"
    ]
  },
  {
    id: "sub-tradingview",
    name: "TradingView Premium (25 Indicators & Bar Replay)",
    categoryId: "creative",
    brand: "TradingView",
    badge: "Premium",
    status: "out_of_stock",
    warrantyText: "30-Day Warranty",
    image: "../assets/images/store-products/tradingview.svg",
    rating: 4.95,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 14.99, originalUSD: 59.95, discount: 75 }
    ],
    features: [
      "25 indicators per chart layout with 8 charts in one tab",
      "Second-based real-time bar replay and intraday data",
      "400 server-side price and indicator alerts",
      "Volume profile indicators and multi-timeframe analysis"
    ]
  },
  {
    id: "sub-nordvpn",
    name: "NordVPN (10 Devices + Threat Protection)",
    categoryId: "security",
    brand: "Nord Security",
    badge: "VPN",
    status: "available",
    warrantyText: "1-Year Warranty",
    image: "../assets/images/store-products/nordvpn.svg",
    rating: 4.90,
    plans: [
      { id: "12m", duration: "1 Year", priceUSD: 19.99, originalUSD: 99.99, discount: 80 }
    ],
    features: [
      "6,000+ high-speed secure servers worldwide",
      "Threat Protection to block malware, trackers, and ads",
      "Strict audited No-Logs policy and DNS leak protection",
      "Connect up to 10 devices simultaneously on one account"
    ]
  },
  {
    id: "sub-discord",
    name: "Discord Nitro (2 Server Boosts + 500MB Uploads)",
    categoryId: "security",
    brand: "Discord",
    badge: "Nitro",
    status: "available",
    warrantyText: "48-Hour Activation Guarantee",
    image: "../assets/images/store-products/discord.svg",
    rating: 4.85,
    plans: [
      { id: "1m", duration: "1 Month", priceUSD: 4.99, originalUSD: 9.99, discount: 50 }
    ],
    features: [
      "500MB file sharing capacity and HD video streaming up to 4K",
      "Custom emojis and animated stickers anywhere on Discord",
      "2 Server Boosts included with 30% off extra boosts",
      "Custom profile banner, badge, and animated avatars"
    ]
  }
];

/**
 * Customer Feedback Reviews (Development Placeholders)
 */
const REVIEWS = [
  {
    id: "rev-pk-1",
    author: "Hamza Tariq",
    location: "Lahore, Pakistan",
    rating: 5,
    productName: "Toolio Premium (Activation Code)",
    date: "Customer Feedback",
    text: "EasyPaisa se payment ki thi 696 PKR. Screenshot upload karne k baad 2-3 minute mein admin ne verify kardiya aur Toolio Premium ka official activation code active hogaya. Video rendering speed zabardast hai!"
  },
  {
    id: "rev-pk-2",
    author: "Muhammad Bilal",
    location: "Karachi, Pakistan",
    rating: 5,
    productName: "CapCut Pro VIP",
    date: "Customer Feedback",
    text: "JazzCash payment option was super smooth. Receipt upload ki aur verify hote hi activation code foran mil gaya. Subscriptions price Pakistani creators k liye bohot reasonable hai."
  },
  {
    id: "rev-sa-1",
    author: "Tariq Al-Mansoor",
    location: "Riyadh, Saudi Arabia",
    rating: 5,
    productName: "Toolio Premium (Activation Code)",
    date: "Customer Feedback",
    text: "Binance Pay transfer was fast and simple. Copied the Pay ID, submitted the Binance Pay Order ID and code was issued. Desktop video automation works smoothly."
  }
];

/**
 * Frequently Asked Questions
 */
const FAQS = [
  {
    q: "How do I receive and use my Toolio Premium Activation Code?",
    a: "After submitting your payment via Binance Pay, USDT, EasyPaisa, or JazzCash, your order enters verification. Once approved, your 30-Day Activation Code is issued. Copy and paste it directly into the Toolio Automation desktop application to unlock all included features."
  },
  {
    q: "How does payment verification work for Binance Pay and USDT?",
    a: "Binance Pay and supported USDT transactions are verified automatically by the Toolio server after the customer submits the required payment identifier: a Binance Pay Order ID or a USDT transaction hash."
  },
  {
    q: "How does payment work with EasyPaisa and JazzCash in Pakistan?",
    a: "Transfer the calculated PKR amount to the relevant registered mobile account shown during checkout. EasyPaisa: 03173727126, Tahir Hameed. JazzCash: 03173727126, Tahir Hameed. Then submit the sender name, sender phone number, TID, payment date, and payment receipt. EasyPaisa and JazzCash payments are reviewed manually by the Toolio admin."
  },
  {
    q: "How does the Wallet Balance work?",
    a: "Your Wallet Balance allows instant payment from your Toolio wallet balance once funded."
  }
];
