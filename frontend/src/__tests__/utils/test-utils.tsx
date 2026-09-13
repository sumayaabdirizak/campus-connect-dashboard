import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'

// Custom render function with proper provider setup
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, options)
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
