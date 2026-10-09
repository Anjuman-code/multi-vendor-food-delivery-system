import httpClient from '@/lib/httpClient';

export interface EmailPreferences {
  orderUpdates: boolean;
  accountAlerts: boolean;
  reviewRequests: boolean;
  promotions: boolean;
  newsletter: boolean;
}

export interface PreferencesResponse {
  email?: string;
  preferences: EmailPreferences;
}

export const emailService = {
  /**
   * Fetch current email preferences using an unsubscribe token or user session.
   */
  async getPreferences(token?: string): Promise<PreferencesResponse> {
    const params = token ? { token } : {};
    const response = await httpClient.get<{ success: boolean; data: PreferencesResponse }>(
      '/api/email/preferences',
      { params },
    );
    return response.data.data;
  },

  /**
   * Update email preferences.
   */
  async updatePreferences(
    preferences: Partial<EmailPreferences>,
    token?: string,
  ): Promise<PreferencesResponse> {
    const response = await httpClient.put<{ success: boolean; data: PreferencesResponse }>(
      '/api/email/preferences',
      { preferences, token },
    );
    return response.data.data;
  },

  /**
   * 1-click unsubscribe or granular category update via token.
   */
  async unsubscribe(params: {
    token: string;
    unsubscribeAll?: boolean;
    preferences?: Partial<EmailPreferences>;
  }): Promise<{ message: string; preferences: EmailPreferences }> {
    const response = await httpClient.post<{
      success: boolean;
      data: { message: string; preferences: EmailPreferences };
    }>('/api/email/unsubscribe', params);
    return response.data.data;
  },
};
