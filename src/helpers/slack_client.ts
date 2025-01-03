import { SlackAPI } from "https://deno.land/x/deno_slack_api@2.8.0/mod.ts";
import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@2.8.0/types.ts";

type NotifyParams = {
  text: string;
  blocks?: unknown[];
  codeBlock?: {
    text: string;
  };
};

export class SlackClient {
  private client: SlackAPIClient;

  constructor(private token: string, private channel: string) {
    this.client = SlackAPI(this.token);
  }

  async notify(params: NotifyParams) {
    const blocks = params.blocks ?? [];
    if (params.codeBlock) {
      blocks.push(
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: params.text,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`\n${params.codeBlock.text}\n\`\`\``,
          },
        },
        {
          type: "divider",
        },
      );
    }

    const res = await this.client.chat.postMessage({
      channel: this.channel,
      text: params.text,
      ...(blocks.length > 0 && { blocks }),
    });
    return res;
  }
}
