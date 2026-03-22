import type { Preview } from '@storybook/react-vite';
import React from 'react';

import '../src/index.css';

const ThemeDecorator = (Story: React.ComponentType) =>
  React.createElement(
    'div',
    { 'data-theme': 'light', style: { padding: '1rem' } },
    React.createElement(Story),
  );

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [ThemeDecorator],
};

export default preview;