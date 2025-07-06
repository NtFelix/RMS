import { Client } from "@notionhq/client";
import { BlockObjectResponse, PageObjectResponse, SelectPropertyItemObjectResponse } from "@notionhq/client/build/src/api-endpoints";

let notionClientInstance: Client | null = null;
// This variable is no longer needed at this scope, as NEXT_PUBLIC_NOTION_DATABASE_ID will be read directly inside getNotionClient
// let currentNotionDatabaseId: string | null | undefined = null;

function getNotionClient(): Client {
  if (!notionClientInstance) {
    const apiKey = process.env.NEXT_PUBLIC_NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("Missing NEXT_PUBLIC_NOTION_API_KEY environment variable. Please set it in your .env file or deployment environment.");
    }

    // Read and check for NEXT_PUBLIC_NOTION_DATABASE_ID when the client is first requested
    const databaseId = process.env.NEXT_PUBLIC_NOTION_DATABASE_ID;
    if (!databaseId) {
      // Updated error message to reflect the new variable name
      console.error("CRITICAL: Missing NEXT_PUBLIC_NOTION_DATABASE_ID environment variable. This is required for notion-service to function.");
      throw new Error("Missing NEXT_PUBLIC_NOTION_DATABASE_ID environment variable. Please set it in your .env file or deployment environment.");
    }
    // Storing it on the client instance or a module variable if needed elsewhere, but for now, just use it for initialization
    // currentNotionDatabaseId = databaseId; // Not strictly needed if only used here for client init and in functions directly

    notionClientInstance = new Client({ auth: apiKey });
  }
  return notionClientInstance;
}

export interface NotionFileData {
  name: string;
  url: string;
  type: "file" | "external" | undefined; // More specific and allows undefined
  fileTypeFromNotion: string; // This will be the actual mime type or a descriptive type
}

export interface NotionPageData {
  id: string;
  title: string;
  category?: string | null;
  version?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>; // Keeping this for now, might be removed if not strictly needed by consumers
  filesAndMedia?: NotionFileData[];
  // content?: BlockObjectResponse[]; // Content will be fetched on demand
}

export async function getDatabasePages(): Promise<NotionPageData[]> {
  const client = getNotionClient();
  const databaseId = process.env.NEXT_PUBLIC_NOTION_DATABASE_ID;

  if (!databaseId) {
    // This check is redundant if getNotionClient throws, but good for belt-and-suspenders
    // or if getNotionClient logic changes.
    console.error("NEXT_PUBLIC_NOTION_DATABASE_ID is not available when trying to fetch database pages.");
    throw new Error("NEXT_PUBLIC_NOTION_DATABASE_ID is not defined. Critical for fetching pages.");
    // return []; // Unreachable if we throw
  }

  try {
    const response = await client.databases.query({
      database_id: databaseId, // Use the directly accessed NEXT_PUBLIC_NOTION_DATABASE_ID
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

      // Get Dateien und Medien
      // Assuming the property name in Notion is "Dateien und Medien" and it's a "files" property type
      const filesAndMediaProperty = typedPage.properties["Dateien und Medien"];
      let filesAndMedia: NotionFileData[] = [];

      if (filesAndMediaProperty && filesAndMediaProperty.type === "files") {
        filesAndMedia = filesAndMediaProperty.files.map(file => {
          let url = "";
          let fileType = "unknown"; // Default type
          if (file.type === "external") {
            url = file.external.url;
            // For external files, we might not have a specific mime type from Notion directly.
            // We can try to infer from URL extension or default to a generic type.
            // For simplicity, let's use a generic type or the name itself if it has an extension.
            const nameParts = file.name.split('.');
            fileType = nameParts.length > 1 ? nameParts.pop()! : 'external link';
          } else if (file.type === "file") {
            url = file.file.url;
            // Notion API for page properties of type "file" doesn't directly provide mime type.
            // It's usually part of the signed URL or one has to infer from the name.
            // We'll use the file extension from the name as a proxy for fileTypeFromNotion.
            const nameParts = file.name.split('.');
            fileType = nameParts.length > 1 ? nameParts.pop()! : 'file';
          }
          return {
            name: file.name,
            url: url,
            type: file.type, // 'file' or 'external'
            fileTypeFromNotion: fileType, // Store inferred type (e.g., 'pdf', 'png', 'link')
          };
        });
      } else if (filesAndMediaProperty) {
        console.warn(`Page with ID ${typedPage.id} has "Dateien und Medien" property, but it's not of type "files". Type is: ${filesAndMediaProperty.type}`);
      }


      return {
        id: typedPage.id,
        title: title,
        category: category,
        version: version,
        properties: typedPage.properties, // Retaining original properties for now
        filesAndMedia: filesAndMedia.length > 0 ? filesAndMedia : undefined,
      };
    });
  } catch (error) {
    console.error("Failed to fetch database pages from Notion:", error);
    return [];
  }
}

export async function getPageContent(pageId: string): Promise<BlockObjectResponse[]> {
  try {
    const blocks: BlockObjectResponse[] = [];
    let cursor: string | undefined;
    const client = getNotionClient();

    while (true) {
      const { results, next_cursor } = await client.blocks.children.list({
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
  } catch (error) {
    console.error(`Failed to fetch content for page ${pageId} from Notion:`, error);
    return [];
  }
}
