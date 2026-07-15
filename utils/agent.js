import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
    (city) => `It's sunny in ${city}!`,
    {
        name: 'get_weather',
        description: 'Get the weather for a given city',
        schema: z.object({
            city: z.string().describe('The city to get weather for'),
        })
    }
)

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: "AIzaSyBazZcwsZwNl_hRq0_DMs2U6kqrqvL9iZM",
});

const agent = createAgent({
    model,
    tools: [getWeather, ],
});

export default agent;