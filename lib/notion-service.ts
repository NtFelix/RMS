import { Client } from "@notionhq/client";
import { BlockObjectResponse, PageObjectResponse, SelectPropertyItemObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY) {
  throw new Error("Missing NOTION_API_KEY environment variable. Please set it in your .env file or deployment environment.");
}

if (!NOTION_DATABASE_ID) {
  throw new Error("Missing NOTION_DATABASE_ID environment variable. Please set it in your .env file or deployment environment.");
}

const notion = new Client({ auth: NOTION_API_KEY });

export interface NotionPageData {
  id: string;
  title: string;
  category?: string | null; // Added category
  version?: string | null; // Added version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
  content?: BlockObjectResponse[];
}

export async function getDatabasePages(): Promise<NotionPageData[]> {
  if (!NOTION_DATABASE_ID) {
    console.error("NOTION_DATABASE_ID is not defined.");
    return [];
  }

  try {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: "Version", // Filter by the "Version" property
        select: {
          equals: "Version 2.0", // Only include pages where Version is "Version 2.0"
        },
      },
      // sorts: [{ property: "Last edited time", direction: "descending" }], // Optional: add sorting if needed
    });

    return response.results.map((page) => {
      const typedPage = page as PageObjectResponse;
      let title = "Untitled";
      let category: string | null = null;
      let version: string | null = null;

      // Get Title (from "Name" property)
      const titleProperty = typedPage.properties.Name;
      if (titleProperty && titleProperty.type === "title" && titleProperty.title.length > 0) {
        title = titleProperty.title[0].plain_text;
      } else {
        // Fallback for title (as before)
        const firstTitleProp = Object.values(typedPage.properties).find(prop => prop.type === 'title');
        if (firstTitleProp && firstTitleProp.type === 'title' && firstTitleProp.title.length > 0) {
          title = firstTitleProp.title[0].plain_text;
        } else {
          console.warn(`Page with ID ${typedPage.id} has no recognizable 'Name' title property. Using 'Untitled'.`);
        }
      }

      // Get Kategorie
      const kategorieProperty = typedPage.properties.Kategorie; // Assuming the property name is "Kategorie"
      if (kategorieProperty && kategorieProperty.type === "select" && kategorieProperty.select) {
        category = kategorieProperty.select.name;
      } else if (kategorieProperty && kategorieProperty.type === "rich_text" && kategorieProperty.rich_text.length > 0) {
        // Fallback if Kategorie is a rich_text property, take plain text of first segment
        category = kategorieProperty.rich_text[0].plain_text;
      } else if (kategorieProperty && kategorieProperty.type === "title" && kategorieProperty.title.length > 0) {
        // Fallback if Kategorie is a title property (less likely but possible)
        category = kategorieProperty.title[0].plain_text;
      }


      // Get Version (already filtered, but good to extract if needed elsewhere)
      const versionProperty = typedPage.properties.Version;
      if (versionProperty && versionProperty.type === "select" && versionProperty.select) {
        version = versionProperty.select.name;
      }
      // Add other fallbacks for version property type if necessary

      return {
        id: typedPage.id,
        title: title,
        category: category,
        version: version,
        properties: typedPage.properties,
      };
    });
  } catch (error: any) { // Changed to any to inspect error properties
    console.error("[getDatabasePages] Error fetching from Notion. Status:", error?.status, "Code:", error?.code, "Message:", error?.message, "Full error:", JSON.stringify(error, null, 2));
    // Create a new error with potentially more info or a specific status code
    const newError = new Error(`Notion API Error: ${error?.message || 'Unknown error'}`);
    (newError as any).status = error?.status || 500; // Attach status if available
    (newError as any).code = error?.code;
    throw newError; // Re-throw to be caught by the API route
  }
}

export async function getPageContent(pageId: string): Promise<BlockObjectResponse[] | null> { // Allow null for not found
  try {
    const blocks: BlockObjectResponse[] = [];
    let cursor: string | undefined;

    while (true) {
      const { results, next_cursor } = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      blocks.push(...(results as BlockObjectResponse[]));

      if (!next_cursor) {
        break;
      }

      cursor = next_cursor;
    }
    return blocks;
  } catch (error: any) { // Changed to any to inspect error properties
    console.error(`[getPageContent] Error fetching content for page ${pageId}. Status:`, error?.status, "Code:", error?.code, "Message:", error?.message, "Full error:", JSON.stringify(error, null, 2));
    // If Notion API returns 404 for a page ID that doesn't exist
    if (error?.status === 404) {
      return null; // Indicate page not found by returning null
    }
    const newError = new Error(`Notion API Error for page ${pageId}: ${error?.message || 'Unknown error'}`);
    (newError as any).status = error?.status || 500;
    (newError as any).code = error?.code;
    throw newError; // Re-throw other errors
  }
}
