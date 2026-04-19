const express    = require('express');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY         = process.env.ADMIN_KEY || 'dtc2024';
const DATA_DIR          = path.join(__dirname, 'data');
const BACKUP_DIR        = path.join(__dirname, 'backups');
const TOKENS_FILE       = path.join(DATA_DIR, 'tokens.json');
const SESSIONS_FILE     = path.join(DATA_DIR, 'sessions.txt');
const EMAIL_CONFIG      = path.join(DATA_DIR, 'emailConfig.json');
const EMAIL_LOG         = path.join(DATA_DIR, 'emailLog.json');
const INSTRUCTIONS_FILE = path.join(DATA_DIR, 'instructions.json');
const NOTIFY_FILE       = path.join(DATA_DIR, 'notifications.json');
const PRODUCTS_FILE     = path.join(DATA_DIR, 'products.json');
const TEMPLATES_FILE    = path.join(DATA_DIR, 'emailTemplates.json');
const SETTINGS_FILE     = path.join(DATA_DIR, 'settings.json');
const LANDING_FILE      = path.join(DATA_DIR, 'landingContent.json');
const CHAT_FILE         = path.join(DATA_DIR, 'chats.json');
const RESELLERS_FILE     = path.join(DATA_DIR, 'resellers.json');
const RESELLER_OTPS_FILE = path.join(DATA_DIR, 'resellerOtps.json');
const PAYOUTS_FILE       = path.join(DATA_DIR, 'payouts.json');
const ORDERS_FILE        = path.join(DATA_DIR, 'orders.json');
const SHOP_SETTINGS_FILE = path.join(DATA_DIR, 'shopSettings.json');
const WEBHOOKS_FILE      = path.join(DATA_DIR, 'webhooks.json');
const ABANDONED_FILE     = path.join(DATA_DIR, 'abandonedCarts.json');

const LINK_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutes

if (!fs.existsSync(DATA_DIR))       fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BACKUP_DIR))     fs.mkdirSync(BACKUP_DIR);
if (!fs.existsSync(TOKENS_FILE))    fs.writeFileSync(TOKENS_FILE,  JSON.stringify({}));
if (!fs.existsSync(SESSIONS_FILE))  fs.writeFileSync(SESSIONS_FILE, '');
if (!fs.existsSync(EMAIL_CONFIG))   fs.writeFileSync(EMAIL_CONFIG,  JSON.stringify({}));
if (!fs.existsSync(EMAIL_LOG))      fs.writeFileSync(EMAIL_LOG,     JSON.stringify([]));
if (!fs.existsSync(SETTINGS_FILE))  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', activationEmailTemplateId: 'welcome' }, null, 2));
if (!fs.existsSync(LANDING_FILE))   fs.writeFileSync(LANDING_FILE, JSON.stringify({
  heroTitle:       'Enterprise AI Access for Teams & Institutions',
  heroSubtitle:    'Digital Tools Corner delivers official, managed subscriptions to the world\'s leading AI platforms — activated within hours, supported every day.',
  heroBadge:       'Trusted by 2,000+ organisations worldwide',
  heroCta1:        'View Plans',
  heroCta2:        'Talk to Sales',
  statCustomers:   '2,000+',
  statActivations: '10,000+',
  statTools:       '100+',
  statCountries:   '50+',
  statLabel1:      'Active clients',
  statLabel2:      'Accounts activated',
  statLabel3:      'Tools available',
  statLabel4:      'Countries served',
  email:           'dtc@dtc1.shop',
  whatsapp:        '+86 19738122807',
  wechatQrUrl:     '',
  companyName:     'Digital Tools Corner',
  companyTagline:  'Official AI subscriptions for professionals, researchers and teams',
  navLinks:        JSON.stringify([
    {label:'Solutions',href:'#solutions'},
    {label:'Products',href:'#products'},
    {label:'Pricing',href:'#pricing'},
    {label:'About',href:'#about'},
    {label:'Contact',href:'#contact'},
  ]),
  solutionsTitle:  'Built for every professional need',
  solutionsSubtitle: 'From solo researchers to enterprise teams, DTC has a plan that fits.',
  solutions:       JSON.stringify([
    {icon:'🎓',title:'Academic & Research',desc:'Students, PhD researchers and university teams get affordable access to AI writing, citation and research tools.'},
    {icon:'💼',title:'Enterprise Teams',desc:'Managed bulk subscriptions for companies. Centralised billing, dedicated activation, priority support.'},
    {icon:'💻',title:'Developers',desc:'GitHub Copilot, Cursor AI and coding assistants for software teams. Individual or team licences.'},
    {icon:'✍️',title:'Content & Marketing',desc:'Grammarly, Jasper, Copy.ai and image generation tools for creators and marketing teams.'},
  ]),
  productsTitle:   'Premium subscriptions, ready to activate',
  productsSubtitle:'Official access to the world\'s leading AI platforms at a fraction of the standard price.',
  products:        JSON.stringify([
    {icon:'⚡',name:'Claude Pro',category:'AI Chat',desc:'Extended context, priority access and Projects.',from:'$15',color:'#2563eb'},
    {icon:'🤖',name:'ChatGPT Plus',category:'AI Chat',desc:'GPT-4o, DALL·E, browsing and advanced data analysis.',from:'$20',color:'#10a37f'},
    {icon:'📝',name:'Grammarly Premium',category:'Writing',desc:'Advanced grammar, style, tone and plagiarism checking.',from:'$12',color:'#7c3aed'},
    {icon:'💻',name:'GitHub Copilot',category:'Coding',desc:'AI code completion for VS Code, JetBrains and more.',from:'$10',color:'#24292f'},
    {icon:'🔍',name:'Perplexity Pro',category:'Research',desc:'AI-powered research with citations and deep search.',from:'$15',color:'#0891b2'},
    {icon:'🎨',name:'Midjourney',category:'Image AI',desc:'State-of-the-art AI image generation for creatives.',from:'$15',color:'#9333ea'},
  ]),
  pricingTitle:    'Simple, transparent pricing',
  pricingSubtitle: 'No hidden fees. Cancel any time. Same-day activation on all plans.',
  tiers:           JSON.stringify([
    {name:'Starter',price:'$10',period:'/month',desc:'For individuals and students',features:['1 AI tool subscription','Email support','Activation within 24h','Access to customer portal'],cta:'Get started',highlight:false},
    {name:'Professional',price:'$35',period:'/month',desc:'Most popular for researchers',features:['3 AI tool subscriptions','Priority WhatsApp support','Same-day activation','Access to customer portal','Renewal reminders'],cta:'Get started',highlight:true},
    {name:'Team',price:'$90',period:'/month',desc:'For teams of up to 5',features:['10 AI tool subscriptions','Dedicated account manager','1-hour activation SLA','Centralised billing','Monthly usage report','Custom invoice'],cta:'Talk to sales',highlight:false},
  ]),
  aboutTitle:      'Why organisations trust DTC',
  aboutDesc:       'Since 2022, Digital Tools Corner has activated over 10,000 AI subscriptions for customers in 50+ countries. We specialise in managed, official access — every account is personal and dedicated, never shared.',
  aboutFeatures:   JSON.stringify([
    {icon:'✓',title:'Official & dedicated access',desc:'Every subscription is a real, personal account — not shared or pooled.'},
    {icon:'⚡',title:'Same-day activation',desc:'Most orders are activated within 2–4 hours of payment confirmation.'},
    {icon:'🌐',title:'Global support',desc:'WhatsApp, WeChat and email support across all time zones, every day.'},
    {icon:'🔒',title:'Secure & reliable',desc:'Your data is never shared. All activations use verified official channels.'},
  ]),
  testimonialsTitle: 'Trusted by professionals worldwide',
  testimonials:    JSON.stringify([
    {quote:'Got my Claude Pro activated within 2 hours. The team was super responsive and the account works perfectly.',name:'Aisha M.',role:'PhD Student, Nigeria',product:'Claude Pro'},
    {quote:'Been using DTC for GitHub Copilot for 6 months. Never had a single issue. Support is fast and helpful.',name:'Wei C.',role:'Software Developer, China',product:'GitHub Copilot'},
    {quote:'Purchased ChatGPT Enterprise for our research lab. Professional service and proper invoicing.',name:'Dr. Omar K.',role:'University Researcher, UAE',product:'ChatGPT Plus'},
    {quote:'Perplexity Pro has been a game-changer for my literature reviews. DTC made it genuinely affordable.',name:'Sophia L.',role:'Masters Student, UK',product:'Perplexity Pro'},
    {quote:'Midjourney access at a fraction of the price. Activated in under 3 hours. Will definitely order again.',name:'Priya S.',role:'Graphic Designer, India',product:'Midjourney'},
    {quote:'Grammarly Premium for my thesis. Same-day delivery, pricing was incredibly fair. Highly recommended.',name:'Lucas R.',role:'MSc Research, Brazil',product:'Grammarly'},
  ]),
  faqTitle:        'Frequently asked questions',
  faqs:            JSON.stringify([
    {q:'How does activation work?',a:'After payment is verified, we send you a personal activation link by email. Click it, submit your account details, and your subscription is live within minutes.'},
    {q:'How long does activation take?',a:'Most orders are activated within 2–4 hours of payment confirmation. In busy periods it can take up to 12 hours. Same-day activation is standard.'},
    {q:'What payment methods do you accept?',a:'We accept WeChat Pay, Alipay, and bank transfer. After selecting your product you will see QR codes and instructions for each method.'},
    {q:'Are these official accounts?',a:'Yes — we provide official, dedicated access. You receive your own personal subscription, not a shared or degraded account.'},
    {q:'Can I renew through DTC?',a:'Yes. Log into the customer portal and use the self-service renewal button, or contact us directly and we will generate a renewal link for you.'},
    {q:'Do you offer team or bulk pricing?',a:'Yes. Contact us via WhatsApp or email for team pricing. We support bulk orders for organisations with 5 or more users.'},
  ]),
  ctaTitle:        'Ready to get started?',
  ctaSubtitle:     'Join 2,000+ customers already saving on premium AI tools. Activation takes minutes.',
  ctaCta1:         'Browse the shop',
  ctaCta2:         'Talk to us on WhatsApp',
  footerTagline:   'Official AI subscriptions for professionals, researchers and teams.',
  footerCols:      JSON.stringify([
    {title:'Products',links:[{label:'Claude Pro',href:'#products'},{label:'ChatGPT Plus',href:'#products'},{label:'GitHub Copilot',href:'#products'},{label:'All tools',href:'/shop'}]},
    {title:'Account',links:[{label:'My Account',href:'/customer'},{label:'Order status',href:'/shop'},{label:'Renewals',href:'/customer'}]},
    {title:'Company',links:[{label:'About',href:'#about'},{label:'Contact',href:'#contact'},{label:'WhatsApp',href:'https://wa.me/8619738122807'}]},
  ]),
  copyrightText:   '© 2025 Digital Tools Corner (DTC)',
}, null, 2));
if (!fs.existsSync(NOTIFY_FILE))    fs.writeFileSync(NOTIFY_FILE,   JSON.stringify({ enabled: false, message: '', type: 'info' }, null, 2));
if (!fs.existsSync(CHAT_FILE))      fs.writeFileSync(CHAT_FILE,      JSON.stringify({}, null, 2));
if (!fs.existsSync(RESELLERS_FILE))     fs.writeFileSync(RESELLERS_FILE,     JSON.stringify([], null, 2));
if (!fs.existsSync(RESELLER_OTPS_FILE)) fs.writeFileSync(RESELLER_OTPS_FILE, JSON.stringify({}, null, 2));
if (!fs.existsSync(PAYOUTS_FILE))       fs.writeFileSync(PAYOUTS_FILE,       JSON.stringify([], null, 2));
if (!fs.existsSync(ORDERS_FILE))        fs.writeFileSync(ORDERS_FILE,        JSON.stringify([], null, 2));
if (!fs.existsSync(WEBHOOKS_FILE))      fs.writeFileSync(WEBHOOKS_FILE,      JSON.stringify([], null, 2));
if (!fs.existsSync(ABANDONED_FILE))     fs.writeFileSync(ABANDONED_FILE,     JSON.stringify({}, null, 2));
if (!fs.existsSync(SHOP_SETTINGS_FILE)) fs.writeFileSync(SHOP_SETTINGS_FILE, JSON.stringify({
  paymentInstructions: '', bankDetails: '', wechatQr: '', alipayQr: '', bankQr: '',
  flashSale: { enabled: false, label: '', discountPct: 0, endsAt: null }
}, null, 2));
if (!fs.existsSync(TEMPLATES_FILE)) fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({"templates": [{"id": "welcome", "name": "✅ Welcome / Activation Confirmed", "subject": "Welcome to DTC — Your {{package}} is ready! 🎉", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#2563eb;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⚡</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Activation Confirmed</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">{{package}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Welcome to DTC, {{name}}! 🎉</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> is now active and ready to use. Here is everything you need to get started.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Status</span>\n  <div style=\"font-size:14px;font-weight:600;color:#15803d;margin-top:3px;font-family:monospace\">✓ Active</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What to do next</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Sign in to your account and check your plan status in Settings → Billing.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Start a conversation to confirm everything is working correctly.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Reach out on WeChat or email us if you need any help.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Thank you for choosing DTC. We are glad to have you.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326444Z"}, {"id": "renewal-30d", "name": "⏰ Renewal Reminder (30 days)", "subject": "Your {{package}} subscription expires in {{daysLeft}} days — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#d97706;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⏰</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Renewal Reminder</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Action needed</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Your subscription renews in {{daysLeft}} days</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, your <strong>{{package}}</strong> subscription will expire on <strong>{{expiry}}</strong>. Renew early to avoid any interruption.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Expiry Date</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">{{expiry}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Days Remaining</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">{{daysLeft}} days</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">💡</div>\n  <div style=\"font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px\">How to Renew</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Contact us on WeChat or reply to this email and we will set up your renewal link right away.</div>\n</td></tr></table><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Renewing takes less than 5 minutes. Contact us today to keep your access uninterrupted.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326466Z"}, {"id": "renewal-urgent", "name": "🚨 Urgent Renewal (3 days)", "subject": "Last chance to renew — expires {{expiry}} — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#dc2626;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">🚨</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Urgent Reminder</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Expires {{expiry}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">🚨</div>\n  <div style=\"font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px\">Urgent — Your subscription expires in {{daysLeft}} days</div>\n  <div style=\"font-size:13px;color:#7f1d1d;line-height:1.6\">After expiry your access will be suspended. Contact us immediately to renew.</div>\n</td></tr></table><h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Last chance to renew, {{name}}</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> subscription expires on <strong>{{expiry}}</strong>. This is your final reminder before access is suspended.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">⚠ Expires</span>\n  <div style=\"font-size:14px;font-weight:600;color:#dc2626;margin-top:3px;font-family:monospace\">{{expiry}}</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:14px;color:#475569;line-height:1.7\"><strong>To renew:</strong> Contact us on WeChat or reply to this email with your renewal request. We will generate your renewal link immediately.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326471Z"}, {"id": "expired", "name": "⏱ Subscription Expired", "subject": "Your {{package}} subscription has expired — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#dc2626;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">⏱</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Subscription Expired</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">{{package}}</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Your subscription has ended</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, your <strong>{{package}}</strong> subscription has expired and your access has been suspended.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">⏱</div>\n  <div style=\"font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px\">Access Suspended</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Your {{package}} access ended on {{expiry}}. Renew now to restore access immediately.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">Renew now — restore access in minutes</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Contact us on WeChat or reply to this email.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">We will send you a renewal activation link.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#dc262620;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#dc2626;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Complete the form and your access is restored immediately.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Questions? Reach us at <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#2563eb\">dtc@dtc1.shop</a> or on WeChat.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326475Z"}, {"id": "promo", "name": "🎁 Promotional / Special Offer", "subject": "Exclusive offer for DTC customers — {{name}} 🎁", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#15803d;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">🎁</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Special Offer</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Exclusive for you</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Exclusive offer for you, {{name}} 🎁</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">As a valued DTC customer, we are offering you an exclusive deal on your next subscription. Limited time only.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">🎉</div>\n  <div style=\"font-size:14px;font-weight:700;color:#15803d;margin-bottom:4px\">Special Offer — Limited Time</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">Upgrade or renew your plan and get an exclusive deal available only to existing customers. Contact us on WeChat to claim it before it expires.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What is included</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Access to all premium AI tools at a discounted rate.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Priority processing — your link is activated same day.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#15803d20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#15803d;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Dedicated support via WeChat throughout your subscription.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">To claim your offer, simply contact us on WeChat and mention this email. Offer available while stocks last.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326478Z"}, {"id": "announcement", "name": "📢 General Announcement", "subject": "Important update from DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#6366f1;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">📢</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Announcement</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">DTC Update</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Important update from DTC</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Hi <strong>{{name}}</strong>, we have something important to share with all our customers.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 12px;font-size:15px;color:#1e293b;line-height:1.7\"><strong>[Write your announcement here]</strong></p><p style=\"margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7\">[Add more details about the update, what it means for customers, and any action required.]</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">If you have any questions about this update, reply to this email or contact us on WeChat. We are always happy to help.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326484Z"}, {"id": "payment-thanks", "name": "💳 Payment Received", "subject": "Payment received — thank you, {{name}}! — DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#0891b2;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">💳</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">Payment Received</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Thank you</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">Payment received — thank you, {{name}}!</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">We have received your payment and your activation link is being processed. You will hear from us shortly.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Package</span>\n  <div style=\"font-size:14px;font-weight:600;color:#1e293b;margin-top:3px;font-family:monospace\">{{package}}</div>\n</td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:10px\">\n<tr><td style=\"padding:10px 16px\">\n  <span style=\"font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.07em;font-weight:600\">Status</span>\n  <div style=\"font-size:14px;font-weight:600;color:#b45309;margin-top:3px;font-family:monospace\">⏳ Processing — we will be in touch shortly</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">What happens next</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">We verify your payment and prepare your activation link. This usually takes a few hours.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">You receive your unique activation link via WeChat or email.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">You submit your account details and your subscription is activated.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Thank you for your trust in DTC. If you have any questions in the meantime, contact us on WeChat.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326488Z"}, {"id": "win-back", "name": "💙 Win Back / Re-engagement", "subject": "We miss you, {{name}} — come back to DTC", "body": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/></head><body style=\"margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif\">\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f4ff;padding:32px 16px\">\n<tr><td align=\"center\">\n<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.08)\">\n\n<!-- Header -->\n<tr><td style=\"background:#2563eb;padding:32px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:28px;line-height:1\">💙</td>\n    <td style=\"padding-left:12px\">\n      <div style=\"font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em\">DTC</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.04em\">DIGITAL TOOLS CORNER</div>\n    </td>\n    <td align=\"right\">\n      <div style=\"font-size:13px;font-weight:700;color:rgba(255,255,255,.9)\">We Miss You</div>\n      <div style=\"font-size:11px;color:rgba(255,255,255,.6);margin-top:2px\">Come back to DTC</div>\n    </td>\n  </tr></table>\n</td></tr>\n\n<!-- Body -->\n<tr><td style=\"padding:36px 36px 28px\">\n<h1 style=\"margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-.02em;line-height:1.2\">We miss you, {{name}}</h1><p style=\"margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7\">Your <strong>{{package}}</strong> subscription expired on <strong>{{expiry}}</strong>. We would love to have you back.</p><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:20px\">\n<tr><td style=\"padding:16px 20px\">\n  <div style=\"font-size:20px;margin-bottom:6px\">💙</div>\n  <div style=\"font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px\">Special returning customer offer</div>\n  <div style=\"font-size:13px;color:#475569;line-height:1.6\">As a previous DTC customer, you qualify for our returning customer rate. Contact us on WeChat to find out more.</div>\n</td></tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><h2 style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#1e293b\">Why customers come back to DTC</h2><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">1</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Same-day activation — your link is processed within hours.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">2</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Flexible packages — monthly, quarterly, or annual plans.</td>\n</tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:10px\">\n<tr>\n  <td width=\"32\" valign=\"top\"><div style=\"width:26px;height:26px;background:#2563eb20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;text-align:center;line-height:26px\">3</div></td>\n  <td style=\"padding-left:10px;font-size:14px;color:#475569;line-height:1.6;padding-top:3px\">Dedicated WeChat support throughout your subscription.</td>\n</tr></table><div style=\"height:1px;background:#e2e8f0;margin:24px 0\"></div><p style=\"margin:0 0 0;font-size:13px;color:#64748b;line-height:1.7\">Ready to get back on board? Contact us on WeChat and we will set everything up for you.</p>\n</td></tr>\n\n<!-- Footer -->\n<tr><td style=\"background:#f8faff;border-top:1px solid #e2e8f0;padding:18px 36px\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n    <td style=\"font-size:12px;color:#94a3b8;line-height:1.6\">\n      DTC — Digital Tools Corner &nbsp;·&nbsp; \n      <a href=\"mailto:dtc@dtc1.shop\" style=\"color:#94a3b8;text-decoration:none\">dtc@dtc1.shop</a>\n    </td>\n    <td align=\"right\" style=\"font-size:11px;color:#cbd5e1\">Automated email</td>\n  </tr></table>\n</td></tr>\n\n</table>\n</td></tr></table>\n</body></html>", "lastModified": "2026-04-06T23:16:18.326494Z"}]}, null, 2));

// ── Default products ───────────────────────────────────────────────────────────
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({
    products: [
      {
        id: 'claude-pro',
        name: 'Claude Pro',
        description: 'Access to Claude Opus, extended usage limits, and priority service.',
        type: 'session',           // 'session' = customer submits org ID / session data
        credentialsMode: false,    // false = ask customer for their details
        loginDetails: '',          // used when credentialsMode = true
        packages: [
          { label: 'Claude Pro — 1 Month',  price: 15, durationDays: 30  },
          { label: 'Claude Pro — 3 Months', price: 40, durationDays: 90  },
          { label: 'Claude Pro — 6 Months', price: 75, durationDays: 180 },
          { label: 'Claude Pro — 1 Year',   price: 140, durationDays: 365 },
        ],
        color: '#2563eb',
        active: true,
      },
      {
        id: 'chatgpt-plus',
        name: 'ChatGPT Plus',
        description: 'Access to GPT-4o, DALL·E image generation, and all premium features.',
        type: 'chatgpt',
        credentialsMode: false,
        loginDetails: '',
        packages: [
          { label: 'ChatGPT Plus — 1 Month',  price: 20, durationDays: 30  },
          { label: 'ChatGPT Plus — 3 Months', price: 55, durationDays: 90  },
          { label: 'ChatGPT Plus — 6 Months', price: 100, durationDays: 180 },
          { label: 'ChatGPT Plus — 1 Year',   price: 190, durationDays: 365 },
        ],
        color: '#10a37f',
        active: true,
      }
    ]
  }, null, 2));
}

if (!fs.existsSync(INSTRUCTIONS_FILE)) {
  fs.writeFileSync(INSTRUCTIONS_FILE, JSON.stringify({
    sets: {
      'default-claude': {
        id: 'default-claude', name: 'Claude Pro — Default',
        processingText: 'Your details have been received and are being reviewed by the DTC team. This page will update automatically once your Claude Pro account is activated.',
        approvedText: 'Your Claude Pro package is now live and ready to use.',
        approvedSteps: ['Open claude.ai and sign in.','Click your profile icon → Settings → Billing.','Your plan should now show as Claude Pro.'],
        postApprovedText: 'Your Claude Pro subscription is active. Here is what to do next.',
        postApprovedSteps: ['Try Claude Opus for complex tasks.','Use Projects to organise conversations.','Contact DTC on WeChat if you need help.']
      },
      'chatgpt-plus': {
        id: 'chatgpt-plus', name: 'ChatGPT Plus — Default',
        processingText: 'Your ChatGPT Plus session details have been received and are being reviewed.',
        approvedText: 'Your ChatGPT Plus package has been successfully activated.',
        approvedSteps: ['Open ChatGPT at chatgpt.com.','You should see a Plus badge next to your profile.','GPT-4o and image generation are now available.'],
        postApprovedText: 'Welcome to ChatGPT Plus! Here is how to get started.',
        postApprovedSteps: ['Use GPT-4o for faster smarter conversations.','Generate images with DALL·E inside the chat.','Contact DTC on WeChat if you need help.']
      }
    }
  }, null, 2));
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting — protect public-facing endpoints ────────────────────────
const _rl = (max, windowMin) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down and try again in a few minutes.' },
});
// Customer-facing endpoints: strict (prevents enumeration & spam)
app.use('/api/validate-token',   _rl(30, 15));   // 30 per 15 min
app.use('/api/submit',           _rl(10, 15));   // 10 per 15 min
app.use('/api/customer-lookup',  _rl(10, 15));   // 10 per 15 min
app.use('/api/status',           _rl(60, 15));   // 60 per 15 min (polled)
app.use('/api/chat/open',        _rl(10, 15));   // 10 per 15 min
app.use('/api/chat/send',        _rl(30, 15));   // 30 per 15 min
app.use('/api/chat/poll',        _rl(120, 15));  // 120 per 15 min (polled every 5s)
app.use('/api/reseller-otp',     _rl(5,  15));   // 5 per 15 min (OTP sends)
app.use('/api/reseller-dashboard', _rl(20, 15)); // 20 per 15 min

// ── File helpers ───────────────────────────────────────────────────────────────
const loadTokens      = () => JSON.parse(fs.readFileSync(TOKENS_FILE,  'utf8'));
const saveTokens      = t  => fs.writeFileSync(TOKENS_FILE,  JSON.stringify(t, null, 2));
const loadEmailCfg    = () => JSON.parse(fs.readFileSync(EMAIL_CONFIG, 'utf8'));
const saveEmailCfg    = c  => fs.writeFileSync(EMAIL_CONFIG, JSON.stringify(c, null, 2));
const loadEmailLog    = () => JSON.parse(fs.readFileSync(EMAIL_LOG,    'utf8'));
const saveEmailLog    = l  => fs.writeFileSync(EMAIL_LOG,    JSON.stringify(l, null, 2));
const loadInstructions= () => JSON.parse(fs.readFileSync(INSTRUCTIONS_FILE, 'utf8'));
const saveInstructions= i  => fs.writeFileSync(INSTRUCTIONS_FILE, JSON.stringify(i, null, 2));
const loadNotify      = () => JSON.parse(fs.readFileSync(NOTIFY_FILE,  'utf8'));
const saveNotify      = n  => fs.writeFileSync(NOTIFY_FILE,  JSON.stringify(n, null, 2));
const loadProducts    = () => JSON.parse(fs.readFileSync(PRODUCTS_FILE,'utf8'));
const saveProducts    = p  => fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(p, null, 2));
const isAdmin         = k  => k === ADMIN_KEY;
const loadTemplates   = () => JSON.parse(fs.readFileSync(TEMPLATES_FILE,'utf8'));
const saveTemplates   = t  => fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(t, null, 2));
const loadSettings    = () => JSON.parse(fs.readFileSync(SETTINGS_FILE,'utf8'));
const saveSettings    = s  => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
const loadOrders      = () => JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
const saveOrders      = o  => fs.writeFileSync(ORDERS_FILE, JSON.stringify(o, null, 2));
const loadShopSettings= () => JSON.parse(fs.readFileSync(SHOP_SETTINGS_FILE,'utf8'));
const saveShopSettings= s  => fs.writeFileSync(SHOP_SETTINGS_FILE, JSON.stringify(s, null, 2));
const loadWebhooks    = () => JSON.parse(fs.readFileSync(WEBHOOKS_FILE,'utf8'));
const saveWebhooks    = w  => fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(w, null, 2));
const loadAbandoned   = () => JSON.parse(fs.readFileSync(ABANDONED_FILE,'utf8'));
const saveAbandoned   = a  => fs.writeFileSync(ABANDONED_FILE, JSON.stringify(a, null, 2));
const loadLanding     = () => JSON.parse(fs.readFileSync(LANDING_FILE,'utf8'));
const saveLanding     = c  => fs.writeFileSync(LANDING_FILE, JSON.stringify(c, null, 2));
const loadResellers   = () => { try { return JSON.parse(fs.readFileSync(RESELLERS_FILE,'utf8')); } catch { return []; } };
const saveResellers   = r  => fs.writeFileSync(RESELLERS_FILE, JSON.stringify(r, null, 2));
const loadOtps        = () => { try { return JSON.parse(fs.readFileSync(RESELLER_OTPS_FILE,'utf8')); } catch { return {}; } };
const saveOtps        = o  => fs.writeFileSync(RESELLER_OTPS_FILE, JSON.stringify(o, null, 2));
const loadPayouts     = () => { try { return JSON.parse(fs.readFileSync(PAYOUTS_FILE,'utf8')); } catch { return []; } };
const savePayouts     = p  => fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(p, null, 2));

