import type { Preview } from '@storybook/react-vite';

import React from 'react';

import '../src/index.css';

const ThemeDecorator = (Story: React.ComponentType) =>
  React.createElement(
    'div',
    { 'data-theme': 'light', style: { padding: '1rem' } },
    React.createElement(Story)
  );

const preview: Preview = {
  decorators: [ThemeDecorator],
  parameters: {
    a11y: {
      test: 'todo',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
