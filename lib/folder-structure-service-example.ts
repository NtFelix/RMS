/**
 * Example usage of Folder Structure Service
 * This demonstrates how the service would be used in the application
 */

import { FolderStructureService } from './folder-structure-service';

// Example usage in an API route or component
export async function exampleUsage() {
  const service = new FolderStructureService();
  const userId = 'user-123';

  try {
    // Initialize folder structure for a new user
    console.log('Initializing folder structure...');
    const folderTree = await service.initializeUserFolders(userId);
    console.log('Created folder structure:', folderTree.map(f => f.name));

    // Create folder for a new house
    console.log('Creating folder for new house...');
    const houseFolder = await service.createEntityFolder(
      userId,
      'haus',
      'house-456',
      'Musterstraße 123'
    );
    console.log('Created house folder:', houseFolder.name);

    // Create folder for a new apartment
    console.log('Creating folder for new apartment...');
    const apartmentFolder = await service.createEntityFolder(
      userId,
      'wohnung',
      'apt-789',
      'Wohnung 2A'
    );
    console.log('Created apartment folder:', apartmentFolder.name);

    // Create folder for a new tenant
    console.log('Creating folder for new tenant...');
    const tenantFolder = await service.createEntityFolder(
      userId,
      'mieter',
      'tenant-101',
      'Max Mustermann'
    );
    console.log('Created tenant folder:', tenantFolder.name);

    // Create a custom folder
    console.log('Creating custom folder...');
    const customFolder = await service.createCustomFolder(
      userId,
      `${userId}/sonstiges`,
      'Verträge'
    );
    console.log('Created custom folder:', customFolder.name);

    // Get the complete folder tree
    console.log('Getting complete folder tree...');
    const completeTree = await service.getFolderTree(userId);
    console.log('Complete folder tree:', JSON.stringify(completeTree, null, 2));

    return completeTree;
  } catch (error) {
    console.error('Error in folder structure example:', error);
    throw error;
  }
}

// Example of how to integrate with entity creation workflows
export async function onHouseCreated(userId: string, houseId: string, houseName: string) {
  const service = new FolderStructureService();
  
  try {
    await service.createEntityFolder(userId, 'haus', houseId, houseName);
    console.log(`Created folder for house: ${houseName}`);
  } catch (error) {
    console.error(`Failed to create folder for house ${houseName}:`, error);
    // Don't throw error - folder creation failure shouldn't block house creation
  }
}

export async function onApartmentCreated(userId: string, apartmentId: string, apartmentName: string) {
  const service = new FolderStructureService();
  
  try {
    await service.createEntityFolder(userId, 'wohnung', apartmentId, apartmentName);
    console.log(`Created folder for apartment: ${apartmentName}`);
  } catch (error) {
    console.error(`Failed to create folder for apartment ${apartmentName}:`, error);
  }
}

export async function onTenantCreated(userId: string, tenantId: string, tenantName: string) {
  const service = new FolderStructureService();
  
  try {
    await service.createEntityFolder(userId, 'mieter', tenantId, tenantName);
    console.log(`Created folder for tenant: ${tenantName}`);
  } catch (error) {
    console.error(`Failed to create folder for tenant ${tenantName}:`, error);
  }
}

// Example of how to handle entity deletion
export async function onHouseDeleted(userId: string, houseId: string) {
  const service = new FolderStructureService();
  
  try {
    await service.archiveEntityFolder(userId, 'haus', houseId);
    console.log(`Archived folder for deleted house: ${houseId}`);
  } catch (error) {
    console.error(`Failed to archive folder for house ${houseId}:`, error);
  }
}