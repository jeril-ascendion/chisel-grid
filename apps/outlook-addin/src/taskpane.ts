/**
 * T-22.1 Outlook Add-in Taskpane
 *
 * Reads selected email conversation via Office.context.mailbox.item
 * and POSTs thread content to ChiselGrid API for content creation.
 */

/* global Office */

const API_BASE = 'https://api.chiselgrid.com';

interface EmailThread {
  subject: string;
  sender: string;
  recipients: string[];
  body: string;
  conversationId: string;
  receivedDateTime: string;
  attachments: Array<{
    name: string;
    contentType: string;
    size: number;
  }>;
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    initTaskpane();
  }
});

function initTaskpane(): void {
  const captureBtn = document.getElementById('capture-btn');
  const statusEl = document.getElementById('status');

  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      captureEmailThread(statusEl);
    });
  }

  // Show email preview immediately
  showEmailPreview();
}

function showEmailPreview(): void {
  const item = Office.context.mailbox.item;
  if (!item) return;

  const previewEl = document.getElementById('preview');
  if (previewEl) {
    previewEl.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:14px;color:#0f172a;">${escapeHtml(item.subject)}</h3>
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;">From: ${escapeHtml(item.from?.emailAddress ?? 'Unknown')}</p>
      <p style="margin:0;font-size:12px;color:#94a3b8;">Conversation ID: ${item.conversationId?.slice(0, 20)}...</p>
    `;
  }
}

async function captureEmailThread(statusEl: HTMLElement | null): Promise<void> {
  const item = Office.context.mailbox.item;
  if (!item) {
    showStatus(statusEl, 'No email selected', 'error');
    return;
  }

  showStatus(statusEl, 'Reading email...', 'info');

  try {
    // Get email body
    const body = await new Promise<string>((resolve, reject) => {
      item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value);
        } else {
          reject(new Error(result.error?.message ?? 'Failed to get body'));
        }
      });
    });

    // Get attachments info
    const attachments = (item.attachments ?? []).map((att) => ({
      name: att.name,
      contentType: att.contentType,
      size: att.size,
    }));

    const thread: EmailThread = {
      subject: item.subject,
      sender: item.from?.emailAddress ?? '',
      recipients: (item.to ?? []).map((r) => r.emailAddress),
      body,
      conversationId: item.conversationId ?? '',
      receivedDateTime: item.dateTimeCreated?.toISOString() ?? new Date().toISOString(),
      attachments,
    };

    showStatus(statusEl, 'Sending to ChiselGrid...', 'info');

    // Get auth token from Office SSO
    let token = '';
    try {
      token = await Office.auth.getAccessToken({ allowConsentPrompt: true });
    } catch {
      // Fallback: user needs to authenticate separately
      showStatus(statusEl, 'Please sign in to ChiselGrid first', 'error');
      return;
    }

    // POST to ChiselGrid API
    const response = await fetch(`${API_BASE}/api/integrations/email-thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(thread),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    showStatus(statusEl, `Captured! Content ID: ${result.contentId}`, 'success');
  } catch (err) {
    console.error('Capture failed:', err);
    showStatus(statusEl, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
  }
}

function showStatus(el: HTMLElement | null, message: string, type: 'info' | 'success' | 'error'): void {
  if (!el) return;
  const colors = { info: '#2563eb', success: '#16a34a', error: '#dc2626' };
  el.style.color = colors[type];
  el.textContent = message;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
