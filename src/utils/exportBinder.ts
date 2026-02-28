import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { Card } from '../types';

/**
 * Capture a view reference and export it as a PNG image
 */
export async function exportBinderAsImage(
  viewRef: any,
  collectionName: string
): Promise<string> {
  if (!viewRef) {
    throw new Error('View reference is required');
  }

  try {
    // Capture the view as an image with high quality
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });
    
    return uri;
  } catch (error) {
    console.error('Failed to capture view:', error);
    throw error;
  }
}

/**
 * Share the exported binder image file using native sharing
 */
export async function shareBinderImage(
  filePath: string,
  collectionName: string
): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(filePath, {
      mimeType: 'image/png',
      dialogTitle: `Share ${collectionName} Binder`,
      UTI: 'public.png',
    });
  } catch (error) {
    console.error('Failed to share image:', error);
    throw error;
  }
}
