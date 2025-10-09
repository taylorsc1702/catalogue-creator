import { LayoutHandler } from './layout-handlers';
import { create1UpLayoutHandler } from './layouts/1-up';
import { create2UpLayoutHandler } from './layouts/2-up';

export type LayoutType = '1-up' | '2-up' | '3-up' | '4-up' | '8-up' | 'list' | 'compact-list';

class LayoutRegistry {
  private handlers: Map<LayoutType, LayoutHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Register the handlers we've created
    this.handlers.set('1-up', create1UpLayoutHandler());
    this.handlers.set('2-up', create2UpLayoutHandler());
    
    // TODO: Register other handlers as we create them
    // this.handlers.set('3-up', create3UpLayoutHandler());
    // this.handlers.set('4-up', create4UpLayoutHandler());
    // this.handlers.set('8-up', create8UpLayoutHandler());
    // this.handlers.set('list', createListLayoutHandler());
    // this.handlers.set('compact-list', createCompactListLayoutHandler());
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
