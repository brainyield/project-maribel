# Meta App Review — Step-by-Step Guide

> Complete instructions for submitting Eaton Academic's Instagram messaging app for Meta App Review.
> This can be done in parallel with troubleshooting/testing — the review takes 1-3 weeks.

---

## Prerequisites (Do These First)

### 1. Business Verification
Meta requires business verification before App Review can be approved.
- Go to [Meta Business Suite](https://business.facebook.com/) > **Settings** > **Business Info**
- Or: [Business Verification Docs](https://developers.facebook.com/docs/development/release/business-verification/)
- Submit business documents (LLC paperwork, utility bill, EIN letter, etc.)
- Takes **1-5 business days** — start NOW if not done
- This is a **hard blocker** for App Review approval

### 2. Privacy Policy
Must be live at a public URL before submitting.
- **Recommended URL:** `https://eatonacademic.com/privacy`
- Draft is in this repo at `docs/privacy-policy-draft.md`
- Replace all `[BRACKETED]` placeholders with real values
- Publish on the Eaton Academic website
- Must specifically mention Instagram DMs and data collection

### 3. Working Demo
Your n8n workflows must be active enough to record a screencast showing the app working. You can use test accounts (app testers) for this.

---

## Step-by-Step Instructions

### Step 1: Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Log in with the Facebook account linked to **Eaton Academic's Facebook Page**
3. Accept the developer terms
4. Complete any identity verification prompts

### Step 2: Create the Meta App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps/)
2. Click **"Create App"**
3. Select use case: **"Other"** > then **"Business"** type
4. App name: **"Eaton Academic IG Agent"** (or "Maribel")
5. Associate with Eaton Academic's **Meta Business Portfolio**
6. Record the `APP_ID` and `APP_SECRET` from **App Settings > Basic**

### Step 3: Add Products

1. In the App Dashboard sidebar, click **"Add Product"**
2. Add **Messenger** (covers Instagram Messaging)
3. Add **Webhooks**

### Step 4: Link Instagram Account

1. Go to **Messenger > Instagram Settings**
2. Click **"Add or Remove Pages"**
3. Select the Facebook Page linked to **@eatonacademic** Instagram
4. Grant all requested permissions when prompted

### Step 5: Generate Page Access Token

1. In **Messenger > Instagram Settings > Access Tokens**
2. Click **"Generate Token"** for the linked page
3. Save the short-lived token
4. Exchange for a long-lived token (60 days):
   ```
   GET https://graph.facebook.com/{GRAPH_API_VERSION}/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
5. Store the long-lived token as `META_PAGE_ACCESS_TOKEN`

### Step 6: Get Instagram Business Account ID

1. Query your pages:
   ```
   GET https://graph.facebook.com/{GRAPH_API_VERSION}/me/accounts
     ?access_token={PAGE_ACCESS_TOKEN}
   ```
2. Get the Page ID, then query:
   ```
   GET https://graph.facebook.com/{GRAPH_API_VERSION}/{PAGE_ID}
     ?fields=instagram_business_account
     &access_token={PAGE_ACCESS_TOKEN}
   ```
3. Record `INSTAGRAM_BUSINESS_ACCOUNT_ID` and `PAGE_ID`

### Step 7: Configure Webhooks

1. Go to **Webhooks** in the App Dashboard
2. Select **"Instagram"** from the dropdown
3. Set:
   - **Callback URL:** `https://eatonacademic.app.n8n.cloud/webhook/ig-dm`
   - **Verify Token:** `eaton_maribel_verify_2026` (or your chosen secret)
4. Subscribe to fields: `messages`, `messaging_postbacks`, `message_reactions`
5. For Comment-to-DM: also subscribe to `comments` and `mentions`

> **Important:** Your n8n DM Handler workflow (Workflow 1) must be **active** to respond to Meta's verification GET request with `hub.challenge`.

### Step 8: Enable Page Subscriptions

```
POST https://graph.facebook.com/{GRAPH_API_VERSION}/{PAGE_ID}/subscribed_apps
  ?subscribed_fields=messages
  &access_token={PAGE_ACCESS_TOKEN}
```

### Step 9: Fill in App Settings

Before submitting for review, go to **App Settings > Basic** and fill in:

| Field | Value |
|---|---|
| App Display Name | Eaton Academic IG Agent |
| App Icon | Eaton Academic logo |
| Privacy Policy URL | `https://eatonacademic.com/privacy` |
| Terms of Service URL | `https://eatonacademic.com/terms` (recommended) |
| Category | Education |
| App Domains | `eatonacademic.com` |

Also in **App Settings > Advanced**:
- Set a **Data Deletion Callback URL** or **Data Deletion Instructions URL** (a page explaining how users can email you to request deletion, e.g. `eatonacademic.com/data-deletion`)

### Step 10: Add Test Users

1. Go to **App Roles > Roles** in the App Dashboard
2. Add test Instagram accounts as **Testers**
3. Accept the invitation from each test account
4. These accounts can interact with the app in Development mode

### Step 11: Record Screencast

Record a **1-2 minute video** showing the app working. One video can cover multiple permissions.

**What to show:**
1. A test user opens Instagram and sends a DM to @eatonacademic: *"Hi, I'm interested in your learning pods for my daughter. She's in 3rd grade."*
2. The automated response appears in the conversation (AI reply with program info)
3. The user sends a follow-up: *"How much does it cost?"*
4. The AI responds with pricing from the knowledge base
5. (For `instagram_manage_comments`) Show a post with keyword instructions, comment "PODS", and show the DM being sent
6. (Optional) Show escalation to Telegram when a user says *"I want to speak to someone"*

**Recording tools:** OBS Studio (free), Loom, or built-in Windows/Mac screen recorder.

**Tips:**
- Use a clean browser with no distracting tabs
- Zoom in so text is readable
- Narrate what's happening (optional but helpful)
- Show that the USER initiates the conversation (Meta cares about this)
- Keep it under 2 minutes

### Step 12: Submit for App Review

1. Go to **App Review > Permissions and Features** in the App Dashboard
   - Direct link: [developers.facebook.com/apps](https://developers.facebook.com/apps/) > select your app > App Review
2. For each permission, click **"Request Advanced Access"**
3. Provide the written justification (see below), screencast video, and Privacy Policy URL

---

## Permission Justifications (Copy-Paste Ready)

### `instagram_manage_messages` — Advanced Access

> **How does your app use this permission?**
>
> Eaton Academic is a homeschool education company in South Florida. Our app is an AI-powered customer service assistant named Maribel that responds to Instagram Direct Messages from prospective parents asking about our learning pod programs, online classes, schedules, and enrollment.
>
> When a parent sends us a Direct Message on our Instagram account (@eatonacademic), the app receives the message via webhook, processes it using AI to understand the parent's question, retrieves relevant information from our knowledge base (program details, pricing, schedules), and sends a helpful, personalized response back through the Instagram Messaging API.
>
> The app handles common inquiries such as: "What programs do you offer?", "How much do your Tuesday pods cost?", "Do you have availability for a 3rd grader?", and "Can I schedule a tour?"
>
> When a conversation requires human attention — such as a complaint, a complex scheduling request, or a parent who explicitly asks to speak with a person — the app escalates the conversation to our team member, who then responds directly through Instagram. The app only responds to messages initiated by the user — it never sends unsolicited DMs.
>
> The app is bilingual (English and Spanish) to serve our diverse South Florida community.

### `instagram_manage_comments` — Advanced Access

> **How does your app use this permission?**
>
> Eaton Academic uses this permission to power a comment-to-DM engagement feature. When we publish Instagram posts about our programs (e.g., "Comment PODS to learn more about our learning pods"), parents comment a specific keyword on the post.
>
> Our app reads the comment to detect the keyword, then sends the parent a single Direct Message with relevant information about that program. This is a standard Instagram marketing practice where users opt in by commenting a keyword, and receive a single informational DM in response.
>
> The app includes deduplication logic — each user only receives one DM per post, even if they comment the keyword multiple times. The app does not read or store comments beyond checking for keyword matches. After the initial DM is sent, any follow-up conversation is handled by our DM customer service assistant (covered by the instagram_manage_messages permission).

### `pages_manage_metadata` — Advanced Access

> **How does your app use this permission?**
>
> Eaton Academic uses this permission to manage webhook subscriptions for our Facebook Page that is linked to our Instagram Business account (@eatonacademic). Our app subscribes to Instagram messaging and comment webhook events so that our customer service assistant can receive and respond to Direct Messages from prospective parents in real time.
>
> This permission is required for our app to maintain its webhook subscriptions, which are the mechanism through which Instagram delivers incoming message notifications to our application. Without this permission, our app cannot receive incoming messages and therefore cannot respond to customer inquiries.

### `pages_messaging` — Advanced Access

> **How does your app use this permission?**
>
> Eaton Academic uses this permission to send Direct Message replies to prospective parents who message our Instagram account (@eatonacademic) with questions about our homeschool education programs.
>
> When a parent sends us a DM, our AI-powered customer service assistant processes their question and sends a response through the Instagram Messaging API. The app only sends messages in reply to user-initiated conversations — it never sends unsolicited messages to users who have not messaged us first.
>
> This permission works in conjunction with instagram_manage_messages to provide a complete customer service experience: instagram_manage_messages handles receiving and reading messages, while pages_messaging enables sending the responses.

---

## After Submission

### Timeline

| Step | Expected Time |
|---|---|
| Submit for review | 5 minutes |
| Initial review | 3-5 business days |
| Address feedback (if rejected) | 1-2 days |
| Re-review after resubmission | 3-5 business days |
| **Total (optimistic)** | **~1 week** |
| **Total (with one rejection)** | **2-3 weeks** |

### Common Rejection Reasons

| Reason | Fix |
|---|---|
| "Unable to verify how your app uses this permission" | Make the screencast clearer, show the exact feature |
| "App doesn't appear to be live or functional" | Make sure n8n workflows are active when Meta tests |
| "Privacy policy doesn't mention Instagram data" | Update privacy policy — see `docs/privacy-policy-draft.md` |
| "Business verification required" | Complete verification at [business.facebook.com](https://business.facebook.com) |

### After Approval — Go Live

1. Go to **App Settings > Basic**
2. Toggle **App Mode** from **Development** to **Live**
3. Verify webhook subscriptions still work after the switch
4. Monitor closely for the first few hours

---

## What You Can Do While Waiting for Review

Everything except messaging production users:

- Test with accounts added as **Testers** in App Dashboard > App Roles
- Troubleshoot and tune all n8n workflows
- Test RAG retrieval quality
- Test Calendly booking flow
- Polish the Admin UI
- Record additional screencasts if needed

---

## Quick Links

| Resource | URL |
|---|---|
| Meta Developer Dashboard | https://developers.facebook.com/apps/ |
| App Review Docs | https://developers.facebook.com/docs/app-review/ |
| Instagram Messaging API Docs | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/ |
| Business Verification | https://developers.facebook.com/docs/development/release/business-verification/ |
| Meta Business Suite | https://business.facebook.com/ |
| Permissions Reference | https://developers.facebook.com/docs/permissions/ |
