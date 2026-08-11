declare module 'bootstrap/js/dist/modal' {
  export default class Modal {
    constructor(element: Element, options?: any);
    static getInstance(element: Element): Modal | null;
    show(): void;
    hide(): void;
    dispose(): void;
  }
}


