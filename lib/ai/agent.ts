import { createAgent } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
// import { MemorySaver } from "@langchain/langgraph";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {z} from "zod";

import searchFoods from "./tools/searchFoods";
import {addToFoodTracker} from "./tools/addToFoodTracker";

import { systemPrompt } from "./prompts/systemPrompt";
import { getNutritionSummary } from "./tools/getNutritionSummary";

const apiKey = process.env.GOOGLE_API_KEY

// const checkpointer = new MemorySaver();

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
await checkpointer.setup(); // idempotent, safe to leave in

const contextSchema = z.object({
  userId: z.string(),
});

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    apiKey
});

const agent = createAgent({
    model,
    tools: [searchFoods, addToFoodTracker, getNutritionSummary],
    systemPrompt,
    checkpointer,
    contextSchema
});

// we can create another agents as well and invoke them
const otherAgent = createAgent({
    model,
    tools: []
})

// models can be directly used without an agent in loop to complete small tasks that doesnt involve tools.
export {agent, otherAgent, model}