// ── Duration lookup — checks product packages first, falls back to label parsing ──
function getDurationDays(productId, packageLabel) {
  try {
    const { products } = loadProducts();
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const pkg = prod.packages.find(pk => pk.label === packageLabel);
      if (pkg) return pkg.durationDays;
    }
  } catch {}
  // Fallback to label parsing
  const p = (packageLabel || '').toLowerCase();
  if (p.includes('1 year') || p.includes('12 month')) return 365;
  if (p.includes('6 month')) return 180;
  if (p.includes('3 month')) return 90;
  return 30;
}

// ── Get price for a package ────────────────────────────────────────────────────
function getPrice(productId, packageLabel) {
  try {
    const { products } = loadProducts();
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const pkg = prod.packages.find(pk => pk.label === packageLabel);
      if (pkg) return pkg.price || 0;
    }
  } catch {}
  return 0;
}

// ── Template variable replacement ─────────────────────────────────────────────
function applyTemplateVars(text, token) {
  const t = token || {};
  const expDate = t.subscriptionExpiresAt
    ? new Date(t.subscriptionExpiresAt).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})
    : '—';
  const daysLeft = t.subscriptionExpiresAt
    ? Math.ceil((new Date(t.subscriptionExpiresAt) - new Date()) / (1000*60*60*24))
    : 0;
  return text
    .replace(/{{name}}/g,     t.customerName || 'Customer')
    .replace(/{{package}}/g,  t.packageType  || '')
    .replace(/{{product}}/g,  t.productName  || t.productId || '')
    .replace(/{{email}}/g,    t.email        || '')
    .replace(/{{wechat}}/g,   t.wechat       || '')
    .replace(/{{expiry}}/g,   expDate)
    .replace(/{{daysLeft}}/g, String(daysLeft > 0 ? daysLeft : 0));
}

