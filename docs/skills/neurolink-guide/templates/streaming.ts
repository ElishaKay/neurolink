/**
 * NeuroLink Streaming Template
 *
 * This template demonstrates streaming responses from AI providers
 * for real-time output display.
 */

import { NeuroLink } from "@juspay/neurolink";
import type { StreamOptions, StreamResult } from "@juspay/neurolink";

const neurolink = new NeuroLink();

async function basicStreaming(): Promise<void> {
  console.log("Generating story...\n");

  const result = await neurolink.stream({
    input: { text: "Write a short story about a robot learning to paint" },
    temperature: 0.8,
  });

  // Stream tokens to stdout
  for await (const chunk of result.stream) {
    process.stdout.write(chunk);
  }

  console.log("\n\n--- Complete ---");
  console.log("Total tokens:", result.usage?.total);
}

async function streamingWithOptions(): Promise<void> {
  const options: StreamOptions = {
    input: { text: "Explain the theory of relativity step by step" },
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.5,
    maxTokens: 1000,
    systemPrompt: "You are a physics teacher explaining concepts to students.",
  };

  const result = await neurolink.stream(options);

  let charCount = 0;
  for await (const chunk of result.stream) {
    process.stdout.write(chunk);
    charCount += chunk.length;
  }

  console.log(`\n\nStreamed ${charCount} characters`);
  console.log("Input tokens:", result.usage?.input);
  console.log("Output tokens:", result.usage?.output);
}

async function streamingWithProgress(): Promise<void> {
  const result = await neurolink.stream({
    input: { text: "List 10 interesting facts about space" },
  });

  let tokenCount = 0;
  const startTime = Date.now();

  for await (const chunk of result.stream) {
    process.stdout.write(chunk);
    tokenCount++;

    // Show progress every 10 tokens
    if (tokenCount % 10 === 0) {
      const elapsed = Date.now() - startTime;
      const tokensPerSecond = (tokenCount / elapsed) * 1000;
      process.stderr.write(`\r[${tokenCount} tokens, ${tokensPerSecond.toFixed(1)} tok/s]`);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n\nCompleted in ${totalTime}ms`);
}

async function streamingWithTimeout(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log("\nTimeout reached, aborting...");
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    const result = await neurolink.stream({
      input: { text: "Write a very long essay about artificial intelligence" },
    });

    for await (const chunk of result.stream) {
      process.stdout.write(chunk);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("\nStream was aborted");
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function streamingCollectFull(): Promise<void> {
  const result = await neurolink.stream({
    input: { text: "Write a haiku about programming" },
  });

  // Option 1: Collect manually
  const chunks: string[] = [];
  for await (const chunk of result.stream) {
    chunks.push(chunk);
    process.stdout.write(chunk);
  }
  const fullContent = chunks.join("");

  // Option 2: Use result.content (available after stream completes)
  console.log("\n\nFull content from chunks:", fullContent);
  console.log("Full content from result:", result.content);
}

async function streamingMultipleProviders(): Promise<void> {
  const providers = ["openai", "anthropic", "vertex"];
  const prompt = "What is machine learning in one sentence?";

  for (const provider of providers) {
    console.log(`\n--- ${provider} ---`);

    try {
      const result = await neurolink.stream({
        input: { text: prompt },
        provider,
      });

      for await (const chunk of result.stream) {
        process.stdout.write(chunk);
      }
      console.log();
    } catch (error) {
      console.log(`Provider ${provider} not available`);
    }
  }
}

async function main(): Promise<void> {
  console.log("=== Basic Streaming ===\n");
  await basicStreaming();

  console.log("\n\n=== Streaming with Options ===\n");
  await streamingWithOptions();

  console.log("\n\n=== Streaming with Progress ===\n");
  await streamingWithProgress();

  console.log("\n\n=== Collect Full Response ===\n");
  await streamingCollectFull();
}

main().catch(console.error);
