export interface WebVerifyBundle {
  summary: string;
  sources: string[];
  verified: boolean;
}

export function webVerify(query: string, apiKey: string): Promise<WebVerifyBundle>;
