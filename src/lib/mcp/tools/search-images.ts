import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const BACKEND_BASE_URL = "https://pixel-vault-backend-tqww.onrender.com/api";

export default defineTool({
  name: "search_public_images",
  title: "Search public images",
  description:
    "Search the PixelVault public image library by keyword, title, or description. Returns image metadata including URL, dimensions, and keywords.",
  inputSchema: {
    searchText: z
      .string()
      .default("")
      .describe("Text to search for. Leave empty to browse recent public images."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(12)
      .describe("Maximum number of images to return (1-50)."),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Pagination offset."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ searchText, limit, offset }) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/image/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText, limit, offset, myLibrary: false }),
      });
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `Search failed: ${res.status} ${res.statusText}` }],
          isError: true,
        };
      }
      const data = await res.json();
      const items = (data?.data ?? []).map((img: any) => ({
        id: img.id,
        title: img.title,
        description: img.description,
        image_url: img.image_url,
        width: img.width,
        height: img.height,
        keywords: img.keywords,
      }));
      return {
        content: [
          {
            type: "text",
            text: `Found ${data?.totalCount ?? items.length} image(s). Showing ${items.length}.`,
          },
        ],
        structuredContent: {
          totalCount: data?.totalCount ?? items.length,
          publicCount: data?.publicCount,
          items,
        },
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
});
