

export type SyncAction = 'add' | 'update' | 'delete' | 'sync';

export interface SyncPayload {
  action: SyncAction;
  secretKey: string;
  payload: any;
}

export const syncToGoogleSheets = async (
  url: string,
  secretKey: string,
  action: SyncAction,
  payload: any
): Promise<boolean> => {
  if (!url || !secretKey) return false;

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
      // In some environments, Google Apps Script might return a redirect (302) or error
      // fetch API usually follows redirects transparently.
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.code === 200;
  } catch (error) {
    console.error('Google Sheets sync failed:', error);
    return false;
  }
};
