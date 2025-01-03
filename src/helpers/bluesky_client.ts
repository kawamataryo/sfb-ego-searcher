import { AtpAgent } from "npm:@atproto/api";
import type { PostView } from "npm:@atproto/api/dist/client/types/app/bsky/feed/defs";
import type { ThreadViewPost } from "npm:@atproto/api/dist/client/types/app/bsky/feed/defs";
import type { BlobRef } from "npm:@atproto/api";
import { RichText } from "npm:@atproto/api";

type ReplyWithQuoteAndLinkParams = {
  post: PostView;
  text: string;
  link: {
    url: string;
    title: string;
    description: string;
    thumb?: BlobRef;
  };
  quotePost: {
    uri: string;
    cid: string;
  };
};

export class BlueskyClient {
  private agent: AtpAgent;
  private likesSet: Set<string> = new Set();

  constructor() {
    this.agent = new AtpAgent({
      service: "https://bsky.social",
    });
  }

  async initialize({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }) {
    await this.agent.login({
      identifier,
      password,
    });
    await this.fetchLikes();
  }

  private createKey({ cid, uri }: { cid: string; uri: string }) {
    return `${cid}-${uri}`;
  }

  private async fetchLikes() {
    let cursor: string | undefined = undefined;
    while (this.likesSet.size < 300) {
      const likes = await this.agent.com.atproto.repo.listRecords({
        repo: this.agent.did!,
        collection: "app.bsky.feed.like",
        limit: 100,
        cursor: cursor,
      });
      this.likesSet = new Set([
        ...this.likesSet,
        ...likes.data.records.map((like) =>
          this.createKey({
            cid: (like.value as any).subject.cid,
            uri: (like.value as any).subject.uri,
          })
        ),
      ]);
      cursor = likes.data.cursor;
    }
  }

  async searchPosts(query: string, since: Date): Promise<PostView[]> {
    const res = await this.agent.app.bsky.feed.searchPosts({
      q: query,
      limit: 100,
      sort: "latest",
      since: since.toISOString(),
    });
    return res.data.posts;
  }

  async hasReplied(post: PostView): Promise<boolean> {
    if (!post.replyCount || post.replyCount === 0) return false;

    const { data: threadView } = await this.agent.getPostThread({
      uri: post.uri,
    });
    return Array.isArray(threadView.thread.replies)
      ? threadView.thread.replies.some((threadPost) =>
        threadPost.post.author.did === this.agent.did
      )
      : false;
  }

  hasLiked(post: PostView): boolean {
    return this.likesSet.has(this.createKey({
      cid: post.cid,
      uri: post.uri,
    }));
  }

  async like(post: PostView) {
    await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.did!,
      collection: "app.bsky.feed.like",
      record: {
        $type: "app.bsky.feed.like",
        subject: {
          uri: post.uri,
          cid: post.cid,
        },
        createdAt: new Date().toISOString(),
      },
    });
  }

  getDid(): string {
    return this.agent.did!;
  }

  getPostUrl(post: PostView): string {
    return `https://bsky.app/profile/${post.author.handle}/post/${
      post.uri.split("/").pop()
    }`;
  }

  getUriFromUrl(url: string): string {
    const [handle, rkey] = url.split("/profile/")[1].split("/post/");
    return `at://${handle}/app.bsky.feed.post/${rkey}`;
  }

  async getPostThread(uri: string) {
    return await this.agent.getPostThread({
      uri,
    });
  }

  async uploadImage(imageUrl: string): Promise<BlobRef> {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const result = await this.agent.uploadBlob(new Uint8Array(buffer), {
      encoding: "image/jpeg",
    });
    return result.data.blob;
  }

  async replyWithQuoteAndLink({
    post,
    text,
    quotePost,
    link: { url, title, description, thumb },
  }: ReplyWithQuoteAndLinkParams) {
    const { data: threadView } = await this.agent.getPostThread({
      uri: post.uri,
    });

    const thread = threadView.thread as ThreadViewPost;
    const rootUri = thread.post.uri;
    const rootCid = thread.post.cid;

    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.did!,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        reply: {
          root: {
            uri: rootUri,
            cid: rootCid,
          },
          parent: {
            uri: post.uri,
            cid: post.cid,
          },
        },
        embed: {
          $type: "app.bsky.embed.recordWithMedia",
          record: {
            $type: "app.bsky.embed.record",
            record: {
              cid: quotePost.cid,
              uri: quotePost.uri,
            },
          },
          media: {
            $type: "app.bsky.embed.external",
            external: {
              uri: url,
              title,
              description,
              ...(thumb && { thumb }),
            },
          },
        },
        createdAt: new Date().toISOString(),
      },
    });
  }
}
