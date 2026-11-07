import { z } from "zod";

// Shape of the data returned in structuredContent
export const WeatherSchema = z.object({
  temperature: z.number().describe("Temperature in °C"),
  feelsLike: z.number().describe("Apparent temperature in °C"),
  humidity: z.number().describe("Relative humidity in %"),
  precipitation: z.number().describe("Precipitation in mm"),
  windSpeed: z.number().describe("Wind speed in km/h"),
  isDay: z.boolean(),
});

export type Weather = z.infer<typeof WeatherSchema>;

// Query parameters (fetchWeatherApi accepts params as any)
export type WeatherParams = {
  latitude: number;
  longitude: number;
  current: string[];
  temperature_unit: "celsius" | "fahrenheit";
  wind_speed_unit: "kmh" | "ms" | "mph" | "kn";
  precipitation_unit: "mm" | "inch";
};
