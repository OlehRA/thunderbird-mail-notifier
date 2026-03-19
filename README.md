# 📬 New Mail Notifier for Thunderbird

> Thunderbird extension that notifies you about **new emails in any folder** — including messages automatically sorted by filters.

---

## Why this exists

[Mailbox Alert](https://addons.thunderbird.net/en-US/thunderbird/addon/mailbox-alert/) — the go-to notification add-on for Thunderbird — stopped working with modern versions. This extension was created to fill that gap with a lightweight, modern WebExtension alternative.

The key difference: most notification add-ons only watch the Inbox. **New Mail Notifier catches emails in every folder**, even those moved by Thunderbird's filter rules — which is exactly where Mailbox Alert used to shine.

---

## Features

- 🔔 Notifications for filtered mail in **any folder**, not just Inbox
- 🖱️ Click a notification → Thunderbird opens and jumps to that message
- 📦 Smart grouping — multiple simultaneous messages show as one notification
- ⚙️ Configurable polling interval (10–300 seconds)
- 🚫 System folders (Sent, Trash, Junk, Drafts) automatically excluded
- 🌐 Bilingual: Ukrainian 🇺🇦 and English 🇬🇧

---

## How it works

Thunderbird's `onNewMailReceived` event only fires for Inbox. For filtered mail, the add-on polls all folders on a configurable interval and detects new unread messages that haven't been seen before. This is the same approach used by Mailbox Alert internally.

---

## Installation

### From GitHub Releases

1. Download the latest `.xpi` file from [Releases](../../releases)
2. In Thunderbird: **Tools → Add-ons and Themes**
3. Click the gear icon ⚙️ → **Install Add-on From File...**
4. Select the downloaded `.xpi`

### From addons.thunderbird.net

*(Pending review — coming soon)*

---

## Settings

After installation, go to **Add-ons → New Mail Notifier → Settings** to configure the polling interval.

| Setting | Default | Range |
|---|---|---|
| Polling interval | 30 sec | 10–300 sec |

---

## Requirements

- Thunderbird **128.0** or later

---

## Author

**Oleh RA** — created with the help of Claude (Anthropic) 🤖 

---

## License

MIT — free to use, modify, and distribute.
