export type AppSettings = {
  webSocketUrl: string;
  apiBase: string;
};

const fallbackSettings: AppSettings = {
  webSocketUrl: '/sync',
  apiBase: '/api/v1',
};

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetch('/assets/config.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
    return {...fallbackSettings, ...await response.json() as Partial<AppSettings>};
  } catch (error) {
    console.warn('Runtime config is unavailable, using same-origin defaults', error);
    return fallbackSettings;
  }
}
