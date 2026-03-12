/**
 * Google Drive Cloud Sync Service.
 * Interfaces with Google Drive REST API to store and retrieve the jk_vault_snapshot.json file.
 */

import { Expense, Income, WealthItem, BudgetItem, Bill, Notification, UserSettings, BudgetRule, RecurringItem } from '../types';

export interface BackupData {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  budgetItems: BudgetItem[];
  rules: BudgetRule[];
  bills: Bill[];
  notifications: Notification[];
  settings: UserSettings;
  recurringItems: RecurringItem[];
  timestamp: string;
}

const VAULT_FILE_NAME = 'jk_vault_snapshot.json';

async function findVaultFile(accessToken: string): Promise<string | null> {
  const q = `name = '${VAULT_FILE_NAME}' and trashed = false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

export async function syncToGoogleDrive(accessToken: string, data: Omit<BackupData, 'timestamp'>): Promise<string> {
  console.log("JK PORTAL: Initiating Synchronous Upload to Google Drive...");
  
  const lastSynced = new Date().toISOString();
  const securePayload: BackupData = { ...data, timestamp: lastSynced };
  const fileContent = JSON.stringify(securePayload);
  const metadata = { name: VAULT_FILE_NAME, mimeType: 'application/json' };

  try {
    const fileId = await findVaultFile(accessToken);

    if (fileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: fileContent,
      });
    } else {
      // Create new file with multipart upload
      const boundary = 'jk_portal_boundary';
      const multipartBody = [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${fileContent}\r\n`,
        `--${boundary}--`
      ].join('');

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });
    }

    console.log("JK PORTAL: Cloud Vault Synchronized Successfully.");
    return lastSynced;
  } catch (error) {
    console.error("JK PORTAL: Secure Sync Failure:", error);
    throw new Error("Failed to sync with Google Drive.");
  }
}

export async function restoreFromGoogleDrive(accessToken: string): Promise<BackupData | null> {
  console.log("JK PORTAL: Polling Google Drive for Vault Snapshot...");
  
  try {
    const fileId = await findVaultFile(accessToken);
    if (!fileId) {
      console.log("JK PORTAL: No existing cloud snapshot found.");
      return null;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Restoration handshake failed.');

    const data: BackupData = await response.json();
    console.log("JK PORTAL: Vault State Restored from Cloud.");
    return data;
  } catch (err) {
    console.error("JK PORTAL: Restoration Error:", err);
    return null;
  }
}