# Meta App Review Guide

> Tips and strategies for passing Meta's App Review process for the permissions Maribel needs.

---

## Overview

Meta requires App Review for Advanced Access to certain permissions. Without Advanced Access, your app can only interact with test users and app admins. Maribel needs Advanced Access to respond to DMs from all Instagram users.

Review typically takes **1-3 weeks**. Rejections are common on the first attempt — Meta may ask follow-up questions or request changes. Don't worry, just address their feedback and resubmit.

---

## Permissions to Request

| Permission | Access Level Needed | Why |
|---|---|---|
| `instagram_manage_messages` | Advanced | Send and receive Instagram DMs via API |
| `instagram_manage_comments` | Advanced | Read comments for keyword-triggered DM outreach |
| `pages_manage_metadata` | Advanced | Manage webhook subscriptions for the Page |
| `pages_messaging` | Advanced | Send messages on behalf of the Facebook Page |
| `instagram_basic` | Standard | Basic Instagram account info (usually auto-granted) |

---

## Tips for Approval

### 1. Write Clear Use Case Descriptions

For each permission, Meta asks "How will your app use this permission?" Be specific and honest.

**Good example for `instagram_manage_messages`:**
> "Our app is an AI-powered customer service assistant for Eaton Academic, a homeschool education company. When prospective parents send us a Direct Message on Instagram asking about our programs, the app automatically responds with relevant information about our learning pods, online classes, and enrollment process. It qualifies leads by understanding their needs, and escalates complex situations (pricing negotiations, complaints, specific scheduling requests) to our human team member for personal follow-up. The app only responds to messages initiated by the user — it never sends unsolicited DMs."

**Bad example:**
> "We use this to send messages on Instagram."

### 2. Record a Good Screencast

Meta wants to see your app working. Record a screen video (1-2 minutes) showing:

1. **A user initiating a DM** (send from a test account to your Instagram)
2. **The automated response appearing** in the conversation
3. **The quality of the response** — show it answering a real question
4. **The escalation path** — show a message being escalated to Telegram
5. **Human resolution** — show the operator resolving the escalation

**Tips for the screencast:**
- Use a clean browser with no distracting tabs
- Zoom in so text is readable
- Narrate what's happening (optional but helpful)
- Show that the user initiates the conversation (Meta cares about this)
- Show the flow from the user's perspective AND the business admin perspective
- Keep it under 2 minutes

### 3. Have a Privacy Policy

Create a privacy policy page on your website (e.g., `eatonacademic.com/privacy`) that includes:

- What data you collect through Instagram messaging (message content, sender info)
- How you store it (Supabase database, encrypted at rest)
- How long you retain it
- That you don't sell user data to third parties
- How users can request data deletion
- Contact information for privacy inquiries

### 4. Have a Terms of Service

While not always required, having Terms of Service at a URL (e.g., `eatonacademic.com/terms`) strengthens your application.

### 5. Fill in All App Settings

Before submitting, make sure your app has:
- A clear **App Display Name**
- A valid **Privacy Policy URL**
- A valid **Terms of Service URL** (optional but recommended)
- An **App Icon** (can be the Eaton Academic logo)
- A **Category** (Education)
- The **Business Portfolio** correctly linked

### 6. Don't Over-Request

Only request permissions you actually need. Requesting unnecessary permissions raises red flags and can delay or block approval.

---

## Common Rejection Reasons and Fixes

### "We were unable to verify how your app uses this permission"

**Fix:** Make your screencast clearer. Show the exact feature that uses the permission. Add captions or narration.

### "Your app doesn't appear to be live or functional"

**Fix:** Make sure the webhook is responding correctly. The n8n workflow must be active when Meta tests it. During review, Meta may send test messages — make sure they get responses.

### "Your privacy policy doesn't mention Instagram data"

**Fix:** Update your privacy policy to explicitly mention Instagram Direct Messages, what data you collect from them, and how it's used.

### "You need a business verification"

**Fix:** Complete Meta Business Verification at [business.facebook.com](https://business.facebook.com). This requires submitting business documents (LLC paperwork, utility bill, etc.).

---

## Development Mode vs. Live Mode

### Development Mode (before App Review)

While waiting for App Review approval:
- Only **app admins** and **test users** can trigger webhooks
- Add test accounts as test users in App Dashboard > Roles > Test Users
- You can still build and test all functionality
- See `docs/development-mode-guide.md` for testing strategies

### Live Mode (after App Review)

After all permissions are approved:
- Toggle from Development to Live in App Settings
- ALL Instagram users can now trigger your webhooks
- Monitor closely for the first few hours
- Verify webhook subscriptions survived the mode switch

---

## Timeline

| Step | Expected Time |
|---|---|
| Create app + set up permissions | 1-2 hours |
| Build features + record screencast | During Phase 4 |
| Submit for review | 5 minutes |
| Wait for initial review | 3-5 business days |
| Address feedback (if rejected) | 1-2 days |
| Re-review after resubmission | 3-5 business days |
| **Total (optimistic)** | **1 week** |
| **Total (with one rejection)** | **2-3 weeks** |

---

## Resources

- [Meta App Review Documentation](https://developers.facebook.com/docs/app-review/)
- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/)
- [Meta Business Verification](https://developers.facebook.com/docs/development/release/business-verification/)
