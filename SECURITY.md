# Security policy

## Supported versions

Only the latest release gets security fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what the problem is, how to reproduce it, and what an attacker could do with it. You will get a reply within a week. Once a fix is released we are happy to credit you.

## Scope

In scope: the desktop app (`app/`), the room server (`server/`), the website and the docs.

Good to know:

- The room server has no accounts or authentication. Anyone who knows a room code can join, so don't run it publicly for private rooms without putting it behind your own access control.
- Spotify and Jamendo keys you enter are stored in plain text in Sonoma's settings file on your computer.