// ── Revenue helpers ────────────────────────────────────────────────────────────
function calcRevenue(tokens) {
  const byProduct  = {};
  const byReseller = {};
  let total        = 0;
  let resellerTotal= 0;
  let directTotal  = 0;
  for (const t of Object.values(tokens)) {
    if (!t.approved || !t.price) continue;
    const pid = t.productId || 'unknown';
    byProduct[pid] = (byProduct[pid] || 0) + t.price;
    total += t.price;
    if (t.resellerId) {
      const rid = t.resellerId;
      if (!byReseller[rid]) byReseller[rid] = { name: t.resellerName || rid, total: 0, count: 0 };
      byReseller[rid].total += t.price;
      byReseller[rid].count++;
      resellerTotal += t.price;
    } else {
      directTotal += t.price;
    }
  }
  return { total, byProduct, byReseller, resellerTotal, directTotal };
}

// ── Email ──────────────────────────────────────────────────────────────────────
function buildTransporter() {
  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;
  const port = parseInt(cfg.port) || 587;
  return nodemailer.createTransport({ host: cfg.host, port, secure: port === 465, auth: { user: cfg.user, pass: cfg.pass }, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 15000, tls: { rejectUnauthorized: false } });
}
async function sendEmail({ to, subject, html, type, token }) {
  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass) return { ok: false, error: 'Email not configured.' };
  try {
    const tr = buildTransporter();
    await tr.verify();
    await tr.sendMail({ from: `"${cfg.fromName || 'DTC'}" <${cfg.user}>`, to, subject, html });
    const log = loadEmailLog(); log.push({ sentAt: new Date().toISOString(), to, subject, type, token: token || null }); saveEmailLog(log);
    return { ok: true };
  } catch (err) {
    let msg = err.message || 'Unknown error';
    if (msg.includes('ECONNREFUSED')) msg = `Connection refused on ${cfg.host}:${cfg.port}.`;
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) msg = 'Connection timed out. Use Gmail App Password on port 587.';
    if (msg.includes('ENOTFOUND')) msg = `Host "${cfg.host}" not found.`;
    if (msg.includes('535') || msg.includes('auth')) msg = 'Auth failed. For Gmail use an App Password.';
    return { ok: false, error: msg };
  }
}
const baseEmail = body => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#2563eb;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">DTC</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Digital Tools Corner</div></div><div style="padding:32px">${body}</div><div style="padding:20px 32px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">DTC · Automated notification.</div></div>`;
const reminderTemplate = ({ customerName, packageType, expiryDate, daysLeft, renewLink }) => baseEmail(
  '<h2 style="color:#1e293b;margin:0 0 12px;font-size:1.05rem">Your subscription expires in ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</h2>' +
  '<p style="color:#64748b;line-height:1.7;margin:0 0 16px">Hi ' + customerName + ', your <strong>' + packageType + '</strong> expires on <strong style="color:#d97706">' + expiryDate + '</strong>.</p>' +
  (renewLink
    ? '<div style="text-align:center;margin:20px 0"><a href="' + renewLink + '" style="background:#2563eb;color:#fff;text-decoration:none;border-radius:9px;padding:13px 32px;font-weight:600;font-size:.9rem;display:inline-block">Renew My Subscription →</a></div>' +
      '<p style="font-size:.73rem;color:#94a3b8;text-align:center;margin:0 0 16px">Click the button above to complete your renewal — takes 2 minutes.</p>'
    : '<p style="color:#64748b;margin:0 0 16px">Contact us on WeChat to renew.</p>') +
  '<div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px">' +
  '<div style="font-size:.78rem;color:#64748b">Expires: <strong style="color:#d97706">' + expiryDate + '</strong> · ' + daysLeft + ' days left</div></div>'
);
const expiredTemplate  = ({ customerName, packageType }) => baseEmail(`<h2 style="color:#1e293b;margin:0 0 16px">Your subscription has ended</h2><p style="color:#64748b">Hi ${customerName}, your <strong>${packageType}</strong> has expired. Contact us on WeChat or at <a href="mailto:dtc@dtc1.shop">dtc@dtc1.shop</a> to renew.</p>`);

// ── Activation receipt template ────────────────────────────────────────────────
function receiptTemplate(t) {
  const sym         = t.currencySymbol || '$';
  const price       = t.price ? `${sym}${parseFloat(t.price).toFixed(2)}` : '—';
  const activatedOn = t.approvedAt
    ? new Date(t.approvedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
    : new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const expiresOn   = t.subscriptionExpiresAt
    ? new Date(t.subscriptionExpiresAt).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
    : '—';
  const daysTotal   = t.subscriptionDays || t.durationDays || 30;
  const productLabel= t.productName || t.productId || 'AI Tool';
  const receiptNo   = `DTC-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  const row = (label, value, color) =>
    `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;font-weight:500;width:140px;vertical-align:top">${label}</td>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:${color||'#1e293b'};text-align:right;font-family:monospace;font-weight:600">${value}</td>
    </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(37,99,235,.1)">

<tr><td style="background:#2563eb;padding:28px 36px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.03em">DTC</div>
      <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;letter-spacing:.06em;text-transform:uppercase">Digital Tools Corner</div>
    </td>
    <td align="right">
      <div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px">
        <div style="font-size:10px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Activation Receipt</div>
        <div style="font-size:12px;color:#fff;font-family:monospace;font-weight:700">${receiptNo}</div>
      </div>
    </td>
  </tr></table>
</td></tr>

<tr><td style="padding:32px 36px 28px">

  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr>
    <td style="width:44px;vertical-align:top">
      <div style="width:44px;height:44px;background:#f0fdf4;border-radius:50%;border:2px solid #bbf7d0;text-align:center;line-height:44px;font-size:18px">✓</div>
    </td>
    <td style="padding-left:14px;vertical-align:middle">
      <div style="font-size:18px;font-weight:700;color:#1e293b;letter-spacing:-.02em">Subscription Activated</div>
      <div style="font-size:13px;color:#16a34a;font-weight:500;margin-top:3px">Your access is now live — welcome to DTC!</div>
    </td>
  </tr></table>

  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">Hi <strong style="color:#1e293b">${t.customerName || 'there'}</strong>, your subscription has been activated successfully. Please keep this email as your receipt.</p>

  <div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:12px">Order Details</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Receipt No.', receiptNo)}
      ${row('Product', productLabel)}
      ${row('Package', t.packageType || '—')}
      ${row('Amount Paid', price, '#16a34a')}
      ${row('Currency', t.currency || 'USD')}
      ${row('Activated On', activatedOn, '#2563eb')}
      ${row('Expires On', expiresOn, '#d97706')}
      ${row('Duration', daysTotal + ' days')}
    </table>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#15803d;margin-bottom:12px">Your Account</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Name', t.customerName || '—')}
      ${t.email  ? row('Email',  t.email)  : ''}
      ${t.wechat ? row('WeChat', t.wechat) : ''}
    </table>
  </div>

  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px">
    <div style="font-size:13px;color:#92400e;line-height:1.65">
      <strong style="display:block;margin-bottom:4px">⏰ Renewal reminder</strong>
      Your subscription expires on <strong>${expiresOn}</strong> (${daysTotal} days from activation).
      We will send you a reminder before it expires. To renew early, contact us on WeChat or reply to this email.
    </div>
  </div>

  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px">
    <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:10px">Need help? Reach us anytime:</div>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#64748b;min-width:70px">Email</td><td style="padding:3px 0"><a href="mailto:dtc@dtc1.shop" style="color:#2563eb;text-decoration:none;font-size:12px;font-family:monospace">dtc@dtc1.shop</a></td></tr>
      <tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#64748b">WhatsApp</td><td style="padding:3px 0"><a href="https://wa.me/8619738122807" style="color:#25d366;text-decoration:none;font-size:12px;font-family:monospace">+86 197 3812 2807</a></td></tr>
      <tr><td style="padding:3px 12px 3px 0;font-size:12px;color:#64748b">Portal</td><td style="padding:3px 0"><a href="/customer" style="color:#2563eb;text-decoration:none;font-size:12px">Check subscription status →</a></td></tr>
    </table>
  </div>

</td></tr>

<tr><td style="background:#f8faff;border-top:1px solid #e2e8f0;padding:16px 36px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:11px;color:#94a3b8;line-height:1.6">DTC — Digital Tools Corner &nbsp;·&nbsp; <a href="mailto:dtc@dtc1.shop" style="color:#94a3b8;text-decoration:none">dtc@dtc1.shop</a></td>
    <td align="right" style="font-size:10px;color:#cbd5e1">${receiptNo}</td>
  </tr></table>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function checkSubscriptionEmails() {
  const cfg = loadEmailCfg(); if (!cfg.host || !cfg.user || !cfg.pass) return;
  const tokens = loadTokens(); const now = new Date(); let changed = false;

  for (const [token, t] of Object.entries(tokens)) {
    // ── Subscription reminders (existing) ──────────────────────────────────
    if (t.approved && t.subscriptionExpiresAt && t.email) {
      const expiry   = new Date(t.subscriptionExpiresAt);
      const daysLeft = Math.ceil((expiry - now) / (1000*60*60*24));
      if (daysLeft === 5 && !t.reminder5Sent) {
        // Generate a fresh renewal link for the same product + package
        const renewToken = uuidv4();
        const renewExpiry = new Date(Date.now() + LINK_EXPIRY_MS).toISOString();
        tokens[renewToken] = {
          customerName: t.customerName, productId: t.productId, productName: t.productName,
          packageType: t.packageType, price: t.price, currency: t.currency,
          currencySymbol: t.currencySymbol, resellerId: t.resellerId, resellerName: t.resellerName,
          customEmail: t.customEmail, product: t.product, credentialsMode: t.credentialsMode,
          loginDetails: t.loginDetails, accessLink: t.accessLink,
          instructionSetId: t.instructionSetId, postInstructionSetId: t.postInstructionSetId,
          createdAt: new Date().toISOString(), expiresAt: renewExpiry, durationDays: t.durationDays,
          used: false, approved: false, declined: false, deactivated: false,
          renewalFor: token,  // link back to the original token
        };
        const renewLink = (process.env.BASE_URL || 'https://dtc1.shop') + '/submit?token=' + renewToken;
        const r = await sendEmail({
          to: t.email,
          subject: 'Your ' + t.packageType + ' expires in 5 days — renew now',
          html: reminderTemplate({
            customerName: t.customerName, packageType: t.packageType,
            expiryDate: expiry.toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}),
            daysLeft: 5, renewLink,
          }),
          type: 'reminder_5d', token
        });
        if (r.ok) { tokens[token].reminder5Sent = true; changed = true; }
      }
      if (daysLeft <= 0 && !t.expiredEmailSent) {
        const r = await sendEmail({ to: t.email, subject: `Subscription expired — DTC`, html: expiredTemplate({ customerName: t.customerName, packageType: t.packageType }), type: 'expired', token });
        if (r.ok) { tokens[token].expiredEmailSent = true; changed = true; }
      }

      // ── Notify reseller when customer is expiring in 7 days ──────────────
      if (daysLeft === 7 && !t.resellerNotified7d && t.resellerId) {
        const registry = loadResellers();
        const resellerEntry = registry.find(re => re.id && re.id.trim().toLowerCase() === t.resellerId.trim().toLowerCase());
        const resellerEmail = resellerEntry && resellerEntry.email;
        if (resellerEmail) {
          const expiryStr = new Date(t.subscriptionExpiresAt).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'});
          const resellerHtml = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
            + '<div style="background:#d97706;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">DTC Reseller Alert</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Customer expiring soon</div></div>'
            + '<div style="padding:28px 32px">'
            + '<h2 style="margin:0 0 8px;color:#1e293b;font-size:1rem">Action needed — customer expiring in 7 days</h2>'
            + '<p style="color:#64748b;line-height:1.7;margin:0 0 16px">Your customer <strong>' + t.customerName + '</strong> has a subscription expiring soon. Reach out to them to arrange renewal.</p>'
            + '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:16px">'
            + '<table width="100%" cellpadding="0" cellspacing="0">'
            + '<tr><td style="font-size:12px;color:#92400e;padding:4px 0;font-weight:600;width:110px">Customer</td><td style="font-size:13px;color:#1e293b;font-weight:700">' + t.customerName + '</td></tr>'
            + '<tr><td style="font-size:12px;color:#92400e;padding:4px 0;font-weight:600">Package</td><td style="font-size:13px;color:#1e293b">' + t.packageType + '</td></tr>'
            + '<tr><td style="font-size:12px;color:#92400e;padding:4px 0;font-weight:600">Expires</td><td style="font-size:13px;color:#d97706;font-weight:700">' + expiryStr + '</td></tr>'
            + (t.email ? '<tr><td style="font-size:12px;color:#92400e;padding:4px 0;font-weight:600">Email</td><td style="font-size:13px;color:#1e293b;font-family:monospace">' + t.email + '</td></tr>' : '')
            + '</table></div>'
            + '<p style="font-size:12px;color:#94a3b8;line-height:1.6">Contact the customer to arrange renewal. Log in to your reseller portal to view all expiring customers.</p>'
            + '</div>'
            + '<div style="padding:14px 32px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">DTC · Reseller notification</div>'
            + '</div>';
          const rr = await sendEmail({ to: resellerEmail, subject: t.customerName + ' expires in 7 days — ' + t.packageType, html: resellerHtml, type: 'reseller_alert_7d', token });
          if (rr.ok) { tokens[token].resellerNotified7d = true; changed = true; }
        }
      }

      // ── Win-back: 30 days after expiry with no renewal ───────────────────
      if (daysLeft <= -30 && !t.winBackSent && t.email) {
        const r = await sendEmail({
          to: t.email,
          subject: `We miss you, ${t.customerName} — come back to DTC`,
          html: baseEmail(`
            <h2 style="color:#1e293b;margin:0 0 12px;font-size:1.1rem">We miss you, ${t.customerName} 💙</h2>
            <p style="color:#64748b;line-height:1.7;margin:0 0 16px">Your <strong>${t.packageType}</strong> subscription ended 30 days ago. As a returning customer, you qualify for our special re-activation rate.</p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:16px">
              <div style="font-size:.78rem;font-weight:700;color:#1d4ed8;margin-bottom:6px">💙 Returning customer offer</div>
              <div style="font-size:.75rem;color:#475569;line-height:1.6">Contact us on WeChat or reply to this email to claim your special returning-customer rate. We'll get you set up right away.</div>
            </div>
            <p style="font-size:.75rem;color:#94a3b8;line-height:1.6">Questions? <a href="mailto:dtc@dtc1.shop" style="color:#2563eb">dtc@dtc1.shop</a> or WhatsApp +86 197 3812 2807</p>`),
          type: 'winback', token
        });
        if (r.ok) { tokens[token].winBackSent = true; changed = true; }
      }
    }

    // ── Stale link follow-up: opened 48h+ ago, not submitted ─────────────
    if (t.firstAccessedAt && !t.used && !t.deactivated && !t.staleFollowupSent) {
      const hrsOpen = (now - new Date(t.firstAccessedAt)) / 3600000;
      const emailTo = t.email || null; // email not yet submitted, check token
      if (hrsOpen >= 48 && emailTo) {
        const linkUrl = `${process.env.BASE_URL || 'https://dtc1.shop'}/submit?token=${token}`;
        const r = await sendEmail({
          to: emailTo,
          subject: `Still need help activating your ${t.packageType}? — DTC`,
          html: baseEmail(`
            <h2 style="color:#1e293b;margin:0 0 12px;font-size:1.1rem">Still need help, ${t.customerName}? 👋</h2>
            <p style="color:#64748b;line-height:1.7;margin:0 0 16px">You opened your ${t.packageType} activation link 2 days ago but haven't completed it yet. Your link is still valid — it only takes 2 minutes.</p>
            <div style="text-align:center;margin:20px 0">
              <a href="${linkUrl}" style="background:#2563eb;color:#fff;text-decoration:none;border-radius:9px;padding:12px 28px;font-weight:600;font-size:.88rem;display:inline-block">Complete My Activation →</a>
            </div>
            <p style="font-size:.75rem;color:#94a3b8;line-height:1.6">Need help? Reply to this email or contact us on WeChat — we're happy to walk you through it.</p>`),
          type: 'stale_followup', token
        });
        if (r.ok) { tokens[token].staleFollowupSent = true; changed = true; }
      }
    }
  }

  if (changed) saveTokens(tokens);
}
setInterval(checkSubscriptionEmails, 60*60*1000);
setTimeout(checkSubscriptionEmails, 30000);

