import OpenAI from "npm:openai";
import { safeDestr } from "npm:destr";

export type AnalysisResult = {
  isTarget: boolean;
  isIssue: boolean;
  hasSpamUrl: boolean;
};

export type TranslationResult = {
  japaneseTranslation: string;
};

export class OpenAIClient {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async translate(text: string): Promise<TranslationResult> {
    const res = await this.openai.chat.completions.create({
      messages: [{
        role: "user",
        content: `
Please translate the following text to Japanese.
Do not translate the terms Sky Follower Bridge, Sky Bridge, and Bsky Bridge; keep them in English.
Provide the response in JSON format with the key "japaneseTranslation".

Text: ${text}
        `.trim(),
      }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    return safeDestr<TranslationResult>(
      res.choices[0].message.content ?? {
        japaneseTranslation: text,
      },
    );
  }

  async analyze(text: string): Promise<AnalysisResult> {
    const res = await this.openai.chat.completions.create({
      messages: [{
        role: "user",
        content: `
Please evaluate the provided text and classify it based on the following criteria:

1. **Target Identification**:
  - Determine if the text explicitly or implicitly refers to any of the following terms:
    - "Sky Follower Bridge"
    - "sky bridge"
    - "follower bridge"
    - "bsky bridge"
  - Exclude references that:
    - Describe generic physical or metaphorical bridges.
    - Relate to cryptocurrency-related projects, tools, or alliances.
  - Additionally, if the text contains any of the following URLs, "isTarget" must always be set to "true":
    - "sky-follower-bridge.dev"
    - "chromewebstore.google.com/detail/sky-follower-bridge/behhbpbpmailcnfbjagknjngnfdojpko"
    - "https://addons.mozilla.org/en-US/firefox/addon/sky-follower-bridge"
    - "skyfollowerbridge.com"

  - If any of the above criteria are met, set "isTarget" to true; otherwise, set it to false.

2. **Issue Report Detection**:
  - Check if the text indicates a problem, error, or feedback specific to the mentioned tools or terms.
  - Examples include bug reports, feature requests, or usage difficulties.
  - If it is an issue report, set "isIssue" to true; otherwise, set it to false.

3. **Spam URL Detection**:
  - Verify if the text contains the URL "skyfollowerbridge.com".
  - If the URL is present, set "hasSpamUrl" to true; otherwise, set it to false.

4. **Response Formatting**:
  - Provide the analysis results in the following JSON format:
    {
      "isTarget": true/false,
      "isIssue": true/false,
      "hasSpamUrl": true/false
    }

**Text to analyze**:
"""
${text}
"""

**Additional Notes**:
- Be thorough in differentiating between valid mentions and excluded contexts to reduce false positives.
- Specific URLs listed above override other criteria for "isTarget" and always result in "true" for that field.
        `.trim(),
      }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    return safeDestr<AnalysisResult>(
      res.choices[0].message.content ?? {
        isTarget: false,
        isIssue: false,
        hasSpamUrl: false,
      },
    );
  }
}
