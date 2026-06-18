import { Log } from '../../../logging-middleware/logger.js';

/**
 * Fetches notifications from the test server.
 * @param {object} params - Query parameters.
 * @param {number} params.page - Page number.
 * @param {number} params.limit - Limit per page.
 * @param {string} params.notificationType - Event, Result, or Placement.
 * @param {string} token - JWT Access Token.
 */
export async function fetchNotifications({ page = 1, limit = 10, notificationType = '' } = {}, token = '') {
  try {
    let url = `http://4.224.186.213/evaluation-service/notifications?page=${page}&limit=${limit}`;
    if (notificationType && notificationType !== 'All') {
      url += `&notification_type=${notificationType}`;
    }

    const headers = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Log the API call action
    await Log('frontend', 'info', 'api', `Fetching notifications page ${page} (limit ${limit}, type: ${notificationType || 'All'})`);

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errText = await response.text();
      const status = response.status;
      await Log('frontend', 'error', 'api', `Failed fetching notifications: HTTP ${status} - ${errText}`);
      throw new Error(`HTTP ${status}: ${errText || 'Failed to fetch'}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    await Log('frontend', 'fatal', 'api', `Exception in fetchNotifications: ${error.message}`);
    throw error;
  }
}
