import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const BACKEND_BASE_URL = "https://pixel-vault-backend-tqww.onrender.com/api";

export default defineTool({
  name: "get_public_image",
  title: "Get public image by ID",
  description: "Fetch a single public PixelVault image's metadata by its ID.",
  inputSchema: {
    id: z.string().min(1).describe("The image ID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ id }) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/image/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText: id, limit: 1, offset: 0, myLibrary: false }),
      });
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `Lookup failed: ${res.status}` }],
          isError: true,
        };
      }
      const data = await res.json();
      const img = (data?.data ?? []).find((i: any) => i.id === id) ?? data?.data?.[0];
      if (!img) {
        return { content: [{ type: "text", text: "Image not found." }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(img, null, 2) }],
        structuredContent: { image: img },
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
});
