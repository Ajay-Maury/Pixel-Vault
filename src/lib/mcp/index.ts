import { defineMcp } from "@lovable.dev/mcp-js";
import searchImagesTool from "./tools/search-images";
import getImageTool from "./tools/get-image";

export default defineMcp({
  name: "pixelvault-mcp",
  title: "PixelVault MCP",
  version: "0.1.0",
  instructions:
    "Tools for browsing the PixelVault public image library. Use `search_public_images` to find images by text, and `get_public_image` to fetch a specific image's metadata.",
  tools: [searchImagesTool, getImageTool],
});
