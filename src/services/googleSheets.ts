

export type SyncAction = 'add' | 'update' | 'delete' | 'sync';

export interface SyncPayload {
  action: SyncAction;
  secretKey: string;
  payload: any;
}

export interface SyncResult {
  success: boolean;
  message?: string;
}

export const syncToGoogleSheets = async (
  url: string,
  secretKey: string,
  action: SyncAction,
  payload: any
): Promise<SyncResult> => {
  if (!url || !secretKey) return { success: false, message: 'URL หรือ Secret Key ว่างเปล่า' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        secretKey,
        payload,
      }),
    });

    if (!response.ok) {
      return { success: false, message: `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    if (data.code === 200) {
      return { success: true };
    } else {
      return { success: false, message: `Apps Script Error: ${data.message} (Code: ${data.code})` };
    }
  } catch (error: any) {
    console.error('Google Sheets sync failed:', error);
    return { success: false, message: `Network/CORS Error: ${error.message || 'Unknown error'}` };
  }
};
