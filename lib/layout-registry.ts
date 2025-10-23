import { LayoutHandler } from './layout-handlers';
// import { create1UpLayoutHandler } from './layouts/1-up'; // Disabled - using inline code
import { create2UpLayoutHandler } from './layouts/2-up';
import { create3UpLayoutHandler } from './layouts/3-up';
import { create4UpLayoutHandler } from './layouts/4-up';
import { create8UpLayoutHandler } from './layouts/8-up';
import { createListLayoutHandler } from './layouts/list';
import { createCompactListLayoutHandler } from './layouts/compact-list';
import { createTableLayoutHandler } from './layouts/table';

export type LayoutType = '1-up' | '2-up' | '3-up' | '4-up' | '8-up' | 'list' | 'compact-list' | 'table';

class LayoutRegistry {
  private handlers: Map<LayoutType, LayoutHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Register all layout handlers
    // NOTE: 1-up handler is disabled - using inline code in html.ts instead
    // this.handlers.set('1-up', create1UpLayoutHandler());
    this.handlers.set('2-up', create2UpLayoutHandler());
    this.handlers.set('3-up', create3UpLayoutHandler());
    this.handlers.set('4-up', create4UpLayoutHandler());
    this.handlers.set('8-up', create8UpLayoutHandler());
    this.handlers.set('list', createListLayoutHandler());
    this.handlers.set('compact-list', createCompactListLayoutHandler());
    this.handlers.set('table', createTableLayoutHandler());
  }

  getHandler(layout: LayoutType): LayoutHandler | undefined {
    return this.handlers.get(layout);
  }

  getAllLayouts(): LayoutType[] {
    return Array.from(this.handlers.keys());
  }

  registerHandler(layout: LayoutType, handler: LayoutHandler) {
    this.handlers.set(layout, handler);
  }

  getSupportedLayouts(): string[] {
    return this.getAllLayouts();
  }

  // Helper method to get all CSS styles from all handlers
  getAllCssStyles(): string {
    return Array.from(this.handlers.values())
      .map(handler => handler.getCssStyles())
      .join('\n');
  }
}

// Export a singleton instance
export const layoutRegistry = new LayoutRegistry();
