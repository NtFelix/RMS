import { Client } from "@notionhq/client";
import { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>; // Adjust as per your needs
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
      // Add any filters or sorts if needed
      // filter: { property: "Status", select: { equals: "Published" } },
      // sorts: [{ property: "Last edited time", direction: "descending" }],
    });

    return response.results.map((page) => {
      const typedPage = page as PageObjectResponse; // Type assertion
      let title = "Untitled"; // Default title

      // Check if 'Name' property exists and is of title type
      const titleProperty = typedPage.properties.Name; // Common default property name for title
      if (titleProperty && titleProperty.type === "title" && titleProperty.title.length > 0) {
        title = titleProperty.title[0].plain_text;
      } else {
        // Fallback: try to find any title property, or use ID if no title property
        const firstTitleProp = Object.values(typedPage.properties).find(prop => prop.type === 'title');
        if (firstTitleProp && firstTitleProp.type === 'title' && firstTitleProp.title.length > 0) {
          title = firstTitleProp.title[0].plain_text;
        } else {
          console.warn(`Page with ID ${typedPage.id} has no recognizable title property. Using 'Untitled'.`);
        }
      }


      return {
        id: typedPage.id,
        title: title,
        properties: typedPage.properties,
      };
    });
  } catch (error) {
    console.error("Failed to fetch database pages from Notion:", error);
    // It's good practice to return an empty array or throw the error
    // depending on how you want to handle this in the calling code.
    return [];
  }
}

export async function getPageContent(pageId: string): Promise<BlockObjectResponse[]> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100, // Adjust as needed, Notion API max is 100
    });
    return response.results as BlockObjectResponse[];
  } catch (error) {
    console.error(`Failed to fetch content for page ${pageId} from Notion:`, error);
    return [];
  }
}