// ── Daily backup — runs at 02:00 server time, keeps last 30 ───────────────
function runBackup() {
  try {
    const stamp   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outFile = path.join(BACKUP_DIR, 'dtc-backup-' + stamp + '.tar');
    // Write a JSON bundle of all data files
    const bundle  = {};
    const dataFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') || f.endsWith('.txt'));
    for (const f of dataFiles) {
      try { bundle[f] = fs.readFileSync(path.join(DATA_DIR, f), 'utf8'); } catch {}
    }
    fs.writeFileSync(outFile, JSON.stringify({ createdAt: new Date().toISOString(), files: bundle }, null, 2));
    // Keep only last 30 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('dtc-backup-'))
      .sort()
      .reverse();
    backups.slice(30).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {} });
    console.log('[Backup] Saved ' + path.basename(outFile) + ' (' + dataFiles.length + ' files)');
  } catch(e) { console.error('[Backup] Failed:', e.message); }
}

// Schedule backup at 02:00 each day
function scheduleDailyBackup() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const msUntil = next - now;
  setTimeout(() => { runBackup(); setInterval(runBackup, 24*60*60*1000); }, msUntil);
  console.log('[Backup] Next backup in ' + Math.round(msUntil / 60000) + ' min');
}
scheduleDailyBackup();

// ── Backup API — list and restore ─────────────────────────────────────────
app.get('/admin/backups', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('dtc-backup-'))
      .sort().reverse()
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, createdAt: stat.mtime.toISOString() };
      });
    res.json({ backups: files });
  } catch { res.json({ backups: [] }); }
});

app.post('/admin/backups/run-now', (req, res) => {
  if (!isAdmin(req.body.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  runBackup();
  res.json({ success: true, message: 'Backup created.' });
});

app.post('/admin/backups/restore', (req, res) => {
  const { adminKey, filename } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!filename || !filename.startsWith('dtc-backup-')) return res.status(400).json({ error: 'Invalid backup file.' });
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup not found.' });
  try {
    const bundle = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const files  = bundle.files || {};
    // Back up current state before restoring
    runBackup();
    // Restore each file
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(DATA_DIR, name), content);
    }
    res.json({ success: true, restored: Object.keys(files).length + ' files' });
  } catch(e) { res.status(500).json({ error: 'Restore failed: ' + e.message }); }
});

// ── Helper: get instruction sets for a token ───────────────────────────────────
function getInstrSets(t) {
  const instr = loadInstructions();
  const pre   = instr.sets[t.instructionSetId]     || instr.sets['default-claude'] || {};
  const post  = instr.sets[t.postInstructionSetId] || pre;
  return { pre, post };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Products CRUD ──────────────────────────────────────────────────────────────
app.get('/admin/products', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadProducts());
});
app.post('/admin/products/save', (req, res) => {
  const { adminKey, product } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!product || !product.id || !product.name) return res.status(400).json({ error: 'Invalid product.' });
  const data = loadProducts();
  const idx = data.products.findIndex(p => p.id === product.id);
  if (idx >= 0) data.products[idx] = product; else data.products.push(product);
  saveProducts(data);
  res.json({ success: true });
});
app.post('/admin/products/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadProducts();
  data.products = data.products.filter(p => p.id !== id);
  saveProducts(data);
  res.json({ success: true });
});

// ── Revenue ────────────────────────────────────────────────────────────────────
app.get('/admin/revenue', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  res.json(calcRevenue(tokens));
});

// ── Generate link ──────────────────────────────────────────────────────────────
app.post('/admin/generate', (req, res) => {
  const { adminKey, customerName, productId, packageLabel, price, instructionSetId, postInstructionSetId, resellerId, resellerName, customEmail } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!customerName)  return res.status(400).json({ error: 'Customer name is required.' });
  if (!productId)     return res.status(400).json({ error: 'Product is required.' });
  if (!packageLabel)  return res.status(400).json({ error: 'Package is required.' });
  if (!price && price !== 0) return res.status(400).json({ error: 'Price is required. Please set a price before generating a link.' });
  if (parseFloat(price) <= 0) return res.status(400).json({ error: 'Price must be greater than 0. Cannot generate a free link.' });

  // Look up product
  const { products } = loadProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(400).json({ error: 'Product not found.' });

  const token     = uuidv4();
  const tokens    = loadTokens();
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MS).toISOString();
  const durationDays = getDurationDays(productId, packageLabel);
  const instrId   = instructionSetId     || (product.type === 'chatgpt' ? 'chatgpt-plus' : 'default-claude');
  const postId    = postInstructionSetId || instrId;

  tokens[token] = {
    customerName,
    productId,
    productName:      product.name,
    packageType:      packageLabel,
    price:            parseFloat(price),
    currency:         loadSettings().currency || 'USD',
    currencySymbol:   loadSettings().currencySymbol || '$',
    resellerId:       resellerId   || null,
    resellerName:     resellerName || null,
    customEmail:      customEmail  || null,
    product:          product.type,           // kept for backward-compat
    credentialsMode:  product.credentialsMode || false,
    loginDetails:     product.loginDetails    || '',
    instructionSetId: instrId,
    postInstructionSetId: postId,
    createdAt:    new Date().toISOString(),
    expiresAt,
    durationDays,
    used: false, approved: false, declined: false, deactivated: false,
  };
  saveTokens(tokens);
  const link = `${req.protocol}://${req.get('host')}/submit?token=${token}`;
  res.json({ link, token, expiresAt, price: parseFloat(price) });
});

// ── Deactivate / Reactivate ────────────────────────────────────────────────────
app.post('/admin/deactivate', (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].deactivated = true; tokens[token].deactivatedAt = new Date().toISOString(); saveTokens(tokens); res.json({ success: true });
});
app.post('/admin/reactivate', (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].deactivated = false; delete tokens[token].deactivatedAt; saveTokens(tokens); res.json({ success: true });
});

// ── Update token fields ─────────────────────────────────────────────────────
// Allows admin to edit: customerName, email, wechat, packageType, price, notes, customEmail
app.post('/admin/token/update', (req, res) => {
  const { adminKey, token, fields } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  const allowed = ['customerName','email','wechat','packageType','price','notes','customEmail'];
  allowed.forEach(k => { if (fields[k] !== undefined) tokens[token][k] = fields[k]; });
  tokens[token].updatedAt = new Date().toISOString();
  saveTokens(tokens);
  res.json({ success: true });
});

// ── Delete token permanently ───────────────────────────────────────────────
app.post('/admin/token/delete', (req, res) => {
  const { adminKey, token } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  delete tokens[token];
  saveTokens(tokens);
  res.json({ success: true });
});

// ── Import existing customer (pre-activated, custom dates) ─────────────────
// Use this to add customers who activated outside the system or before DTC,
// or where you want to record a specific subscription start/end date.
app.post('/admin/import-customer', (req, res) => {
  const {
    adminKey, customerName, productId, packageLabel, price,
    email, wechat, orgId, sessionData, notes,
    activatedAt, subscriptionExpiresAt,   // custom dates — required
    resellerId, resellerName, customEmail,
    customPortalLink,                      // optional: portal/login URL shown to customer
  } = req.body;

  if (!isAdmin(adminKey))         return res.status(401).json({ error: 'Unauthorized' });
  if (!customerName)              return res.status(400).json({ error: 'Customer name is required.' });
  if (!productId)                 return res.status(400).json({ error: 'Product is required.' });
  if (!packageLabel)              return res.status(400).json({ error: 'Package is required.' });
  if (!email)                     return res.status(400).json({ error: 'Email is required.' });
  if (!activatedAt)               return res.status(400).json({ error: 'Activation date is required.' });
  if (!subscriptionExpiresAt)     return res.status(400).json({ error: 'Subscription expiry date is required.' });

  const activatedDate = new Date(activatedAt);
  const expiryDate    = new Date(subscriptionExpiresAt);

  if (isNaN(activatedDate))       return res.status(400).json({ error: 'Invalid activation date.' });
  if (isNaN(expiryDate))          return res.status(400).json({ error: 'Invalid expiry date.' });
  if (expiryDate <= activatedDate) return res.status(400).json({ error: 'Expiry date must be after activation date.' });

  const { products } = loadProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(400).json({ error: 'Product not found.' });

  const settings = loadSettings();
  const token    = uuidv4();
  const tokens   = loadTokens();

  // Compute subscription days from the provided dates
  const durationDays = Math.round((expiryDate - activatedDate) / (1000 * 60 * 60 * 24));

  const instrId = product.type === 'chatgpt' ? 'chatgpt-plus' : 'default-claude';

  tokens[token] = {
    // Identity
    customerName,
    productId,
    productName:      product.name,
    packageType:      packageLabel,
    price:            price ? parseFloat(price) : 0,
    currency:         settings.currency       || 'USD',
    currencySymbol:   settings.currencySymbol || '$',
    // Contact
    email:            email.trim(),
    wechat:           (wechat || '').trim(),
    customEmail:      customEmail  || null,
    // Org / session data
    orgId:            (orgId       || '').trim(),
    sessionData:      (sessionData || '').trim(),
    // Product
    product:          product.type,
    credentialsMode:  product.credentialsMode || false,
    loginDetails:     product.loginDetails    || '',
    accessLink:       customPortalLink || product.accessLink || '',
    instructionSetId:     instrId,
    postInstructionSetId: instrId,
    // Reseller
    resellerId:   resellerId   || null,
    resellerName: resellerName || null,
    // Dates — all custom
    createdAt:               new Date().toISOString(),
    expiresAt:               new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)).toISOString(), // link expiry (6mo)
    submittedAt:             activatedDate.toISOString(),
    approvedAt:              activatedDate.toISOString(),
    subscriptionExpiresAt:   expiryDate.toISOString(),
    subscriptionDays:        durationDays,
    durationDays,
    // Status — fully activated from the start
    used:        true,
    approved:    true,
    declined:    false,
    deactivated: false,
    // Notes
    notes: notes || '',
    // Mark as imported so admin can filter/distinguish
    importedAt:  new Date().toISOString(),
    imported:    true,
  };

  saveTokens(tokens);

  // Log to sessions.txt same as a normal submission
  const lines = [
    '══════════════════════════════════════════════════════',
    `IMPORTED AT  : ${new Date().toISOString()}`,
    `Customer     : ${customerName}`,
    `Package      : ${packageLabel}`,
    `Price        : ${settings.currencySymbol || '$'}${price || 0}`,
    `Activated On : ${activatedDate.toISOString()}`,
    `Expires On   : ${expiryDate.toISOString()}`,
    orgId       ? `Org ID       : ${orgId.trim()}`       : '',
    sessionData ? `Session Data : [provided]`             : '',
    wechat      ? `WeChat       : ${wechat.trim()}`       : '',
    `Email        : ${email.trim()}`,
    notes       ? `Notes        : ${notes}`               : '',
    '══════════════════════════════════════════════════════', '',
  ].filter(l => l !== '');
  fs.appendFileSync(SESSIONS_FILE, lines.join('\n'));

  const link = `${req.protocol}://${req.get('host')}/submit?token=${token}`;
  res.json({ success: true, token, link });
});

// ── Validate token ─────────────────────────────────────────────────────────────
app.get('/api/validate-token', (req, res) => {
  const { token } = req.query;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ valid: false, error: 'This activation link is invalid. Please contact support.' });
  const t = tokens[token];
  const entry = { at: new Date().toISOString(), ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown', userAgent: req.headers['user-agent'] || 'unknown' };
  if (!t.accessLog) t.accessLog = [];
  t.accessLog.push(entry); t.firstAccessedAt = t.firstAccessedAt || entry.at; t.lastAccessedAt = entry.at; t.accessCount = (t.accessCount || 0) + 1;
  saveTokens(tokens);

  if (t.deactivated) return res.status(410).json({ valid: false, error: 'This link has been deactivated. Please contact support.' });
  if (t.declined)    return res.json({ valid: true, declined: true, declineReason: t.declineReason || '', customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude' });

  const notify = loadNotify();
  const notifPayload = notify.enabled ? { message: notify.message, type: notify.type } : null;

  if (t.used) {
    const { pre, post } = getInstrSets(t);
    const prod = (loadProducts().products || []).find(p => p.id === t.productId) || {};
    const theme = { logo: prod.logo||'', themeColor: prod.color||'', headerText: prod.headerText||'', tagline: prod.tagline||'', formTitle: prod.formTitle||'', formSubtitle: prod.formSubtitle||'', customInstructions: prod.customInstructions||'', instructionTitle: prod.instructionTitle||'', instrMedia: prod.instrMedia||'' };
    return res.json({ valid: true, submitted: true, approved: t.approved || false, approvedAt: t.approvedAt || null, customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude', credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '', accessLink: t.approved ? (t.accessLink || '') : '', orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '', subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30, processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps, postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps, notification: notifPayload, theme });
  }
  if (t.expiresAt && new Date() > new Date(t.expiresAt)) return res.status(410).json({ valid: false, error: 'This activation link has expired. Please contact support for a new link.' });

  const { pre, post } = getInstrSets(t);
  const prod2 = (loadProducts().products || []).find(p => p.id === t.productId) || {};
  const theme2 = { logo: prod2.logo||'', themeColor: prod2.color||'', headerText: prod2.headerText||'', tagline: prod2.tagline||'', formTitle: prod2.formTitle||'', formSubtitle: prod2.formSubtitle||'', customInstructions: prod2.customInstructions||'', instructionTitle: prod2.instructionTitle||'', instrMedia: prod2.instrMedia||'' };
  res.json({ valid: true, submitted: false, customerName: t.customerName, packageType: t.packageType, product: t.product || 'claude', credentialsMode: t.credentialsMode || false, processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps, postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps, notification: notifPayload, theme: theme2 });
});

// ── Declined appeal ────────────────────────────────────────────────────────
app.post('/api/appeal', (req, res) => {
  const { token, message } = req.body;
  if (!token || !message) return res.status(400).json({ ok: false, error: 'Token and message are required.' });
  const tokens = loadTokens();
  const t = tokens[token];
  if (!t) return res.status(404).json({ ok: false, error: 'Token not found.' });
  if (!t.declined) return res.status(400).json({ ok: false, error: 'This token has not been declined.' });

  // Store appeal on the token
  tokens[token].appeal = { message, submittedAt: new Date().toISOString() };
  saveTokens(tokens);

  // Log to sessions file
  fs.appendFileSync(SESSIONS_FILE,
    '── APPEAL ──────────────────────────────────────────────\n' +
    'Token   : ' + token + '\n' +
    'Customer: ' + (t.customerName || '—') + '\n' +
    'Message : ' + message + '\n' +
    'At      : ' + new Date().toISOString() + '\n\n'
  );

  res.json({ ok: true });
});

// ── Submit ─────────────────────────────────────────────────────────────────────
app.post('/api/submit', (req, res) => {
  const { token, orgId, sessionData, wechat, email } = req.body;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ success: false, error: 'Invalid link.' });
  const t = tokens[token];
  if (t.deactivated) return res.status(410).json({ success: false, error: 'This link has been deactivated.' });
  if (t.declined)    return res.status(410).json({ success: false, error: 'This request has been declined.' });
  if (t.used)        return res.status(410).json({ success: false, error: 'Details already submitted.' });
  if (t.expiresAt && new Date() > new Date(t.expiresAt)) return res.status(410).json({ success: false, error: 'This link has expired.' });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors = {};

  // Credentials-mode products: only ask for email + wechat
  if (!t.credentialsMode) {
    if (t.product === 'chatgpt') {
      if (!sessionData || !sessionData.trim()) { errors.sessionData = 'Session data is required.'; }
      else {
        try {
          const parsed = JSON.parse(sessionData.trim());
          const acct = parsed.account || parsed;
          const planType  = acct.planType  || parsed.planType;
          const structure = acct.structure || parsed.structure;
          if (!planType) errors.sessionData = 'Could not find planType. Please copy the full JSON from the session URL.';
          else if (planType !== 'free') errors.sessionData = `⚠ Package already active (planType: "${planType}"). Only free accounts can be upgraded.`;
          else if (structure !== 'personal') errors.sessionData = `⚠ Team account detected (structure: "${structure}"). Switch to personal profile first.`;
        } catch { errors.sessionData = 'Invalid JSON. Please copy the complete content from the session URL.'; }
      }
    } else {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!orgId || !UUID_REGEX.test(orgId.trim())) errors.orgId = 'Invalid Organization ID format.';
    }
  }

  if (!wechat || !wechat.trim())                  errors.wechat = 'WeChat ID is required.';
  if (!email  || !EMAIL_REGEX.test(email.trim()))  errors.email  = 'Please enter a valid email address.';
  if (Object.keys(errors).length) return res.status(400).json({ success: false, errors });

  const timestamp = new Date().toISOString();
  let lines = ['══════════════════════════════════════════════════════', `Submitted At : ${timestamp}`, `Customer     : ${t.customerName}`, `Package      : ${t.packageType}`, `Price        : $${t.price || 0}`];
  if (t.credentialsMode) { lines.push('── Credentials provided by DTC ────────────────────────'); }
  else if (t.product === 'chatgpt') { lines.push('── Session Data ───────────────────────────────────────', sessionData.trim()); }
  else { lines.push(`Org ID       : ${orgId ? orgId.trim() : '—'}`); }
  lines.push(`WeChat       : ${wechat.trim()}`, `Email        : ${email.trim()}`, '══════════════════════════════════════════════════════', '');
  fs.appendFileSync(SESSIONS_FILE, lines.join('\n'));

  tokens[token].used = true; tokens[token].submittedAt = timestamp;
  tokens[token].wechat = wechat.trim(); tokens[token].email = email.trim();
  if (!t.credentialsMode) {
    if (t.product === 'chatgpt') tokens[token].sessionData = sessionData.trim();
    else tokens[token].orgId = orgId ? orgId.trim() : '';
  }
  saveTokens(tokens);
  res.json({ success: true });
});

