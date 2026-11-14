export type SyncAction = 'add' | 'update' | 'delete' | 'sync' | 'pull';

export interface SyncPayload {
  action: SyncAction;
  secretKey: string;
  payload: unknown;
}

export interface SyncResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  isNetworkError?: boolean;
}

export const syncToGoogleSheets = async <T = unknown>(
  url: string,
  secretKey: string,
  action: SyncAction,
  payload: unknown
): Promise<SyncResult<T>> => {
  if (!url || !secretKey) {
    return { success: false, message: 'URL หรือ Secret Key ว่างเปล่า' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      message: 'อุปกรณ์ออฟไลน์อยู่ รายการถูกเก็บเข้าคิวรอซิงค์อัตโนมัติแล้ว',
      isNetworkError: true,
    };
  }

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
      return {
        success: false,
        message: `HTTP error! status: ${response.status}`,
        isNetworkError: response.status >= 500,
      };
    }

    const data = await response.json();
    if (data.code === 200) {
      return {
        success: true,
        data: typeof data.message === 'object' ? (data.message as T) : undefined,
      };
    }

    return {
      success: false,
      message: `Apps Script Error: ${data.message} (Code: ${data.code})`,
      isNetworkError: false,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google Sheets sync failed:', error);
    return {
      success: false,
      message: `Network/CORS Error: ${msg}`,
      isNetworkError: true,
    };
  }
};
