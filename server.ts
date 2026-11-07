import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { fetchWeatherApi } from "openmeteo";
import { z } from "zod";
import { WeatherSchema, type Weather, type WeatherParams } from "./types.js";

// 1. MCP server with name and version
const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

// 2. A single tool: current weather for given coordinates.
//    The LLM can work out a city's coordinates on its own.
server.registerTool(
  "get_weather",
  {
    title: "Get Current Weather / Aktualna pogoda",
    description:
      "Get current weather data for a given latitude and longitude. " +
      "Sprawdź aktualną pogodę (temperatura, temperatura odczuwalna, wilgotność, opady, wiatr) " +
      "dla podanej szerokości i długości geograficznej, np. gdy użytkownik pyta: " +
      "„jaka jest pogoda w Warszawie?”, „czy pada w Krakowie?”, „ile jest stopni?”.",
    inputSchema: {
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
    },
    // Description of the data shape returned in structuredContent
    outputSchema: WeatherSchema.shape,
  },
  async ({ latitude, longitude }): Promise<CallToolResult> => {
    try {
      const params: WeatherParams = {
        latitude,
        longitude,
        current: [
          "temperature_2m",
          "apparent_temperature",
          "relative_humidity_2m",
          "precipitation",
          "wind_speed_10m",
          "is_day",
        ],
        // Metric units (the course uses °F / mph / inches)
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
      };

      const [response] = await fetchWeatherApi(
        "https://api.open-meteo.com/v1/forecast",
        params
      );
      const current = response.current();
      if (!current) {
        throw new Error("Response contains no current weather data");
      }

      const readVariable = (index: number): number => {
        const variable = current.variables(index);
        if (!variable) {
          throw new Error(`Response is missing variable at index ${index}`);
        }
        return variable.value();
      };

      // Index order must match the order in params.current
      const weather: Weather = {
        temperature: readVariable(0),
        feelsLike: readVariable(1),
        humidity: readVariable(2),
        precipitation: readVariable(3),
        windSpeed: readVariable(4),
        isDay: readVariable(5) === 1,
      };

      return {
        // Text for the model
        content: [{ type: "text", text: JSON.stringify(weather, null, 2) }],
        // Same data in structured form (matches outputSchema)
        structuredContent: weather,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          { type: "text", text: `Error fetching weather data: ${message}` },
        ],
        isError: true,
      };
    }
  }
);

// 3. stdio transport: JSON-RPC messages over stdin/stdout
const transport = new StdioServerTransport();
await server.connect(transport);