// ── Poll status ────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const { token } = req.query;
  const tokens = loadTokens();
  if (!token || !tokens[token]) return res.status(404).json({ error: 'Invalid.' });
  const t = tokens[token];
  const { pre, post } = getInstrSets(t);
  const notify = loadNotify();
  res.json({
    status: t.declined ? 'declined' : t.approved ? 'activated' : t.used ? 'processing' : 'pending',
    packageType: t.packageType, customerName: t.customerName, product: t.product || 'claude',
    credentialsMode: t.credentialsMode || false, loginDetails: t.approved ? (t.loginDetails || '') : '', accessLink: t.approved ? (t.accessLink || '') : '',
    approvedAt: t.approvedAt || null, declineReason: t.declineReason || '',
    orgId: t.orgId || '', sessionData: t.sessionData || '', wechat: t.wechat || '', email: t.email || '',
    subscriptionExpiresAt: t.subscriptionExpiresAt || null, durationDays: t.durationDays || 30,
    processingText: pre.processingText, approvedText: pre.approvedText, approvedSteps: pre.approvedSteps,
    postApprovedText: post.postApprovedText, postApprovedSteps: post.postApprovedSteps,
    notification: notify.enabled ? { message: notify.message, type: notify.type } : null,
  });
});

// ── Approve ────────────────────────────────────────────────────────────────────
app.post('/admin/approve', async (req, res) => {
  const { adminKey, token } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  if (tokens[token].approved) return res.json({ success: true });
  const days = getDurationDays(tokens[token].productId, tokens[token].packageType);
  tokens[token].approved = true; tokens[token].declined = false;
  tokens[token].approvedAt = new Date().toISOString();
  tokens[token].subscriptionExpiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString();
  tokens[token].subscriptionDays = days;
  saveTokens(tokens);

  // Auto-send activation email if customer has email + template configured
  const t = tokens[token];
  const receiptTo = t.customEmail || t.email;
  if (receiptTo) {
    try {
      // Always send the activation receipt (to customEmail if set, else customer email)
      await sendEmail({
        to:      receiptTo,
        subject: `Your ${t.packageType || 'subscription'} is now active — DTC Receipt`,
        html:    receiptTemplate(t),
        type:    'receipt',
        token,
      });
    } catch(e) { console.warn('Receipt email failed:', e.message); }

    try {
      // Also send admin-configured activation template if set (separate email)
      const settings = loadSettings();
      const tmplId   = settings.activationEmailTemplateId;
      if (tmplId) {
        const tmplData = loadTemplates();
        const tmpl     = tmplData.templates.find(x => x.id === tmplId);
        if (tmpl) {
          const html = applyTemplateVars(tmpl.body, t);
          const subj = applyTemplateVars(tmpl.subject, t);
          await sendEmail({ to: t.email, subject: subj, html, type: 'activation', token });
        }
      }
    } catch(e) { console.warn('Activation email failed:', e.message); }
  }
  res.json({ success: true });
});

// ── Decline ────────────────────────────────────────────────────────────────────
app.post('/admin/decline', (req, res) => {
  const { adminKey, token, reason } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error: 'Not found.' });
  tokens[token].declined = true; tokens[token].approved = false;
  tokens[token].declinedAt = new Date().toISOString(); tokens[token].declineReason = reason || 'The details provided could not be verified.';
  saveTokens(tokens); res.json({ success: true });
});

// ── Sessions data ──────────────────────────────────────────────────────────────
app.post('/admin/sessions-data', (req, res) => {
  const { adminKey } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens();
  res.json({ tokens, emailLog: loadEmailLog(), revenue: calcRevenue(tokens) });
});

// ── Instructions ───────────────────────────────────────────────────────────────
app.get('/admin/instructions', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadInstructions());
});
app.post('/admin/instructions/save', (req, res) => {
  const { adminKey, set } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!set || !set.id || !set.name) return res.status(400).json({ error: 'Invalid.' });
  const data = loadInstructions(); data.sets[set.id] = set; saveInstructions(data); res.json({ success: true });
});
app.post('/admin/instructions/delete', (req, res) => {
  const { adminKey, id } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadInstructions(); delete data.sets[id]; saveInstructions(data); res.json({ success: true });
});

// ── Email config ───────────────────────────────────────────────────────────────
app.post('/admin/email-config', (req, res) => {
  const { adminKey, config } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  saveEmailCfg(config); res.json({ success: true });
});
app.get('/admin/email-config', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const cfg = loadEmailCfg(); res.json({ ...cfg, pass: cfg.pass ? '••••••••' : '' });
});
app.post('/admin/test-email', async (req, res) => {
  const { adminKey, to } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await sendEmail({ to, subject: 'DTC — Test Email', html: baseEmail('<h2>✓ Email is working!</h2>'), type: 'test' }));
});
app.post('/admin/send-reminder', async (req, res) => {
  const { adminKey, token, type } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = loadTokens(); const t = tokens[token];
  if (!t || !t.email) return res.status(400).json({ error: 'No email on record.' });
  const expiry = t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt) : null;
  const daysLeft = expiry ? Math.ceil((expiry - new Date())/(1000*60*60*24)) : 0;
  const expiryStr = expiry ? expiry.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—';
  const html = type==='expired' ? expiredTemplate({ customerName:t.customerName, packageType:t.packageType }) : reminderTemplate({ customerName:t.customerName, packageType:t.packageType, expiryDate:expiryStr, daysLeft });
  res.json(await sendEmail({ to: t.email, subject: type==='expired' ? 'Subscription expired — DTC' : `Reminder: ${daysLeft} days left — DTC`, html, type:'manual_'+type, token }));
});

// ── Email Templates CRUD ──────────────────────────────────────────────────────
app.get('/admin/email-templates', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadTemplates());
});
app.post('/admin/email-templates/save', (req, res) => {
  const { adminKey, template } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!template || !template.id || !template.name || !template.subject || !template.body)
    return res.status(400).json({ error: 'All fields required.' });
  const data = loadTemplates();
  const idx  = data.templates.findIndex(t => t.id === template.id);
  template.lastModified = new Date().toISOString();
  if (idx >= 0) data.templates[idx] = template; else data.templates.push(template);
  saveTemplates(data);
  res.json({ success: true });
});
app.post('/admin/email-templates/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const data = loadTemplates();
  data.templates = data.templates.filter(t => t.id !== id);
  saveTemplates(data);
  res.json({ success: true });
});

