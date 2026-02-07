# Project Maribel — Complete Setup Guide

> Step-by-step guide for setting up all external services needed by Maribel. This guide assumes you've never created a Meta Developer App before.

---

## Table of Contents

1. [Meta Developer Account](#1-meta-developer-account)
2. [Create the Meta App](#2-create-the-meta-app)
3. [Add Messenger and Webhooks Products](#3-add-messenger-and-webhooks-products)
4. [Link Instagram Business Account](#4-link-instagram-business-account)
5. [Generate and Exchange Tokens](#5-generate-and-exchange-tokens)
6. [Get Instagram Business Account ID](#6-get-instagram-business-account-id)
7. [Configure Webhooks](#7-configure-webhooks)
8. [Enable Page Subscriptions](#8-enable-page-subscriptions)
9. [Submit for App Review](#9-submit-for-app-review)
10. [Set App to Live Mode](#10-set-app-to-live-mode)
11. [Create Telegram Bot](#11-create-telegram-bot)
12. [Calendly Setup](#12-calendly-setup)
13. [Supabase Setup](#13-supabase-setup)
14. [API Keys](#14-api-keys)
15. [Fill in Environment Variables](#15-fill-in-environment-variables)

---

## 1. Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **"Get Started"** in the top right
3. Log in with the **Facebook account that manages Eaton Academic's Facebook Page**
   - This is important — the app needs to be connected to the Page that's linked to your @eatonacademic Instagram
4. Accept the Meta Developer Terms of Service
5. Complete any verification steps Meta requires (phone number, email, etc.)

You now have a Meta Developer account.

---

## 2. Create the Meta App

1. From the Meta Developer dashboard, click **"Create App"**
2. Choose app type: **Business**
3. Fill in the details:
   - **App Name**: `Eaton Academic IG Agent` (or `Maribel`)
   - **App Contact Email**: your email
   - **Business Portfolio**: Select **Eaton Academic's Meta Business Portfolio**
     - If you don't see it, you may need to create one at [business.facebook.com](https://business.facebook.com)
4. Click **"Create App"**
5. You'll be taken to the App Dashboard

**Record these values** (find them in App Settings > Basic):
- `META_APP_ID` — the App ID shown at the top of the dashboard
- `META_APP_SECRET` — click "Show" next to App Secret

---

## 3. Add Messenger and Webhooks Products

From your App Dashboard:

1. In the left sidebar, click **"Add Product"** (or find it on the main dashboard)
2. Find **Messenger** and click **"Set Up"**
   - This adds the Messenger product to your app
3. Go back to **"Add Product"** again
4. Find **Webhooks** and click **"Set Up"**
   - This adds the Webhooks product to your app

You should now see both **Messenger** and **Webhooks** in your left sidebar.

---

## 4. Link Instagram Business Account

1. In the left sidebar, go to **Messenger** > **Instagram Settings**
2. Click **"Add or Remove Pages"**
3. In the popup, select the **Facebook Page linked to @eatonacademic Instagram**
4. Grant **all requested permissions** when prompted
5. Click **"Done"**

Your Instagram Business Account is now linked to the app.

**Troubleshooting:**
- If you don't see your Page, make sure you're logged in with the Facebook account that has admin access to the Page
- The Instagram account must be a **Business** or **Creator** account (not a personal account)
- The Instagram account must be **linked to the Facebook Page** (check Instagram Settings > Account > Linked Accounts)

---

## 5. Generate and Exchange Tokens

### 5.1 Generate a Short-Lived Token

1. Go to **Messenger** > **Instagram Settings** > **Access Tokens**
2. Click **"Generate Token"** next to your linked Page
3. A popup will appear — grant all permissions
4. Copy the token that appears

This is a **short-lived token** (expires in about 1 hour). You need to exchange it for a long-lived one.

### 5.2 Exchange for a Long-Lived Token

Open a terminal or browser and make this API call (replace the placeholders):

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
```

**Using curl:**
```bash
curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

The response will include an `access_token` field — this is your **long-lived token** (valid for ~60 days).

**Record:** `META_PAGE_ACCESS_TOKEN` (the long-lived token)

> **Note:** The Graph API version (e.g., `v21.0`) should match what's stored in your `agent_config` table. Workflow 3 will auto-refresh this token every 50 days before it expires.

---

## 6. Get Instagram Business Account ID

### 6.1 Get Your Page ID

```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN"
```

In the response, find your Page and note its `id` field.

**Record:** `META_PAGE_ID`

### 6.2 Get the Instagram Business Account ID

```bash
curl "https://graph.facebook.com/v21.0/YOUR_PAGE_ID?fields=instagram_business_account&access_token=YOUR_LONG_LIVED_TOKEN"
```

The response will look like:
```json
{
  "instagram_business_account": {
    "id": "17841400123456789"
  },
  "id": "YOUR_PAGE_ID"
}
```

**Record:** `INSTAGRAM_BUSINESS_ACCOUNT_ID` (the `id` inside `instagram_business_account`)

---

## 7. Configure Webhooks

### 7.1 DM Webhook (for Direct Messages)

1. In your Meta App dashboard, go to **Webhooks** in the left sidebar
2. From the dropdown at the top, select **"Instagram"**
3. Click **"Subscribe to this topic"** (or "Edit Subscription")
4. Fill in:
   - **Callback URL**: `https://eatonacademic.app.n8n.cloud/webhook/ig-dm`
   - **Verify Token**: Choose a secret string, e.g., `eaton_maribel_verify_2026`
5. Click **"Verify and Save"**

> **Important:** The n8n webhook must be active and responding to the verification challenge for this step to succeed. If you haven't built the n8n workflow yet, you can come back to this step later.

6. After verification succeeds, subscribe to these fields:
   - `messages`
   - `messaging_postbacks`
   - `message_reactions`

**Record:** `META_VERIFY_TOKEN` (the verify token you chose)

### 7.2 Comments Webhook (for Comment-to-DM)

1. Still in the Webhooks section with "Instagram" selected
2. Also subscribe to:
   - `comments`
   - `mentions` (optional but useful)

> The comment webhook uses the same callback URL but Workflow 2 will handle comment events separately via a different n8n webhook path (`/webhook/ig-comments`). You may need to configure routing based on the payload type, or use a single webhook and route internally.

---

## 8. Enable Page Subscriptions

After setting up webhooks, you need to explicitly subscribe the Page to receive messages. Run this API call:

```bash
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PAGE_ID/subscribed_apps?subscribed_fields=messages&access_token=YOUR_LONG_LIVED_TOKEN"
```

Expected response:
```json
{
  "success": true
}
```

This tells Meta to actually send Instagram DM events to your webhook.

---

## 9. Submit for App Review

Your app starts in **Development Mode**, which means only test users and app admins can trigger webhooks. To receive messages from all Instagram users, you need **Advanced Access** for certain permissions.

### 9.1 Required Permissions

Go to **App Review** > **Permissions and Features** and request Advanced Access for:

| Permission | Why You Need It |
|---|---|
| `instagram_manage_messages` | Send and receive Instagram DMs |
| `instagram_manage_comments` | Read comments for comment-to-DM funnels |
| `pages_manage_metadata` | Manage page subscriptions |
| `pages_messaging` | Send messages on behalf of the Page |
| `instagram_basic` | Basic Instagram account info (may already be Standard) |

### 9.2 What Meta Requires for Each Permission

For each permission request, you'll need to provide:

1. **Use Case Description**: Write a clear explanation of what your app does. Example:
   > "Our app is an AI-powered customer service agent that responds to Instagram Direct Messages from prospective parents inquiring about our homeschool education programs. It answers questions about programs, pricing, scheduling, and enrollment, and escalates complex situations to a human operator."

2. **Screencast/Video**: Record a short screen recording showing the feature working in Development mode:
   - Show a test DM coming in
   - Show the automated response being sent
   - Show the human escalation path
   - Keep it under 2 minutes

3. **Privacy Policy URL**: You need a privacy policy accessible via URL.
   - Use `https://eatonacademic.com/privacy` or create a privacy policy page
   - It should mention data collection through Instagram messaging

### 9.3 Submit and Wait

- Click **"Submit for Review"** for each permission
- Typical review time: **1-3 weeks**
- Meta may ask follow-up questions — respond promptly
- See [docs/meta-app-review-guide.md](docs/meta-app-review-guide.md) for detailed tips

---

## 10. Set App to Live Mode

**Only after all permissions are approved:**

1. Go to **App Settings** > **Basic**
2. At the top of the page, toggle from **Development** to **Live**
3. Confirm the switch

After switching to Live mode:
- Verify your webhook subscriptions are still active
- Send a test DM from a non-test account to confirm everything works

---

## 11. Create Telegram Bot

Telegram is used for escalation notifications — when Maribel encounters a situation she can't handle, she alerts Ivan via Telegram with inline resolution buttons.

### 11.1 Create the Bot

1. Open Telegram and search for **@BotFather**
2. Send the command: `/newbot`
3. When asked for a name, enter: `Maribel Escalation Bot`
4. When asked for a username, enter something like: `maribel_eaton_bot` (must end in `bot`)
5. BotFather will give you a token like: `7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Record:** `TELEGRAM_BOT_TOKEN`

### 11.2 Get Your Chat ID

1. Open a chat with your new bot in Telegram
2. Send it any message (e.g., "hello")
3. In a browser or terminal, call:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates"
```

4. In the response, find `"chat": { "id": 123456789 }` — that number is your chat ID

**Record:** `TELEGRAM_CHAT_ID`

### 11.3 Set the Telegram Webhook (After Building n8n Workflows)

Once Workflow 8 (Telegram Callback Handler) is built, set the webhook:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://eatonacademic.app.n8n.cloud/webhook/telegram-callback"}'
```

---

## 12. Calendly Setup

### 12.1 Verify Plan

The Calendly Scheduling API (programmatic booking) requires **Standard plan or higher**. Verify your plan at [calendly.com/app/admin/billing](https://calendly.com/app/admin/billing).

### 12.2 Get API Token

1. Go to [calendly.com](https://calendly.com) > **Integrations** > **API & Webhooks**
2. Click **"Generate New Token"**
3. Give it a name like `maribel-agent`
4. Copy the Personal Access Token

**Record:** `CALENDLY_API_KEY`

### 12.3 Get Your Event Type URI

You'll need the event type URI for the 15-minute consultation. Run:

```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_TOKEN" \
  "https://api.calendly.com/event_types?user=https://api.calendly.com/users/me"
```

Find the 15-minute consultation event type and note its `uri`. This will be stored in `agent_config` as `calendly_event_type_uri`.

### 12.4 Get Your User URI

```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_TOKEN" \
  "https://api.calendly.com/users/me"
```

Note the `uri` field. This will be stored in `agent_config` as `calendly_user_uri`.

---

## 13. Supabase Setup

### 13.1 Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in
2. Click **"New Project"**
3. Name it: `maribel-agent`
4. Choose a strong database password (save it securely)
5. Select the same region as your existing Eaton Academic project
6. Click **"Create new project"**

### 13.2 Get Connection Details

Once the project is created, go to **Project Settings** > **API**:

**Record:**
- `SUPABASE_MARIBEL_URL` — the Project URL
- `SUPABASE_MARIBEL_ANON_KEY` — the `anon` / `public` key
- `SUPABASE_MARIBEL_SERVICE_KEY` — the `service_role` key (keep this secret!)

### 13.3 Existing Eaton Academic Project

You should already have these from your existing Supabase project:

**Record:**
- `SUPABASE_EATON_URL`
- `SUPABASE_EATON_ANON_KEY`

---

## 14. API Keys

### 14.1 Anthropic (Claude API)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Create a new key named `maribel-agent`

**Record:** `ANTHROPIC_API_KEY`

### 14.2 OpenAI (Embeddings)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Create a new key named `maribel-embeddings`

**Record:** `OPENAI_API_KEY`

---

## 15. Fill in Environment Variables

1. Copy the template:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in every value using the tokens and IDs you recorded above.

3. Double-check every value is filled in — missing values will cause workflows to fail silently.

### Quick Verification

Test your tokens work:

```bash
# Test Meta Page Access Token
curl "https://graph.facebook.com/v21.0/me?access_token=YOUR_PAGE_ACCESS_TOKEN"

# Test Anthropic API Key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

# Test OpenAI API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_KEY"

# Test Calendly API Key
curl -H "Authorization: Bearer YOUR_CALENDLY_KEY" \
  "https://api.calendly.com/users/me"

# Test Telegram Bot Token
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getMe"
```

If all return successful responses, you're ready for Phase 2.

---

## What's Next?

After completing all steps above, move to **Phase 2: Supabase Schema + Migrations**. See [docs/maribel-build-plan.md](docs/maribel-build-plan.md) for the next phase prompt.
