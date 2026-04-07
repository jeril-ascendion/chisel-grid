/**
 * T-21.4 SPFx Web Part
 *
 * Renders ChiselGrid tenant content inside SharePoint via iframe.
 * Uses SharePoint user context for SSO — passes aadToken to ChiselGrid
 * for authentication without requiring separate login.
 *
 * Build instructions:
 *   docker run --rm -v $(pwd):/app node:18 bash -c \
 *     "npm install -g @microsoft/generator-sharepoint && gulp bundle --ship && gulp package-solution --ship"
 */

import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart, type IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-webpart-base';
import { AadHttpClient } from '@microsoft/sp-http';

export interface IChiselGridWebPartProps {
  tenantUrl: string;
  defaultPage: string;
  height: string;
}

export default class ChiselGridWebPart extends BaseClientSideWebPart<IChiselGridWebPartProps> {
  private aadToken: string = '';

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Acquire AAD token for SSO with ChiselGrid backend
    try {
      const clientId = this.context.manifest.id;
      const tokenProvider = await this.context.aadTokenProviderFactory.getTokenProvider();
      this.aadToken = await tokenProvider.getToken(clientId);
    } catch (err) {
      console.warn('ChiselGrid: Failed to acquire SSO token', err);
    }
  }

  public render(): void {
    const tenantUrl = this.properties.tenantUrl || 'https://ascendion.engineering';
    const defaultPage = this.properties.defaultPage || '/';
    const height = this.properties.height || '800px';

    // Build iframe URL with SSO token
    const iframeSrc = `${tenantUrl}${defaultPage}${defaultPage.includes('?') ? '&' : '?'}sso_token=${encodeURIComponent(this.aadToken)}&embed=sharepoint`;

    this.domElement.innerHTML = `
      <div style="width:100%;height:${height};overflow:hidden;border-radius:8px;border:1px solid #e5e7eb;">
        <iframe
          src="${this.escapeHtml(iframeSrc)}"
          style="width:100%;height:100%;border:none;"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
          title="ChiselGrid Content Portal"
        ></iframe>
      </div>
    `;

    // Listen for messages from iframe for navigation events
    window.addEventListener('message', this.handleIframeMessage.bind(this));
  }

  private handleIframeMessage(event: MessageEvent): void {
    const tenantUrl = this.properties.tenantUrl || 'https://ascendion.engineering';

    // Only accept messages from our tenant URL
    if (!event.origin.startsWith(tenantUrl)) return;

    if (event.data?.type === 'chiselgrid:navigate') {
      const iframe = this.domElement.querySelector('iframe');
      if (iframe) {
        iframe.src = `${tenantUrl}${event.data.path}?sso_token=${encodeURIComponent(this.aadToken)}&embed=sharepoint`;
      }
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Configure ChiselGrid Web Part' },
          groups: [
            {
              groupName: 'Settings',
              groupFields: [
                PropertyPaneTextField('tenantUrl', {
                  label: 'ChiselGrid Tenant URL',
                  description: 'Your ChiselGrid tenant URL (e.g., https://yourcompany.chiselgrid.com)',
                  value: this.properties.tenantUrl,
                }),
                PropertyPaneTextField('defaultPage', {
                  label: 'Default Page',
                  description: 'Initial page to display (e.g., / or /category/cloud-architecture)',
                  value: this.properties.defaultPage || '/',
                }),
                PropertyPaneTextField('height', {
                  label: 'Height',
                  description: 'Web part height (e.g., 800px)',
                  value: this.properties.height || '800px',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