// ── Bulk email send ────────────────────────────────────────────────────────────
app.post('/admin/bulk-email', async (req, res) => {
  const { adminKey, templateId, customSubject, customBody, recipientFilter, tokenList } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  const cfg = loadEmailCfg();
  if (!cfg.host || !cfg.user || !cfg.pass)
    return res.status(400).json({ error: 'Email is not configured. Go to Email Config first.' });

  // Resolve template
  let subject = customSubject || '';
  let body    = customBody    || '';
  if (templateId) {
    const data = loadTemplates();
    const tmpl = data.templates.find(t => t.id === templateId);
    if (tmpl) { subject = subject || tmpl.subject; body = body || tmpl.body; }
  }
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required.' });

  // Build recipient list
  const tokens  = loadTokens();
  let recipients = [];

  if (tokenList && tokenList.length) {
    // Specific tokens selected by admin
    recipients = tokenList.map(tok => tokens[tok]).filter(t => t && t.email);
  } else {
    // Filter-based
    const filter = recipientFilter || 'all-with-email';
    for (const t of Object.values(tokens)) {
      if (!t.email) continue;
      if (filter === 'all-with-email') { recipients.push(t); continue; }
      if (filter === 'activated'   && t.approved)                { recipients.push(t); continue; }
      if (filter === 'expiring'    && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - new Date())/(1000*60*60*24));
        if (d >= 0 && d <= 30) { recipients.push(t); continue; }
      }
      if (filter === 'expired' && t.approved && t.subscriptionExpiresAt) {
        const d = Math.ceil((new Date(t.subscriptionExpiresAt) - new Date())/(1000*60*60*24));
        if (d < 0) { recipients.push(t); continue; }
      }
      if (filter === 'submitted' && t.used && !t.approved) { recipients.push(t); continue; }
    }
  }

  if (!recipients.length) return res.status(400).json({ error: 'No recipients match this filter.' });

  // Send emails one by one (avoid rate limits)
  const results = { sent: 0, failed: 0, errors: [] };
  for (const t of recipients) {
    const personalSubject = applyTemplateVars(subject, t);
    const personalBody    = applyTemplateVars(body, t);
    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#2563eb;padding:20px 28px">
        <div style="font-size:18px;font-weight:700;color:#fff">DTC</div>
        <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Digital Tools Corner</div>
      </div>
      <div style="padding:28px;font-size:14px;color:#334155;line-height:1.75">${personalBody}</div>
      <div style="padding:16px 28px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        DTC — Digital Tools Corner &nbsp;·&nbsp; <a href="mailto:dtc@dtc1.shop" style="color:#94a3b8">dtc@dtc1.shop</a>
      </div>
    </div>`;
    const r = await sendEmail({ to: t.email, subject: personalSubject, html, type: 'bulk' });
    if (r.ok) results.sent++;
    else { results.failed++; results.errors.push({ email: t.email, error: r.error }); }
    // Small delay between sends to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  res.json({ success: true, ...results, total: recipients.length });
});

// ── Preview bulk email (returns personalised HTML for first recipient) ─────────
app.post('/admin/bulk-email/preview', (req, res) => {
  const { adminKey, templateId, customSubject, customBody, recipientFilter } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  let subject = customSubject || '';
  let body    = customBody    || '';
  if (templateId) {
    const data = loadTemplates();
    const tmpl = data.templates.find(t => t.id === templateId);
    if (tmpl) { subject = subject || tmpl.subject; body = body || tmpl.body; }
  }

  // Find a sample recipient
  const tokens = loadTokens();
  const sample = Object.values(tokens).find(t => t.email) || { customerName: 'Ahmed Khan', packageType: 'Claude Pro — 1 Month', email: 'customer@example.com' };

  res.json({
    subject: applyTemplateVars(subject, sample),
    body:    applyTemplateVars(body, sample),
    sampleName: sample.customerName,
  });
});

// ── Update product credentials (push to all approved tokens of same product) ──
app.post('/admin/products/update-credentials', (req, res) => {
  const { adminKey, productId, loginDetails, accessLink } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  // Update product file
  const data = loadProducts();
  const prod = data.products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });
  if (loginDetails !== undefined) prod.loginDetails = loginDetails;
  if (accessLink   !== undefined) prod.accessLink   = accessLink;
  saveProducts(data);

  // Push to all active tokens using this product
  const tokens  = loadTokens();
  let updated   = 0;
  for (const [, t] of Object.entries(tokens)) {
    if (t.productId === productId && t.approved) {
      if (loginDetails !== undefined) t.loginDetails = loginDetails;
      if (accessLink   !== undefined) t.accessLink   = accessLink;
      updated++;
    }
  }
  saveTokens(tokens);
  res.json({ success: true, updatedTokens: updated });
});

// ── Settings (currency etc.) ───────────────────────────────────────────────────
app.get('/admin/settings', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadSettings());
});
app.post('/admin/settings', (req, res) => {
  const { adminKey, settings } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const current = loadSettings();
  saveSettings({ ...current, ...settings });
  res.json({ success: true });
});

// ── Reseller Registry ─────────────────────────────────────────────────────────
// GET  /admin/resellers          — list all registry resellers + live token stats
// POST /admin/resellers/save     — create or update a reseller
// POST /admin/resellers/delete   — delete by id
// POST /admin/resellers/suspend  — toggle suspended flag

app.get('/admin/resellers', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });

  const registry = loadResellers();    // array of reseller objects
  const tokens   = loadTokens();

  // Compute live sales stats per reseller ID from token data
  const stats = {};
  for (const t of Object.values(tokens)) {
    if (!t.resellerId) continue;
    const rid = t.resellerId;
    if (!stats[rid]) stats[rid] = { sales: 0, revenue: 0, active: 0 };
    stats[rid].sales++;
    if (t.approved && t.price) {
      stats[rid].revenue += t.price;
      if (t.approved && !t.deactivated) stats[rid].active++;
    }
  }

  // Merge registry data with live stats; also surface any token-only resellers not in registry
  const registryIds = new Set(registry.map(r => r.id));
  const tokenOnlyIds = Object.keys(stats).filter(rid => !registryIds.has(rid));

  const result = [
    ...registry.map(r => ({ ...r, stats: stats[r.id] || { sales: 0, revenue: 0, active: 0 } })),
    ...tokenOnlyIds.map(rid => {
      // Infer name from token data
      const name = Object.values(tokens).find(t => t.resellerId === rid)?.resellerName || rid;
      return {
        id: rid, name, commissionRate: 0, allowedProducts: [],
        wechat: '', country: '', notes: '', status: 'active',
        createdAt: null, _tokenOnly: true,
        stats: stats[rid] || { sales: 0, revenue: 0, active: 0 }
      };
    }),
  ];

  res.json({ resellers: result });
});

// Create or update a reseller
app.post('/admin/resellers/save', (req, res) => {
  const { adminKey, reseller } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!reseller || !reseller.id || !reseller.name) return res.status(400).json({ error: 'ID and name are required.' });

  // Validate ID format: lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(reseller.id)) return res.status(400).json({ error: 'ID must be lowercase letters, numbers, and hyphens only.' });

  const registry = loadResellers();
  const idx = registry.findIndex(r => r.id === reseller.id);
  const record = {
    id:              reseller.id.trim(),
    name:            reseller.name.trim(),
    commissionRate:  parseFloat(reseller.commissionRate) || 0,
    allowedProducts: Array.isArray(reseller.allowedProducts) ? reseller.allowedProducts : [],
    wechat:          reseller.wechat  || '',
    country:         reseller.country || '',
    notes:           reseller.notes   || '',
    status:          reseller.status  || 'active',
    createdAt:       idx >= 0 ? registry[idx].createdAt : new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };

  if (idx >= 0) registry[idx] = record;
  else registry.push(record);

  saveResellers(registry);
  res.json({ success: true, reseller: record });
});

// Delete a reseller from the registry (does NOT remove from tokens)
app.post('/admin/resellers/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!id) return res.status(400).json({ error: 'ID required.' });
  const registry = loadResellers();
  saveResellers(registry.filter(r => r.id !== id));
  res.json({ success: true });
});

// Toggle suspended ↔ active
app.post('/admin/resellers/suspend', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const registry = loadResellers();
  const r = registry.find(r => r.id === id);
  if (!r) return res.status(404).json({ error: 'Not found.' });
  r.status = r.status === 'suspended' ? 'active' : 'suspended';
  r.updatedAt = new Date().toISOString();
  saveResellers(registry);
  res.json({ success: true, status: r.status });
});

// Lightweight list for dropdown — active resellers only
app.get('/admin/resellers/dropdown', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const list = loadResellers()
    .filter(r => r.status !== 'suspended')
    .map(r => ({ id: r.id, name: r.name, commissionRate: r.commissionRate, allowedProducts: r.allowedProducts }));
  res.json({ resellers: list });
});

// ── Notifications ──────────────────────────────────────────────────────────────
app.get('/admin/notification', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(loadNotify());
});
app.post('/admin/notification', (req, res) => {
  const { adminKey, enabled, message, type } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  saveNotify({ enabled: !!enabled, message: message || '', type: type || 'info' }); res.json({ success: true });
});

// ── Landing page content (public read, admin write) ───────────────────────────
app.get('/api/landing-content', (req, res) => {
  try { res.json(loadLanding()); }
  catch(e) { res.json({}); }
});
app.get('/admin/landing-content', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(loadLanding()); }
  catch(e) { res.json({}); }
});
app.post('/admin/landing-content', (req, res) => {
  const { adminKey, content } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!content || typeof content !== 'object') return res.status(400).json({ error: 'Invalid content.' });
  const current = (() => { try { return loadLanding(); } catch(e) { return {}; } })();
  saveLanding({ ...current, ...content });
  res.json({ success: true });
});

// ── Customer Portal API ────────────────────────────────────────────────────────
// POST /api/customer-lookup — returns ALL approved subscriptions for this email
app.post('/api/customer-lookup', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ found: false, error: 'Email is required.' });

  const tokens = loadTokens();
  const norm   = email.trim().toLowerCase();

  // Collect all approved tokens for this email, sorted by expiry (soonest first)
  const matches = Object.entries(tokens)
    .filter(([, t]) => t.approved && t.email && t.email.trim().toLowerCase() === norm)
    .sort((a, b) => new Date(a[1].subscriptionExpiresAt || 0) - new Date(b[1].subscriptionExpiresAt || 0));

  if (!matches.length) return res.json({ found: false, error: 'No active subscription found for this email address.' });

  const first = matches[0][1]; // use first token for shared fields
  const now   = new Date();

  const subscriptions = matches.map(([, t]) => {
    const expiry   = t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt) : null;
    const isExpired = expiry && expiry < now;
    return {
      packageType:           t.packageType,
      productName:           t.productName || t.productId || '',
      product:               t.product || 'claude',
      approvedAt:            t.approvedAt || null,
      subscriptionExpiresAt: t.subscriptionExpiresAt || null,
      subscriptionDays:      t.subscriptionDays || t.durationDays || 30,
      firstAccessedAt:       t.firstAccessedAt || null,
      submittedAt:           t.submittedAt || null,
      isExpired,
    };
  });

  res.json({
    found:        true,
    customerName: first.customerName,
    email:        first.email,
    wechat:       first.wechat || '',
    subscriptions,
  });
});

// ── Reseller Portal API ────────────────────────────────────────────────────────
// POST /api/reseller-dashboard — resellers enter their ID to view their sales
app.post('/api/reseller-dashboard', (req, res) => {
  const { resellerId } = req.body || {};
  if (!resellerId) return res.status(400).json({ found: false, error: 'Reseller ID is required.' });

  const tokens   = loadTokens();
  const registry = loadResellers();
  const rid      = resellerId.trim().toLowerCase();

  // Find all tokens tagged with this resellerId (case-insensitive)
  const resellerTokens = Object.entries(tokens)
    .filter(([, t]) => t.resellerId && t.resellerId.trim().toLowerCase() === rid);

  // Also check the registry so resellers with no sales can still log in
  const registryEntry = registry.find(r => r.id && r.id.trim().toLowerCase() === rid);

  if (!resellerTokens.length && !registryEntry) {
    return res.json({ found: false, error: 'Invalid Reseller ID. Please contact DTC to confirm your ID.' });
  }

  // Suspended resellers cannot log in
  if (registryEntry && registryEntry.status === 'suspended') {
    return res.json({ found: false, error: 'Your reseller account is currently suspended. Please contact DTC.' });
  }

  // Get the reseller name — prefer registry, fall back to token data
  const resellerName = (registryEntry && registryEntry.name)
    || resellerTokens.map(([, t]) => t.resellerName).find(n => n)
    || rid;

  // Build sales array (only show safe fields — no org IDs or session data)
  const sales = resellerTokens
    .filter(([, t]) => t.approved)
    .map(([, t]) => ({
      customerName:          t.customerName,
      packageType:           t.packageType,
      product:               t.product || 'claude',
      productName:           t.productName || null,
      email:                 t.email || '',
      approvedAt:            t.approvedAt || null,
      subscriptionExpiresAt: t.subscriptionExpiresAt || null,
      subscriptionDays:      t.subscriptionDays || t.durationDays || 30,
      price:                 t.price || 0,
      currencySymbol:        t.currencySymbol || '$',
    }))
    .sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0));

  // Commission & payout summary
  const commissionRate = (registryEntry && registryEntry.commissionRate) || 0;
  const totalRevenue   = sales.reduce((s, x) => s + (x.price || 0), 0);
  const totalCommission = parseFloat((totalRevenue * commissionRate / 100).toFixed(2));

  const allPayouts     = loadPayouts().filter(p => p.resellerId === rid);
  const paidOut        = allPayouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingPayout  = parseFloat((totalCommission - paidOut).toFixed(2));

  const currencySymbol = (sales[0] && sales[0].currencySymbol) || '


// ── Reseller Auth — Step 1: verify ID + password, send OTP ───────────────────
app.post('/api/reseller-otp', async (req, res) => {
  const { resellerId, password } = req.body || {};
  if (!resellerId || !password) return res.status(400).json({ ok: false, error: 'ID and password required.' });

  const rid      = resellerId.trim().toLowerCase();
  const registry = loadResellers();
  const tokens   = loadTokens();
  const entry    = registry.find(r => r.id && r.id.trim().toLowerCase() === rid);
  const hasTokens = Object.values(tokens).some(t => t.resellerId && t.resellerId.trim().toLowerCase() === rid);

  if (!entry && !hasTokens) return res.json({ ok: false, error: 'Invalid Reseller ID.' });
  if (entry && entry.status === 'suspended') return res.json({ ok: false, error: 'Account suspended.' });

  const storedPw = entry && entry.password ? entry.password : null;
  if (!storedPw) return res.json({ ok: false, error: 'No password set. Ask admin to set one.' });
  if (storedPw !== password) return res.json({ ok: false, error: 'Incorrect password.' });

  const email = entry && entry.email ? entry.email : null;
  if (!email) return res.json({ ok: false, error: 'No email on file. Ask admin to add your email.' });

  const code  = String(Math.floor(100000 + Math.random() * 900000));
  const otps  = loadOtps();
  otps[rid]   = { code, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(), attempts: 0 };
  saveOtps(otps);

  const name = entry ? entry.name : rid;
  const otpHtml = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
    + '<div style="background:#7c3aed;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">DTC</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Reseller Portal</div></div>'
    + '<div style="padding:32px">'
    + '<h2 style="margin:0 0 8px;color:#1e293b;font-size:1.1rem">Your login code</h2>'
    + '<p style="color:#64748b;line-height:1.7;margin:0 0 20px">Hi ' + name + ', use this code to complete your login. It expires in 10 minutes.</p>'
    + '<div style="background:#f5f3ff;border:2px solid #ddd6fe;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">'
    + '<div style="font-size:36px;font-weight:800;letter-spacing:.3em;color:#7c3aed;font-family:monospace">' + code + '</div>'
    + '<div style="font-size:12px;color:#64748b;margin-top:8px">Expires in 10 minutes</div>'
    + '</div>'
    + '<p style="font-size:12px;color:#94a3b8;line-height:1.6">If you did not request this, ignore this email. Your account is safe.</p>'
    + '</div>'
    + '<div style="padding:16px 32px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">DTC · Automated notification.</div>'
    + '</div>';

  const r = await sendEmail({ to: email, subject: 'Your DTC Reseller login code: ' + code, html: otpHtml, type: 'reseller_otp' });
  if (!r.ok) return res.json({ ok: false, error: 'Failed to send OTP: ' + r.error });

  const masked = email.replace(/^(.).*(@.*)$/, (_, a, b) => a + '***' + b);
  res.json({ ok: true, maskedEmail: masked });
});

// ── Reseller Auth — Step 2: verify OTP ───────────────────────────────────────
app.post('/api/reseller-verify-otp', (req, res) => {
  const { resellerId, code } = req.body || {};
  if (!resellerId || !code) return res.status(400).json({ ok: false, error: 'Missing fields.' });

  const rid  = resellerId.trim().toLowerCase();
  const otps = loadOtps();
  const otp  = otps[rid];

  if (!otp) return res.json({ ok: false, error: 'No OTP found. Please request a new code.' });
  if (new Date() > new Date(otp.expiresAt)) {
    delete otps[rid]; saveOtps(otps);
    return res.json({ ok: false, error: 'Code expired. Please request a new one.' });
  }
  otp.attempts = (otp.attempts || 0) + 1;
  if (otp.attempts > 5) {
    delete otps[rid]; saveOtps(otps);
    return res.json({ ok: false, error: 'Too many attempts. Please request a new code.' });
  }
  if (otp.code !== String(code).trim()) {
    saveOtps(otps);
    return res.json({ ok: false, error: 'Incorrect code. ' + (5 - otp.attempts) + ' attempts remaining.' });
  }
  delete otps[rid]; saveOtps(otps);
  res.json({ ok: true });
});

// ── Admin: set reseller password + email ─────────────────────────────────────
app.post('/admin/resellers/set-credentials', (req, res) => {
  const { adminKey, id, password, email } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!id) return res.status(400).json({ error: 'ID required.' });
  const registry = loadResellers();
  const r = registry.find(r => r.id === id);
  if (!r) return res.status(404).json({ error: 'Reseller not found.' });
  if (password !== undefined) r.password = password.trim();
  if (email    !== undefined) r.email    = email.trim();
  r.updatedAt = new Date().toISOString();
  saveResellers(registry);
  res.json({ success: true });
});

// ── Payouts — admin CRUD ──────────────────────────────────────────────────────
app.get('/admin/payouts', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const payouts = loadPayouts();
  const rid     = req.query.resellerId;
  res.json({ payouts: rid ? payouts.filter(p => p.resellerId === rid) : payouts });
});

app.post('/admin/payouts/add', (req, res) => {
  const { adminKey, resellerId, resellerName, amount, currency, note, period } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!resellerId || !amount) return res.status(400).json({ error: 'resellerId and amount required.' });
  const payouts = loadPayouts();
  const payout  = { id: uuidv4(), resellerId, resellerName: resellerName || resellerId, amount: parseFloat(amount), currency: currency || 'USD', note: note || '', period: period || '', status: 'pending', createdAt: new Date().toISOString(), paidAt: null };
  payouts.push(payout);
  savePayouts(payouts);
  res.json({ success: true, payout });
});

app.post('/admin/payouts/mark-paid', (req, res) => {
  const { adminKey, id, paid } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const payouts = loadPayouts();
  const p = payouts.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Payout not found.' });
  p.status = paid ? 'paid' : 'pending';
  p.paidAt  = paid ? new Date().toISOString() : null;
  savePayouts(payouts);
  res.json({ success: true, payout: p });
});

app.post('/admin/payouts/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  savePayouts(loadPayouts().filter(p => p.id !== id));
  res.json({ success: true });
});

// ── Live Chat ──────────────────────────────────────────────────────────────────
// Storage: chats.json  { [chatId]: { id, customerName, email, packageType, status, createdAt, updatedAt, unreadAdmin, messages: [{id,role,text,sentAt}] } }
const loadChats  = () => { try { return JSON.parse(fs.readFileSync(CHAT_FILE,'utf8')); } catch { return {}; } };
const saveChats  = (d) => fs.writeFileSync(CHAT_FILE, JSON.stringify(d, null, 2));

// Customer opens a chat (creates if not exists for this email)
app.post('/api/chat/open', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required.' });

  // Verify customer exists
  const tokens = loadTokens();
  const norm   = email.trim().toLowerCase();
  const match  = Object.entries(tokens)
    .filter(([, t]) => t.approved && t.email && t.email.trim().toLowerCase() === norm)
    .sort((a, b) => new Date(b[1].approvedAt || 0) - new Date(a[1].approvedAt || 0))[0];

  if (!match) return res.status(404).json({ error: 'No active subscription found for this email.' });

  const [, t] = match;
  const chats  = loadChats();

  // Find existing open chat for this email or create one
  let chat = Object.values(chats).find(c => c.email === norm && c.status !== 'closed');
  if (!chat) {
    const chatId = uuidv4();
    chat = {
      id: chatId, email: norm,
      customerName: t.customerName, packageType: t.packageType,
      status: 'open', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), unreadAdmin: 0, messages: []
    };
    chats[chatId] = chat;
    saveChats(chats);
  }

  res.json({ chatId: chat.id, customerName: chat.customerName, messages: chat.messages });
});

// Customer sends a message
app.post('/api/chat/send', (req, res) => {
  const { chatId, email, text } = req.body || {};
  if (!chatId || !text || !email) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat || chat.email !== email.trim().toLowerCase()) return res.status(403).json({ error: 'Forbidden.' });
  if (chat.status === 'closed') return res.status(400).json({ error: 'This chat is closed.' });

  const msg = { id: uuidv4(), role: 'customer', text: text.trim().slice(0, 2000), sentAt: new Date().toISOString() };
  chat.messages.push(msg);
  chat.updatedAt  = msg.sentAt;
  chat.unreadAdmin = (chat.unreadAdmin || 0) + 1;
  saveChats(chats);
  res.json({ ok: true, message: msg });
});

// Customer polls for new messages (returns all messages after a given timestamp)
app.get('/api/chat/poll', (req, res) => {
  const { chatId, email, after } = req.query;
  if (!chatId || !email) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat || chat.email !== email.trim().toLowerCase()) return res.status(403).json({ error: 'Forbidden.' });

  const messages = after
    ? chat.messages.filter(m => m.sentAt > after)
    : chat.messages;
  res.json({ messages, status: chat.status });
});

// ── Admin chat routes ──────────────────────────────────────────────────────────
// List all chats
app.get('/admin/chats', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  const list  = Object.values(chats).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ chats: list });
});

// Get single chat
app.get('/admin/chats/:chatId', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chat = loadChats()[req.params.chatId];
  if (!chat) return res.status(404).json({ error: 'Not found.' });
  res.json(chat);
});

// Admin replies to a chat
app.post('/admin/chats/reply', (req, res) => {
  const { adminKey, chatId, text } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!chatId || !text) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });

  const msg = { id: uuidv4(), role: 'admin', text: text.trim().slice(0, 2000), sentAt: new Date().toISOString() };
  chat.messages.push(msg);
  chat.updatedAt   = msg.sentAt;
  chat.unreadAdmin = 0;           // admin has read this thread
  chat.status      = 'open';
  saveChats(chats);
  res.json({ ok: true, message: msg });
});

// Admin marks chat as closed
app.post('/admin/chats/close', (req, res) => {
  const { adminKey, chatId } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  if (!chats[chatId]) return res.status(404).json({ error: 'Not found.' });
  chats[chatId].status    = 'closed';
  chats[chatId].updatedAt = new Date().toISOString();
  saveChats(chats);
  res.json({ ok: true });
});

// Admin marks all messages in a chat as read (clears unread badge)
app.post('/admin/chats/read', (req, res) => {
  const { adminKey, chatId } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  if (!chats[chatId]) return res.status(404).json({ error: 'Not found.' });
  chats[chatId].unreadAdmin = 0;
  saveChats(chats);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE BLOCK: Smart Nudges, Webhooks, Chargeback, Payment Retry, Abandoned Cart, Flash Sale
// ══════════════════════════════════════════════════════════════════════════════

// ── Webhook helpers ──────────────────────────────────────────────────────────
const fireWebhooks = async (event, payload) => {
  const hooks = loadWebhooks().filter(h => h.enabled && (!h.events || h.events.includes(event)));
  if (!hooks.length) return;
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload });
  const all  = loadWebhooks();
  for (const hook of hooks) {
    try {
      const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 8000);
      await fetch(hook.url, { method:'POST', headers:{'Content-Type':'application/json',...(hook.secret?{'X-DTC-Secret':hook.secret}:{})}, body, signal:ctrl.signal });
      clearTimeout(tid);
      const idx = all.findIndex(w => w.id === hook.id);
      if (idx >= 0) { all[idx].lastFiredAt = new Date().toISOString(); all[idx].lastEvent = event; all[idx].consecutiveErrors = 0; }
    } catch (err) {
      const idx = all.findIndex(w => w.id === hook.id);
      if (idx >= 0) { all[idx].lastError = err.message; all[idx].consecutiveErrors = (all[idx].consecutiveErrors||0)+1; if (all[idx].consecutiveErrors >= 5) all[idx].enabled = false; }
    }
  }
  saveWebhooks(all);
};

// Webhook CRUD
app.get('/admin/webhooks', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  res.json(loadWebhooks());
});
app.post('/admin/webhooks/save', (req, res) => {
  const { adminKey, webhook } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  if (!webhook?.url) return res.status(400).json({ error:'URL required.' });
  const hooks = loadWebhooks(); const id = webhook.id || ('wh_'+Date.now());
  const idx = hooks.findIndex(h => h.id === id);
  const saved = { id, name:webhook.name||'Webhook', url:webhook.url, secret:webhook.secret||'',
    events:webhook.events||['approve','decline','expiry','order_approved','order_declined'],
    enabled:webhook.enabled!==false, createdAt:webhook.createdAt||new Date().toISOString(), consecutiveErrors:0 };
  if (idx >= 0) hooks[idx] = { ...hooks[idx], ...saved }; else hooks.push(saved);
  saveWebhooks(hooks); res.json({ ok:true, id });
});
app.post('/admin/webhooks/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  saveWebhooks(loadWebhooks().filter(h => h.id !== id)); res.json({ ok:true });
});
app.post('/admin/webhooks/test', async (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const hook = loadWebhooks().find(h => h.id === id);
  if (!hook) return res.status(404).json({ error:'Not found.' });
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(hook.url, { method:'POST', headers:{'Content-Type':'application/json',...(hook.secret?{'X-DTC-Secret':hook.secret}:{})},
      body: JSON.stringify({ event:'test', timestamp:new Date().toISOString(), message:'DTC webhook test ping' }), signal:ctrl.signal });
    res.json({ ok:r.ok, status:r.status });
  } catch (err) { res.json({ ok:false, error:err.message }); }
});

// ── Smart renewal nudges ──────────────────────────────────────────────────────
const NUDGE_FILE = path.join(DATA_DIR, 'nudgeLog.json');
if (!fs.existsSync(NUDGE_FILE)) fs.writeFileSync(NUDGE_FILE, JSON.stringify({}, null, 2));
const loadNudgeLog = () => { try { return JSON.parse(fs.readFileSync(NUDGE_FILE,'utf8')); } catch { return {}; } };
const saveNudgeLog = d => fs.writeFileSync(NUDGE_FILE, JSON.stringify(d, null, 2));

const runSmartNudges = async () => {
  const tokens = loadTokens(); const log = loadNudgeLog(); const now = new Date(); let changed = false;
  for (const [token, t] of Object.entries(tokens)) {
    if (!t.approved || !t.subscriptionExpiresAt || !t.email) continue;
    const daysAgo = Math.floor((now - new Date(t.subscriptionExpiresAt)) / 86400000);
    if (daysAgo >= 2 && daysAgo < 5 && !log[token+'_nudge1']) {
      const html = baseEmail(`<h2 style="color:#1e293b;margin:0 0 12px">Did your subscription lapse?</h2><p style="color:#64748b;line-height:1.7;margin:0 0 16px">Hi <strong>${t.customerName}</strong>, your <strong>${t.packageType}</strong> expired ${daysAgo} days ago. Reply to renew in minutes.</p><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px"><strong style="color:#92400e">⚡ Your slot is still available at the same price.</strong></div>`);
      const r = await sendEmail({ to:t.email, subject:`Your ${t.packageType} lapsed — renew now — DTC`, html, type:'nudge1', token });
      if (r.ok) { log[token+'_nudge1'] = now.toISOString(); changed = true; }
    }
    if (daysAgo >= 5 && daysAgo < 10 && !log[token+'_nudge2']) {
      const html = baseEmail(`<h2 style="color:#1e293b;margin:0 0 12px">We'd love to have you back, ${t.customerName}</h2><p style="color:#64748b;line-height:1.7;margin:0 0 16px">Your <strong>${t.packageType}</strong> has been inactive for ${daysAgo} days. Contact us to renew — returning customers get priority activation.</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px"><strong style="color:#1d4ed8">💙 Mention this email for a loyalty discount on your next month.</strong></div>`);
      const r = await sendEmail({ to:t.email, subject:`Come back to DTC — special offer for you — DTC`, html, type:'nudge2', token });
      if (r.ok) { log[token+'_nudge2'] = now.toISOString(); changed = true; }
    }
  }
  if (changed) saveNudgeLog(log);
};
setInterval(() => { if (new Date().getHours() === 10) runSmartNudges().catch(e => console.warn('[nudge]',e.message)); }, 3600000);

