import { tool } from "langchain";
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

export default getWeather;