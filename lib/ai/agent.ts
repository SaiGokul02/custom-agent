import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import searchFoods from "./tools/searchFoods";
import {addToFoodTracker} from "./tools/addToFoodTracker";

import { systemPrompt } from "./prompts/systemPrompt";
import { getNutritionSummary } from "./tools/getNutritionSummary";

const apiKey = process.env.GOOGLE_API_KEY

const checkpointer = new MemorySaver();

// gokul's key
// const model = new ChatGoogleGenerativeAI({
//     model: "gemini-2.5-flash-lite",
//     apiKey
// });

// kaushik's key
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    apiKey
});

const agent = createAgent({
    model,
    tools: [searchFoods, addToFoodTracker, getNutritionSummary],
    systemPrompt,
    checkpointer
});

export default agent