app.post('/admin/nudges/run', async (req, res) => {
  const { adminKey } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  await runSmartNudges(); res.json({ ok:true });
});
app.get('/admin/nudges/log', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const log = loadNudgeLog(); const tokens = loadTokens();
  const entries = Object.entries(log).map(([key, sentAt]) => {
    const [token, typeNum] = key.split('_nudge'); const t = tokens[token]||{};
    return { token, type:'nudge'+typeNum, customerName:t.customerName||'?', packageType:t.packageType||'?', email:t.email||'?', sentAt };
  }).sort((a,b) => new Date(b.sentAt)-new Date(a.sentAt));
  res.json({ entries });
});

// ── Auto-suspend on chargeback ────────────────────────────────────────────────
const CHARGEBACK_FILE = path.join(DATA_DIR, 'chargebacks.json');
if (!fs.existsSync(CHARGEBACK_FILE)) fs.writeFileSync(CHARGEBACK_FILE, JSON.stringify([], null, 2));
const loadChargebacks = () => { try { return JSON.parse(fs.readFileSync(CHARGEBACK_FILE,'utf8')); } catch { return []; } };
const saveChargebacks = d => fs.writeFileSync(CHARGEBACK_FILE, JSON.stringify(d, null, 2));

app.post('/admin/chargeback', async (req, res) => {
  const { adminKey, token, reason, sendEmail: doEmail } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const tokens = loadTokens(); if (!tokens[token]) return res.status(404).json({ error:'Token not found.' });
  const t = tokens[token];
  tokens[token].chargebacked = true; tokens[token].chargebackAt = new Date().toISOString();
  tokens[token].chargebackReason = reason||'Dispute detected'; tokens[token].approved = false;
  tokens[token].deactivated = true; tokens[token].deactivatedAt = new Date().toISOString();
  saveTokens(tokens);
  const cbs = loadChargebacks();
  cbs.unshift({ token, customerName:t.customerName, email:t.email, packageType:t.packageType, price:t.price, reason:reason||'Dispute detected', flaggedAt:new Date().toISOString(), status:'open' });
  saveChargebacks(cbs);
  await fireWebhooks('chargeback', { token, customerName:t.customerName, packageType:t.packageType, reason });
  if (doEmail) { const adminEmail = loadEmailCfg().user; if (adminEmail) await sendEmail({ to:adminEmail, subject:`⚠ Chargeback flagged — ${t.customerName} — DTC`, html:baseEmail(`<h2 style="color:#dc2626">⚠ Chargeback Detected</h2><p style="color:#64748b;line-height:1.7"><strong>${t.customerName}</strong> (${t.email}) flagged for chargeback on <strong>${t.packageType}</strong>. Reason: ${reason||'Dispute'}. Subscription auto-suspended.</p>`), type:'chargeback_alert', token }); }
  res.json({ ok:true });
});
app.get('/admin/chargebacks', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  res.json(loadChargebacks());
});
app.post('/admin/chargeback/resolve', (req, res) => {
  const { adminKey, token, resolution } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const cbs = loadChargebacks(); const idx = cbs.findIndex(c => c.token === token);
  if (idx >= 0) { cbs[idx].status='resolved'; cbs[idx].resolution=resolution; cbs[idx].resolvedAt=new Date().toISOString(); }
  saveChargebacks(cbs); res.json({ ok:true });
});

// ── Payment retry automation ──────────────────────────────────────────────────
const RETRY_FILE = path.join(DATA_DIR, 'paymentRetries.json');
if (!fs.existsSync(RETRY_FILE)) fs.writeFileSync(RETRY_FILE, JSON.stringify({}, null, 2));
const loadRetries = () => { try { return JSON.parse(fs.readFileSync(RETRY_FILE,'utf8')); } catch { return {}; } };
const saveRetries = d => fs.writeFileSync(RETRY_FILE, JSON.stringify(d, null, 2));
const schedulePaymentRetry = (order, retryHours=2) => {
  const retries = loadRetries(); const key = order.orderRef;
  if (retries[key]) return;
  retries[key] = { orderRef:key, email:order.email, customerName:order.customerName, productName:order.productName, price:order.price,
    scheduledFor:new Date(Date.now()+retryHours*3600000).toISOString(), sent:false, declinedAt:new Date().toISOString() };
  saveRetries(retries);
};
const runPaymentRetries = async () => {
  const retries = loadRetries(); const now = new Date(); let changed = false;
  for (const [key, r] of Object.entries(retries)) {
    if (r.sent || new Date(r.scheduledFor) > now) continue;
    const shopUrl = `${process.env.BASE_URL||'http://localhost:'+PORT}/shop`;
    const html = baseEmail(`<h2 style="color:#1e293b;margin:0 0 12px">Having trouble completing your payment?</h2><p style="color:#64748b;line-height:1.7;margin:0 0 16px">Hi <strong>${r.customerName}</strong>, your order for <strong>${r.productName}</strong> couldn't be verified. Common issues: blurry screenshot, wrong amount, or wrong QR code.</p><a href="${shopUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">→ Complete my order</a>`);
    const result = await sendEmail({ to:r.email, subject:`Complete your ${r.productName} order — DTC`, html, type:'payment_retry' });
    if (result.ok) { retries[key].sent=true; retries[key].sentAt=now.toISOString(); changed=true; }
  }
  if (changed) saveRetries(retries);
};
setInterval(runPaymentRetries, 15*60*1000);

app.get('/admin/payment-retries', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  res.json(Object.values(loadRetries()).sort((a,b) => new Date(b.declinedAt)-new Date(a.declinedAt)));
});
app.post('/admin/payment-retries/settings', (req, res) => {
  const { adminKey, retryHours, enabled } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const s = loadSettings(); s.paymentRetryHours=retryHours||2; s.paymentRetryEnabled=enabled!==false; saveSettings(s); res.json({ ok:true });
});

// Decline with retry hook
app.post('/admin/shop/order-decline-with-retry', async (req, res) => {
  const { adminKey, orderRef, reason } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const orders = loadOrders(); const order = orders.find(o => o.orderRef === orderRef);
  if (!order) return res.status(404).json({ error:'Order not found.' });
  order.status='declined'; order.declineReason=reason||''; order.declinedAt=new Date().toISOString(); saveOrders(orders);
  const settings = loadSettings(); if (settings.paymentRetryEnabled!==false) schedulePaymentRetry(order, settings.paymentRetryHours||2);
  await fireWebhooks('order_declined', { orderRef, customerName:order.customerName, reason });
  res.json({ ok:true });
});

