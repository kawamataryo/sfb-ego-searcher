export const SEARCH_QUERIES = [
  "sky follower bridge",
  "'skybridge'",
  "'skyfollower'",
  "'bsky bridge'",
  "'follower bridge'",
  "'bluesky bridge'",
  "'sky-follower-bridge'",
  "'skyfollowerbridge.com'",
  "'skyfollowerbridge'",
];

/**
 * 検索対象の投稿の時間
 * 35分前の投稿を検索する（cronが30分ごとに実行されるため）
 */
export const TARGET_TIME = new Date(Date.now() - 35 * 60 * 1000);

/**
 * スパムの投稿に対する返信メッセージ
 */
export const SPAM_REPLY_POST = {
  MESSAGE:
    "Thank you for mentioning Sky Follower Bridge. However, if you are referring to the browser extension Sky Follower Bridge, the site you have shared is incorrect. It is a spam site impersonating Sky Follower Bridge. The real official site is here: https://www.sky-follower-bridge.dev",
  QUOTE_POST_URI:
    "at://did:plc:hcp53er6pefwijpdceo5x4bp/app.bsky.feed.post/3lcicsmfskc2b",
  QUOTE_POST_CID: "bafyreihxvzoheoi2xg5gatwjmlqeblwfkfqv24im4h5jgdsddwhhiggyoe",
  LINK: {
    URL: "https://www.sky-follower-bridge.dev",
    TITLE: "Sky Follower Bridge",
    DESCRIPTION:
      "Sky Follower Bridge is a browser extension that helps you manage your Bluesky followers.",
    THUMB_URL: "https://www.sky-follower-bridge.dev/images/og-image.png",
  },
};
