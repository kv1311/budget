declare module 'focus-trap' {
  interface FocusTrapOptions {
    onActivate?: () => void;
    onDeactivate?: () => void;
    initialFocus?: string | HTMLElement | (() => HTMLElement);
    fallbackFocus?: string | HTMLElement | (() => HTMLElement);
    escapeDeactivates?: boolean;
    clickOutsideDeactivates?: boolean;
    returnFocusOnDeactivate?: boolean;
    allowOutsideClick?: boolean | ((e: MouseEvent) => boolean);
  }

  interface FocusTrap {
    activate(): void;
    deactivate(): void;
    pause(): void;
    unpause(): void;
  }

  export function createFocusTrap(
    element: string | HTMLElement | Array<HTMLElement>,
    options?: FocusTrapOptions
  ): FocusTrap;
}
