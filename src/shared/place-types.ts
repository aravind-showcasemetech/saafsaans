// place-types.ts: The place search shapes the server returns and the browser reads.
import { z } from "zod";

export const PlaceSuggestionSchema = z.object({
  placeId: z.string(),
  text: z.string(),
});

export const PlaceCoordinatesSchema = z.object({
  placeId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  displayName: z.string().optional(),
});

export type PlaceSuggestion = z.infer<typeof PlaceSuggestionSchema>;
export type PlaceCoordinates = z.infer<typeof PlaceCoordinatesSchema>;
