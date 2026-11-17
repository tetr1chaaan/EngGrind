export type TelegramUser = { id: number; first_name: string; username?: string };

export type TelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  BackButton: { show(): void; hide(): void; onClick(callback: () => void): void; offClick(callback: () => void): void };
  MainButton: {
    setText(text: string): void;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  onEvent(event: 'themeChanged', callback: () => void): void;
  offEvent(event: 'themeChanged', callback: () => void): void;
};

declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

export const telegram = window.Telegram?.WebApp;

export async function loadTelegramUser(): Promise<TelegramUser | null> {
  if (!telegram?.initData) return null;
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: telegram.initData }),
  });
  if (!response.ok) return null;
  const result: { user: TelegramUser } = await response.json();
  return result.user;
}

function telegramHeaders(): Record<string, string> | undefined {
  return telegram?.initData ? { authorization: `tma ${telegram.initData}` } : undefined;
}

export async function loadTelegramWords(): Promise<Array<{ word: string; meaning: string; example: string }>> {
  const response = await fetch('/api/words', { headers: telegramHeaders() });
  if (!response.ok) throw new Error('Could not load saved words');
  return response.json();
}

export async function saveTelegramWord(card: { word: string; meaning: string; example: string }): Promise<void> {
  const response = await fetch('/api/words', {
    method: 'POST',
    headers: { ...(telegramHeaders() ?? {}), 'content-type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!response.ok && response.status !== 409) throw new Error('Could not sync saved word');
}
