import { PostView } from "npm:@atproto/api/types/com/atproto/repo";
import { BlueskyClient } from "../helpers/bluesky_client.ts";
import { OpenAIClient } from "../helpers/openai_client.ts";
import { SlackClient } from "../helpers/slack_client.ts";
import { SPAM_REPLY_POST } from "../constants.ts";
import { consola } from "npm:consola";

export class PostProcessor {
  constructor(
    private bluesky: BlueskyClient,
    private analyzer: OpenAIClient,
    private slackClient: SlackClient,
  ) {}

  /**
   * 投稿を処理する
   * @param post - 処理対象の投稿
   * @returns Promise<void>
   */
  async processPost(post: PostView): Promise<void> {
    try {
      // 自分の投稿やすでにいいねした投稿はスキップ
      if (this.shouldSkipPost(post)) {
        return;
      }

      const postText = (post.record as { text: string }).text;
      const postUrl = this.bluesky.getPostUrl(post);
      const analysis = await this.analyzer.analyze(postText);

      consola.info(postUrl);
      consola.info(analysis);

      // 対象の投稿でない場合はスキップ
      if (!analysis.isTarget) {
        return;
      }

      // 投稿にいいねを付ける
      await this.bluesky.like(post);

      // 分析結果に基づいて投稿を処理
      await this.handlePostByAnalysis(post, analysis, postUrl);
      // 日本語訳をSlack通知
      await this.notifyTranslation(postText);
    } catch (error: unknown) {
      if (error instanceof Error) {
        consola.error(`Error processing post: ${error.message}`);
        await this.slackClient.notify({
          text: `⚠️ <!channel> エラーが発生しました: ${error.message} \n ${
            JSON.stringify(post)
          }`,
        });
      } else {
        consola.error("Unknown error occurred while processing post");
        await this.slackClient.notify({
          text: `⚠️ <!channel> 不明なエラーが発生しました \n ${
            JSON.stringify(post)
          }`,
        });
      }
    }
  }

  /**
   * 投稿をスキップすべきかどうかを判定する
   * @param post - 判定対象の投稿
   * @returns boolean - スキップすべき場合はtrue
   */
  private shouldSkipPost(post: PostView): boolean {
    return (
      // 自分の投稿
      post.author.did === this.bluesky.getDid() ||
      // すでにいいねした投稿
      this.bluesky.hasLiked(post)
    );
  }

  /**
   * 分析結果に基づいて投稿を処理する
   * @param post - 処理対象の投稿
   * @param analysis - 投稿の分析結果
   * @param postUrl - 投稿のURL
   */
  private async handlePostByAnalysis(
    post: PostView,
    analysis: { hasSpamUrl: boolean; isIssue: boolean },
    postUrl: string,
  ): Promise<void> {
    if (analysis.hasSpamUrl) {
      await this.handleSpamPost(post, postUrl);
    } else if (analysis.isIssue) {
      await this.handleIssuePost(postUrl);
    } else {
      await this.handleNormalPost(postUrl);
    }
  }

  /**
   * スパム投稿を処理する
   * @param post - スパム投稿
   * @param postUrl - 投稿のURL
   */
  private async handleSpamPost(post: PostView, postUrl: string): Promise<void> {
    await this.slackClient.notify({
      text:
        `🚨 <!channel> 投稿にスパムURLが含まれています。詳細を確認してください。\n${postUrl}`,
    });

    // 正しいSky Follower BridgeのURLを返信する
    const thumb = await this.bluesky.uploadImage(
      SPAM_REPLY_POST.LINK.THUMB_URL,
    );
    await this.bluesky.replyWithQuoteAndLink({
      post,
      text: SPAM_REPLY_POST.MESSAGE,
      link: {
        url: SPAM_REPLY_POST.LINK.URL,
        title: SPAM_REPLY_POST.LINK.TITLE,
        description: SPAM_REPLY_POST.LINK.DESCRIPTION,
        thumb,
      },
      quotePost: {
        cid: SPAM_REPLY_POST.QUOTE_POST_CID,
        uri: SPAM_REPLY_POST.QUOTE_POST_URI,
      },
    });
  }

  /**
   * 問題のある投稿を処理する
   * @param postUrl - 投稿のURL
   */
  private async handleIssuePost(postUrl: string): Promise<void> {
    await this.slackClient.notify({
      text:
        `🚨 <!channel> 不具合ついて言及しています。詳細を確認してください。\n ${postUrl}`,
    });
  }

  /**
   * 正常な投稿を処理する
   * @param postUrl - 投稿のURL
   */
  private async handleNormalPost(postUrl: string): Promise<void> {
    await this.slackClient.notify({
      text: `👍 投稿にLikeしました。\n ${postUrl}`,
    });
  }

  /**
   * 日本語訳をSlack通知
   * @param text - 翻訳対象のテキスト
   */
  private async notifyTranslation(text: string): Promise<void> {
    const translatedText = await this.analyzer.translate(text);
    await this.slackClient.notify({
      text: "🇯🇵 日本語訳:",
      codeBlock: {
        text: translatedText.japaneseTranslation,
      },
    });
  }
}
