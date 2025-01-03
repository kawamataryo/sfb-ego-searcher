import { SEARCH_QUERIES, TARGET_TIME } from "./constants.ts";
import { SlackClient } from "./helpers/slack_client.ts";
import { BlueskyClient } from "./helpers/bluesky_client.ts";
import { OpenAIClient } from "./helpers/openai_client.ts";
import { PostProcessor } from "./services/post_processor.ts";
import { consola } from "npm:consola";

/**
 * クライアントを初期化する
 * @returns 初期化済みのクライアント
 */
async function initializeClients() {
  const bluesky = new BlueskyClient();
  await bluesky.initialize({
    identifier: Deno.env.get("BLUESKY_USERNAME")!,
    password: Deno.env.get("BLUESKY_PASSWORD")!,
  });

  const analyzer = new OpenAIClient(Deno.env.get("OPENAI_API_KEY")!);
  const slackClient = new SlackClient(
    Deno.env.get("SLACK_BOT_TOKEN")!,
    Deno.env.get("SLACK_CHANNEL_ID")!,
  );

  return { bluesky, analyzer, slackClient };
}

/**
 * 投稿を検索する
 * @param bluesky - Blueskyクライアント
 * @returns 検索結果の投稿Map（キー: 投稿者DID-URI, 値: 投稿オブジェクト）
 */
async function searchPosts(bluesky: BlueskyClient) {
  const results = new Map();
  await Promise.all(
    SEARCH_QUERIES.map(async (query) => {
      const posts = await bluesky.searchPosts(query, TARGET_TIME);
      for (const post of posts) {
        results.set(`${post.author.did}-${post.uri}`, post);
      }
    }),
  );
  return results;
}

/**
 * メイン処理
 * Sky Follower Bridgeの投稿を検索して、それぞれの投稿を処理する
 */
async function main() {
  try {
    const { bluesky, analyzer, slackClient } = await initializeClients();
    const postProcessor = new PostProcessor(bluesky, analyzer, slackClient);

    const results = await searchPosts(bluesky);
    consola.info(`Found ${results.size} posts`);

    // 投稿を逐次処理
    for (const post of results.values()) {
      await postProcessor.processPost(post);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      consola.error(`Fatal error: ${error.message}`);
    } else {
      consola.error("Unknown fatal error occurred");
    }
    Deno.exit(1);
  }
}

await main();
