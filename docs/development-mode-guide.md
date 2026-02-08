# Development Mode Guide — Testing During Meta App Review

> After submitting your Meta App for review, the app is in **Development Mode**. This guide explains what you can test, how to set up test accounts, and how to transition to live mode once approved.

---

## What Is Development Mode?

When you first create a Meta App, it starts in Development Mode. In this mode:
- Only designated **test users** (up to 25) can interact with the app
- Real Instagram users' DMs are **not received** by your webhook
- All other functionality (Supabase, Claude API, Calendly, Telegram, RAG) works normally

You submit for **Advanced Access** to the `instagram_manage_messages` permission. Meta's review takes 1-3 weeks. During this time, use test accounts to fully test the system.

---

## Setting Up Test Accounts

### Step 1: Add Testers in Meta App Dashboard

1. Go to [developers.facebook.com](https://developers.facebook.com) -> Your App
2. Navigate to **App Roles** -> **Roles**
3. Click **Add People**
4. Enter the Instagram username or email of each test user
5. Select the **Tester** role
6. The user must **accept the invitation** from their Instagram account

### Step 2: Testers Accept the Invitation

1. Each tester goes to [developers.facebook.com/requests](https://developers.facebook.com/requests)
2. Or: Instagram Settings -> Apps and Websites -> Tester Invites
3. Accept the invitation

### Step 3: Verify Tester Access

Have a tester send a DM to your Instagram Business Account. Verify:
- The webhook fires in n8n (check Executions page)
- The message appears in `ig_conversations`
- A reply is sent back

---

## What You Can Test in Development Mode

### Fully Testable (No Limitations)

| Feature | How to Test |
|---|---|
| Webhook verification handshake | `scripts/test_webhook_verification.sh` |
| DM receive + reply | Send DM from test account |
| Message deduplication | Send same message rapidly, check `duplicate_webhook_log` |
| Conversation locking | Send 5 rapid messages from one test account |
| Kill switch | Toggle `kill_switch_enabled` in admin UI, verify replies stop |
| RAG retrieval | Ask program questions, verify accurate answers |
| Claude response generation | Check response quality and metadata parsing |
| Metadata parsing + fallback | Verify metadata block is parsed, test with edge cases |
| Instagram Send API | Verify reply arrives in test account's DMs |
| Message splitting | Send a question that generates a >1000 char reply |
| Lead creation/update | Check `ig_leads` after conversation |
| Escalation -> Telegram | Trigger escalation, verify Telegram alert |
| Telegram resolve buttons | Press Resolve & Resume, verify Maribel resumes |
| Manual reply detection | Reply as the page in Instagram, verify echo logged |
| Conversation summarizer | Have a conversation, wait 2+ hours, check for summary |
| Calendly slot fetching | Trigger booking flow, verify slots returned |
| Calendly booking | Complete full booking flow through DM |
| Comment-to-DM triggers | Comment keyword on a post from test account |
| Language detection | Send messages in Spanish from test account |
| Admin UI — all features | Dashboard, leads, escalations, knowledge editor, config |
| Daily analytics | Run Workflow 4 manually, check `ig_analytics_daily` |
| Stale conversation alerts | Let a test conversation go stale, verify alert |
| Error handling | Temporarily use invalid API key, verify fallback |

### NOT Testable Until Approved

| Feature | Why |
|---|---|
| DMs from real (non-tester) users | Development mode blocks them |
| Comments from real users | Only testers' comments trigger webhooks |
| Scale testing (100+ conversations) | Limited by number of test accounts (25 max) |

---

## Testing Checklist

Use this checklist during the Meta App Review waiting period:

### Core Message Flow
- [ ] Webhook verification responds with challenge token
- [ ] Test account DM triggers Workflow 1
- [ ] Message deduplication blocks Meta's double-delivered webhooks
- [ ] Conversation lock acquired and released correctly
- [ ] Kill switch stops AI replies when enabled
- [ ] Kill switch re-enables replies when disabled

### AI & RAG
- [ ] RAG returns relevant knowledge chunks for program questions
- [ ] Claude generates appropriate, concise responses
- [ ] Metadata block is valid JSON and parsed correctly
- [ ] Metadata fallback works when parsing fails
- [ ] Message splitting works for long replies (>1000 chars)
- [ ] Split messages have 1-2 second delay between them

### Lead Management
- [ ] New lead created on first message
- [ ] Lead score updates based on conversation progression
- [ ] Lead interests, grade, location extracted correctly
- [ ] Returning lead recognized with conversation memory

### Booking Flow
- [ ] Calendly slots fetched and presented in DM
- [ ] Parent selects a slot -> booking state updates
- [ ] Email collected -> booking state updates
- [ ] Booking confirmed via Calendly API -> lead updated
- [ ] Calendly API failure -> fallback link shared

### Escalation
- [ ] Escalation triggers Telegram alert with inline buttons
- [ ] Telegram message shows conversation context
- [ ] "Resolve & Resume" button works
- [ ] "Resolve & Keep Paused" button works
- [ ] Maribel stays silent while escalated
- [ ] Maribel resumes with full context after resolution

### Manual Reply Detection
- [ ] Manual reply in Instagram detected as echo
- [ ] Echo logged with `source: 'manual'` in `ig_conversations`
- [ ] Maribel doesn't re-reply to echoed messages

### Comment-to-DM
- [ ] Keyword comment triggers DM to commenter
- [ ] Duplicate comment on same post does NOT trigger duplicate DM
- [ ] Language detection works for comment text
- [ ] English template sent for English/keyword-only comments
- [ ] Spanish template sent for Spanish comments

### Admin UI
- [ ] Dashboard loads with real metrics
- [ ] Escalation manager shows open items, resolve works
- [ ] Lead pipeline filters correctly
- [ ] Conversation viewer shows full history
- [ ] Knowledge editor CRUD works
- [ ] Re-embed triggers Workflow 7
- [ ] Config editor saves changes

### Adversarial / Red-Team
- [ ] All test cases from `docs/adversarial-test-cases.md` pass

---

## Running Tests

### Quick Smoke Test (5 minutes)

1. Send a DM from a test account: "Hi, I'm interested in learning pods for my 3rd grader"
2. Verify reply arrives within 5 seconds
3. Check n8n execution succeeded (green)
4. Check `ig_conversations` has both messages
5. Check `ig_leads` has a new lead entry

### Full Integration Test (30 minutes)

Run through all conversation scenarios in `docs/conversation-flow-examples.md`:
1. New English lead
2. New Spanish lead
3. Returning lead (requires prior conversation + summary generation)
4. Escalation trigger
5. Calendly booking flow
6. FAQ questions
7. Emoji/image handling
8. Off-topic redirect
9. Comment-to-DM
10. Prompt injection

### Webhook Verification Test

```bash
./scripts/test_webhook_verification.sh
```

Should return `TESTCHALLENGE123` as plain text.

---

## Transitioning to Live Mode

### Prerequisites
- [ ] Meta App Review approved for all requested permissions
- [ ] All tests from the checklist above pass
- [ ] Team is aware and ready to monitor

### Steps

1. Go to Meta App Dashboard -> **Settings** -> **Basic**
2. Toggle **App Mode** from "Development" to **"Live"**
3. Verify webhook subscriptions are still active after the mode switch
4. Monitor the first hour of live traffic closely:
   - Watch n8n executions for errors
   - Check that non-tester DMs are now being received
   - Verify replies are being sent correctly
5. Set `instagram_page_sender_id` in `agent_config` if not already done

### Post-Launch Monitoring

- **First 24 hours**: Monitor continuously. Check executions, errors, and response quality.
- **First week**: Review daily analytics, tune RAG threshold if needed, iterate on AGENTS.md.
- **Ongoing**: Follow the [daily monitoring checklist](#daily-monitoring) in the runbook.

---

## Development Mode Limitations

- **Only test users can interact** — real customer DMs are silently dropped by Meta
- **Rate limits may be lower** than in live mode
- **Some webhook events may behave slightly differently** — test thoroughly after going live
- **Meta App Review screencasts** must show the feature working with test accounts in Development mode
