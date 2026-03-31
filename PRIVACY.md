# GEOCopilot Privacy Policy

Last updated: 2026-03-31

## Data we process
- **User-provided website profile data** (name, URL, category, email, descriptions, tags).
- **Extension settings** (language/theme/preferences and fill-related toggles).
- **Field text on the currently visited web page** only for matching/filling when the extension runs.

## Where data is stored
- All configuration data is stored locally using `chrome.storage.local`.
- GEOCopilot does **not** run its own backend and does **not** upload your profile/settings data to remote servers.

## Network access and sharing
- GEOCopilot does not transmit profile/settings content to third-party services.
- The sponsor link opens GitHub Sponsors only when the user clicks it.

## Permissions usage
- `storage`: save your extension profiles/settings locally.
- `activeTab`: allow user-triggered operation on the current tab.
- `scripting`: support script-based extension interaction workflow.
- `sidePanel`: open extension UI in Chrome side panel.
- Content scripts run on `http://*/*` and `https://*/*` pages to detect and fill form fields.

## User control
- You can edit/delete all saved data from the extension UI.
- You can disable web filling and disable advanced plugin features in Settings.
- You can export/import your configuration as JSON.

## Contact
- GitHub: https://github.com/Cweiping
