import { TwitterApi } from "twitter-api-v2";
import OpenAI from "openai";

import dotenv from "dotenv";
dotenv.config();

export interface TweetResult {
  success: boolean;
  tweetText?: string;
  tweetId?: string;
  error?: string;
}

export class TwitterAgent {
  private twitterClient: TwitterApi;
  public openaiClient: OpenAI;

  constructor() {
    // Validate Twitter credentials
    // if (
    //   !TWITTER_API_KEY ||
    //   !TWITTER_API_SECRET ||
    //   !TWITTER_ACCESS_TOKEN ||
    //   !TWITTER_ACCESS_TOKEN_SECRET
    // ) {
    //   throw new Error(
    //     "Missing Twitter API credentials. Please check your environment variables."
    //   );
    // }

    console.info("Initializing Twitter client with credentials...");

    // Initialize Twitter client
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.info("Twitter and OpenAI clients initialized successfully");
  }

  /**
   * Generate content using ChatGPT and post tweet to Twitter
   */
  async postTweet(information: string): Promise<TweetResult> {
    try {
      console.info(`Generating tweet about: ${information}`);

      // Generate tweet content using ChatGPT
      const prompt = `Create an engaging tweet about: ${information}

Requirements:
- Maximum 280 characters
- Engaging and authentic
- Include relevant hashtags if appropriate
- No quotation marks around the tweet
- Make it ready to post directly

Tweet:`;

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a skilled social media manager who creates engaging tweets. Always respond with just the tweet text, no additional formatting or explanation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      const tweetText = response.choices[0]?.message?.content?.trim() || "";

      const finalTweetText =
        tweetText.length > 280
          ? tweetText.substring(0, 277) + "..."
          : tweetText;

      console.info(`Generated tweet: ${finalTweetText}`);

      // Post tweet to Twitter
      console.info(`Posting tweet: "${finalTweetText}"`);
      const tweetResponse = await this.twitterClient.v2.tweet(finalTweetText);
      console.info(
        `✅ Tweet posted successfully with ID: ${tweetResponse.data.id}`
      );

      return {
        success: true,
        tweetText: finalTweetText,
        tweetId: tweetResponse.data.id,
      };
    } catch (error: any) {
      console.error(`❌ Error posting tweet: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