// ── Abandoned cart recovery ───────────────────────────────────────────────────
app.post('/api/shop/cart-start', (req, res) => {
  const { email, productName, packageLabel, price } = req.body;
  if (!email || !productName) return res.status(400).json({ error:'Missing fields.' });
  const carts = loadAbandoned(); const key = email.toLowerCase().trim();
  if (carts[key]?.completed) return res.json({ ok:true });
  carts[key] = { email, productName, packageLabel:packageLabel||'', price:price||0, startedAt:new Date().toISOString(), completed:false, recoverySent:false };
  saveAbandoned(carts); res.json({ ok:true });
});
app.post('/api/shop/cart-complete', (req, res) => {
  const { email } = req.body; if (!email) return res.status(400).json({ error:'Missing email.' });
  const carts = loadAbandoned(); const key = email.toLowerCase().trim();
  if (carts[key]) { carts[key].completed=true; carts[key].completedAt=new Date().toISOString(); }
  saveAbandoned(carts); res.json({ ok:true });
});
const runAbandonedCartRecovery = async () => {
  const carts = loadAbandoned(); const now = new Date(); let changed = false;
  for (const [key, cart] of Object.entries(carts)) {
    if (cart.completed || cart.recoverySent || (now - new Date(cart.startedAt)) < 7200000) continue;
    const shopUrl = `${process.env.BASE_URL||'http://localhost:'+PORT}/shop`;
    const html = baseEmail(`<h2 style="color:#1e293b;margin:0 0 12px">You left something behind 🛒</h2><p style="color:#64748b;line-height:1.7;margin:0 0 16px">Hi there, you started an order for <strong>${cart.productName}${cart.packageLabel?' — '+cart.packageLabel:''}</strong> but didn't finish. Your slot is still available!</p>${cart.price?`<p style="color:#16a34a;font-weight:700;font-size:15px;margin:0 0 16px">$${cart.price}</p>`:''}<a href="${shopUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">→ Complete my order</a>`);
    const result = await sendEmail({ to:cart.email, subject:`You left your ${cart.productName} order — DTC`, html, type:'abandoned_cart' });
    if (result.ok) { carts[key].recoverySent=true; carts[key].recoverySentAt=now.toISOString(); changed=true; }
  }
  if (changed) saveAbandoned(carts);
};
setInterval(runAbandonedCartRecovery, 30*60*1000);

app.get('/admin/abandoned-carts', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  res.json(Object.values(loadAbandoned()).sort((a,b) => new Date(b.startedAt)-new Date(a.startedAt)));
});
app.post('/admin/abandoned-carts/clear', (req, res) => {
  const { adminKey } = req.body; if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const carts = loadAbandoned(); const cutoff = Date.now()-30*86400000; const cleaned = {};
  Object.entries(carts).forEach(([k,v]) => { if (new Date(v.startedAt)>cutoff) cleaned[k]=v; });
  saveAbandoned(cleaned); res.json({ ok:true, cleared:Object.keys(carts).length-Object.keys(cleaned).length });
});

// ── Flash sale countdown ──────────────────────────────────────────────────────
app.get('/api/flash-sale', (req, res) => {
  const s = loadShopSettings(); const sale = s.flashSale||{};
  if (!sale.enabled || !sale.endsAt) return res.json({ active:false });
  const remaining = new Date(sale.endsAt) - new Date();
  if (remaining <= 0) { s.flashSale.enabled=false; saveShopSettings(s); return res.json({ active:false }); }
  res.json({ active:true, label:sale.label||'Flash Sale', discountPct:sale.discountPct||0, endsAt:sale.endsAt, remainingMs:remaining });
});
app.post('/admin/flash-sale', (req, res) => {
  const { adminKey, enabled, label, discountPct, endsAt } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error:'Unauthorized' });
  const s = loadShopSettings();
  s.flashSale = { enabled:!!enabled, label:label||'Flash Sale', discountPct:Math.min(100,Math.max(0,parseInt(discountPct)||0)), endsAt:endsAt||null };
  saveShopSettings(s); res.json({ ok:true });
});
app.get('/admin/flash-sale', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error:'Unauthorized' });
  res.json((loadShopSettings().flashSale)||{ enabled:false, label:'', discountPct:0, endsAt:null });
});

// ── Pages ──────────────────────────────────────────────────────────────────────
app.get('/submit',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/admin',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/customer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'customer.html')));
app.get('/reseller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reseller.html')));

app.listen(PORT, () => { console.log(`\n✅  DTC — Digital Tools Corner\n🌐  http://localhost:${PORT}\n   /admin    → Admin portal\n   /customer → Customer portal\n   /reseller → Reseller portal\n   /submit   → Activation form\n`); });
,   (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/admin',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/customer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'customer.html')));
app.get('/reseller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reseller.html')));

;

  res.json({
    found:           true,
    resellerId:      rid,
    resellerName,
    commissionRate,
    totalRevenue,
    totalCommission,
    paidOut:         parseFloat(paidOut.toFixed(2)),
    pendingPayout:   Math.max(0, pendingPayout),
    payouts:         allPayouts,
    currencySymbol,
    sales,
  });
});


// ── Reseller Auth — Step 1: verify ID + password, send OTP ───────────────────
app.post('/api/reseller-otp', async (req, res) => {
  const { resellerId, password } = req.body || {};
  if (!resellerId || !password) return res.status(400).json({ ok: false, error: 'ID and password required.' });

  const rid      = resellerId.trim().toLowerCase();
  const registry = loadResellers();
  const tokens   = loadTokens();
  const entry    = registry.find(r => r.id && r.id.trim().toLowerCase() === rid);
  const hasTokens = Object.values(tokens).some(t => t.resellerId && t.resellerId.trim().toLowerCase() === rid);

  if (!entry && !hasTokens) return res.json({ ok: false, error: 'Invalid Reseller ID.' });
  if (entry && entry.status === 'suspended') return res.json({ ok: false, error: 'Account suspended.' });

  const storedPw = entry && entry.password ? entry.password : null;
  if (!storedPw) return res.json({ ok: false, error: 'No password set. Ask admin to set one.' });
  if (storedPw !== password) return res.json({ ok: false, error: 'Incorrect password.' });

  const email = entry && entry.email ? entry.email : null;
  if (!email) return res.json({ ok: false, error: 'No email on file. Ask admin to add your email.' });

  const code  = String(Math.floor(100000 + Math.random() * 900000));
  const otps  = loadOtps();
  otps[rid]   = { code, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(), attempts: 0 };
  saveOtps(otps);

  const name = entry ? entry.name : rid;
  const otpHtml = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
    + '<div style="background:#7c3aed;padding:24px 32px"><div style="font-size:20px;font-weight:700;color:#fff">DTC</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Reseller Portal</div></div>'
    + '<div style="padding:32px">'
    + '<h2 style="margin:0 0 8px;color:#1e293b;font-size:1.1rem">Your login code</h2>'
    + '<p style="color:#64748b;line-height:1.7;margin:0 0 20px">Hi ' + name + ', use this code to complete your login. It expires in 10 minutes.</p>'
    + '<div style="background:#f5f3ff;border:2px solid #ddd6fe;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">'
    + '<div style="font-size:36px;font-weight:800;letter-spacing:.3em;color:#7c3aed;font-family:monospace">' + code + '</div>'
    + '<div style="font-size:12px;color:#64748b;margin-top:8px">Expires in 10 minutes</div>'
    + '</div>'
    + '<p style="font-size:12px;color:#94a3b8;line-height:1.6">If you did not request this, ignore this email. Your account is safe.</p>'
    + '</div>'
    + '<div style="padding:16px 32px;background:#f8faff;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">DTC · Automated notification.</div>'
    + '</div>';

  const r = await sendEmail({ to: email, subject: 'Your DTC Reseller login code: ' + code, html: otpHtml, type: 'reseller_otp' });
  if (!r.ok) return res.json({ ok: false, error: 'Failed to send OTP: ' + r.error });

  const masked = email.replace(/^(.).*(@.*)$/, (_, a, b) => a + '***' + b);
  res.json({ ok: true, maskedEmail: masked });
});

// ── Reseller Auth — Step 2: verify OTP ───────────────────────────────────────
app.post('/api/reseller-verify-otp', (req, res) => {
  const { resellerId, code } = req.body || {};
  if (!resellerId || !code) return res.status(400).json({ ok: false, error: 'Missing fields.' });

  const rid  = resellerId.trim().toLowerCase();
  const otps = loadOtps();
  const otp  = otps[rid];

  if (!otp) return res.json({ ok: false, error: 'No OTP found. Please request a new code.' });
  if (new Date() > new Date(otp.expiresAt)) {
    delete otps[rid]; saveOtps(otps);
    return res.json({ ok: false, error: 'Code expired. Please request a new one.' });
  }
  otp.attempts = (otp.attempts || 0) + 1;
  if (otp.attempts > 5) {
    delete otps[rid]; saveOtps(otps);
    return res.json({ ok: false, error: 'Too many attempts. Please request a new code.' });
  }
  if (otp.code !== String(code).trim()) {
    saveOtps(otps);
    return res.json({ ok: false, error: 'Incorrect code. ' + (5 - otp.attempts) + ' attempts remaining.' });
  }
  delete otps[rid]; saveOtps(otps);
  res.json({ ok: true });
});

// ── Admin: set reseller password + email ─────────────────────────────────────
app.post('/admin/resellers/set-credentials', (req, res) => {
  const { adminKey, id, password, email } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!id) return res.status(400).json({ error: 'ID required.' });
  const registry = loadResellers();
  const r = registry.find(r => r.id === id);
  if (!r) return res.status(404).json({ error: 'Reseller not found.' });
  if (password !== undefined) r.password = password.trim();
  if (email    !== undefined) r.email    = email.trim();
  r.updatedAt = new Date().toISOString();
  saveResellers(registry);
  res.json({ success: true });
});

// ── Payouts — admin CRUD ──────────────────────────────────────────────────────
app.get('/admin/payouts', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const payouts = loadPayouts();
  const rid     = req.query.resellerId;
  res.json({ payouts: rid ? payouts.filter(p => p.resellerId === rid) : payouts });
});

app.post('/admin/payouts/add', (req, res) => {
  const { adminKey, resellerId, resellerName, amount, currency, note, period } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!resellerId || !amount) return res.status(400).json({ error: 'resellerId and amount required.' });
  const payouts = loadPayouts();
  const payout  = { id: uuidv4(), resellerId, resellerName: resellerName || resellerId, amount: parseFloat(amount), currency: currency || 'USD', note: note || '', period: period || '', status: 'pending', createdAt: new Date().toISOString(), paidAt: null };
  payouts.push(payout);
  savePayouts(payouts);
  res.json({ success: true, payout });
});

app.post('/admin/payouts/mark-paid', (req, res) => {
  const { adminKey, id, paid } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const payouts = loadPayouts();
  const p = payouts.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Payout not found.' });
  p.status = paid ? 'paid' : 'pending';
  p.paidAt  = paid ? new Date().toISOString() : null;
  savePayouts(payouts);
  res.json({ success: true, payout: p });
});

app.post('/admin/payouts/delete', (req, res) => {
  const { adminKey, id } = req.body;
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  savePayouts(loadPayouts().filter(p => p.id !== id));
  res.json({ success: true });
});

// ── Live Chat ──────────────────────────────────────────────────────────────────
// Storage: chats.json  { [chatId]: { id, customerName, email, packageType, status, createdAt, updatedAt, unreadAdmin, messages: [{id,role,text,sentAt}] } }
const loadChats  = () => { try { return JSON.parse(fs.readFileSync(CHAT_FILE,'utf8')); } catch { return {}; } };
const saveChats  = (d) => fs.writeFileSync(CHAT_FILE, JSON.stringify(d, null, 2));

// Customer opens a chat (creates if not exists for this email)
app.post('/api/chat/open', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required.' });

  // Verify customer exists
  const tokens = loadTokens();
  const norm   = email.trim().toLowerCase();
  const match  = Object.entries(tokens)
    .filter(([, t]) => t.approved && t.email && t.email.trim().toLowerCase() === norm)
    .sort((a, b) => new Date(b[1].approvedAt || 0) - new Date(a[1].approvedAt || 0))[0];

  if (!match) return res.status(404).json({ error: 'No active subscription found for this email.' });

  const [, t] = match;
  const chats  = loadChats();

  // Find existing open chat for this email or create one
  let chat = Object.values(chats).find(c => c.email === norm && c.status !== 'closed');
  if (!chat) {
    const chatId = uuidv4();
    chat = {
      id: chatId, email: norm,
      customerName: t.customerName, packageType: t.packageType,
      status: 'open', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), unreadAdmin: 0, messages: []
    };
    chats[chatId] = chat;
    saveChats(chats);
  }

  res.json({ chatId: chat.id, customerName: chat.customerName, messages: chat.messages });
});

// Customer sends a message
app.post('/api/chat/send', (req, res) => {
  const { chatId, email, text } = req.body || {};
  if (!chatId || !text || !email) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat || chat.email !== email.trim().toLowerCase()) return res.status(403).json({ error: 'Forbidden.' });
  if (chat.status === 'closed') return res.status(400).json({ error: 'This chat is closed.' });

  const msg = { id: uuidv4(), role: 'customer', text: text.trim().slice(0, 2000), sentAt: new Date().toISOString() };
  chat.messages.push(msg);
  chat.updatedAt  = msg.sentAt;
  chat.unreadAdmin = (chat.unreadAdmin || 0) + 1;
  saveChats(chats);
  res.json({ ok: true, message: msg });
});

// Customer polls for new messages (returns all messages after a given timestamp)
app.get('/api/chat/poll', (req, res) => {
  const { chatId, email, after } = req.query;
  if (!chatId || !email) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat || chat.email !== email.trim().toLowerCase()) return res.status(403).json({ error: 'Forbidden.' });

  const messages = after
    ? chat.messages.filter(m => m.sentAt > after)
    : chat.messages;
  res.json({ messages, status: chat.status });
});

// ── Admin chat routes ──────────────────────────────────────────────────────────
// List all chats
app.get('/admin/chats', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  const list  = Object.values(chats).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ chats: list });
});

// Get single chat
app.get('/admin/chats/:chatId', (req, res) => {
  if (!isAdmin(req.query.adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chat = loadChats()[req.params.chatId];
  if (!chat) return res.status(404).json({ error: 'Not found.' });
  res.json(chat);
});

// Admin replies to a chat
app.post('/admin/chats/reply', (req, res) => {
  const { adminKey, chatId, text } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  if (!chatId || !text) return res.status(400).json({ error: 'Missing fields.' });

  const chats = loadChats();
  const chat  = chats[chatId];
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });

  const msg = { id: uuidv4(), role: 'admin', text: text.trim().slice(0, 2000), sentAt: new Date().toISOString() };
  chat.messages.push(msg);
  chat.updatedAt   = msg.sentAt;
  chat.unreadAdmin = 0;           // admin has read this thread
  chat.status      = 'open';
  saveChats(chats);
  res.json({ ok: true, message: msg });
});

// Admin marks chat as closed
app.post('/admin/chats/close', (req, res) => {
  const { adminKey, chatId } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  if (!chats[chatId]) return res.status(404).json({ error: 'Not found.' });
  chats[chatId].status    = 'closed';
  chats[chatId].updatedAt = new Date().toISOString();
  saveChats(chats);
  res.json({ ok: true });
});

// Admin marks all messages in a chat as read (clears unread badge)
app.post('/admin/chats/read', (req, res) => {
  const { adminKey, chatId } = req.body || {};
  if (!isAdmin(adminKey)) return res.status(401).json({ error: 'Unauthorized' });
  const chats = loadChats();
  if (!chats[chatId]) return res.status(404).json({ error: 'Not found.' });
  chats[chatId].unreadAdmin = 0;
  saveChats(chats);
  res.json({ ok: true });
});

// ── Pages ──────────────────────────────────────────────────────────────────────
app.get('/submit',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/admin',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/customer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'customer.html')));
app.get('/reseller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reseller.html')));

