# sfb-ego-searcher 🔍

A script for monitoring posts about Sky Follower Bridge ([@sky-follower-bridge.dev](https://bsky.app/profile/sky-follower-bridge.dev)) on Bluesky 🦋

## Features ✨

- Periodically searches for posts containing keywords related to Sky Follower Bridge
- Processes detected posts with the following actions:
  - Automatic likes on posts
  - Automated warning replies for posts mentioning spam sites
  - Slack notifications
    - Liked posts link
    - Japanese translation of post content
    - Emergency Slack notifications for posts reporting issues

## Tech Stack 🛠️

- [Deno](https://deno.land/) 🦕
- [OpenAI API](https://openai.com/blog/openai-api) 🧠 (Post analysis and translation)
- [Bluesky API](https://atproto.com/docs) 🦋 (Post search, likes, and replies)
- [Slack API](https://api.slack.com/) 💬 (Notifications)
