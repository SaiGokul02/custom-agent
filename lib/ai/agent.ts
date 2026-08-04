import {
  createAgent,
  createMiddleware,
  summarizationMiddleware,
  ToolMessage,
} from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
// import { MemorySaver } from "@langchain/langgraph";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

import searchFoods from "./tools/searchFoods";
import { addToFoodTracker } from "./tools/addToFoodTracker";

import { systemPrompt } from "./prompts/systemPrompt";
import { getNutritionSummary } from "./tools/getNutritionSummary";
import { getFoodTrackerEntries } from "./tools/getFoodTrackerEntries";

const apiKey = process.env.GOOGLE_API_KEY;

// const checkpointer = new MemorySaver();

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
await checkpointer.setup(); // idempotent, safe to leave in

const contextSchema = z.object({
  userId: z.string(),
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey,
});

// Middleware helps to catch unexpected errors and LLM can generate a natural language message to user
const handleToolErrors = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});

const trimMessageHistory = createMiddleware({
  name: "TrimMessages",
  beforeModel: async (state) => {
    // console.log(state.messages);
  },
});

const summarization = summarizationMiddleware({
  model,
  trigger: { tokens: 1000 },
  keep: { messages: 5 },
});

const agent = createAgent({
  model,
  tools: [
    searchFoods,
    addToFoodTracker,
    getNutritionSummary,
    getFoodTrackerEntries,
  ],
  middleware: [handleToolErrors, trimMessageHistory, summarization],
  systemPrompt,
  checkpointer,
  contextSchema,
});

// we can create another agents as well and invoke them
const otherAgent = createAgent({
  model,
  tools: [],
});

// models can be directly used without an agent in loop to complete small tasks that doesnt involve tools.
export { agent, otherAgent, model };
