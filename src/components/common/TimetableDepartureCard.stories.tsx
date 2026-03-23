import type { Meta, StoryObj } from '@storybook/react-vite';

import type { TimetableDeparture } from '../../hooks/useTimetableDepartures';

import { TimetableDepartureCard } from './TimetableDepartureCard';

/** Mock: tram, scheduled, za 5 min */
const mockScheduled: TimetableDeparture = {
  adjustedMinutes: 9 * 60 + 20,
  delaySeconds: null,
  minutesUntil: 5,
  realtimeSource: null,
  routeId: 'route-1',
  routeLongName: 'Dubec – Savski most – Mirogoj',
  routeShortName: '4',
  routeType: 0,
  scheduledMinutes: 9 * 60 + 20,
  tripDestinationName: 'Mirogoj',
  tripId: 'trip-1',
};

/** Mock: bus, realtime on time */
const mockRealtimeOnTime: TimetableDeparture = {
  ...mockScheduled,
  delaySeconds: 0,
  minutesUntil: 2,
  realtimeSource: 'stop',
  routeLongName: 'Savski most – Zapruđe',
  routeShortName: '106',
  routeType: 3,
  tripDestinationName: 'Zapruđe',
};

/** Mock: tram, realtime late (+3 min) */
const mockRealtimeLate: TimetableDeparture = {
  ...mockScheduled,
  adjustedMinutes: 9 * 60 + 23,
  delaySeconds: 180,
  minutesUntil: 8,
  realtimeSource: 'stop',
  routeLongName: 'Črnomerec – Sopot',
  routeShortName: '6',
  tripDestinationName: 'Sopot',
};

/** Mock: bus, realtime early (-2 min) */
const mockRealtimeEarly: TimetableDeparture = {
  ...mockScheduled,
  adjustedMinutes: 9 * 60 + 16,
  delaySeconds: -120,
  minutesUntil: 1,
  realtimeSource: 'trip',
  routeLongName: 'Knežija – Kvaternikov trg',
  routeShortName: '268',
  routeType: 3,
};

/** Mock: arriving now */
const mockArrivingNow: TimetableDeparture = {
  ...mockScheduled,
  adjustedMinutes: 9 * 60 + 15,
  delaySeconds: 30,
  minutesUntil: 0,
  realtimeSource: 'stop',
  routeLongName: 'Mihaljevac – Zapruđe',
  routeShortName: '14',
  tripDestinationName: 'Zapruđe',
};

const meta = {
  argTypes: {
    compact: { control: 'boolean' },
  },
  component: TimetableDepartureCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Common / TimetableDepartureCard',
} satisfies Meta<typeof TimetableDepartureCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Card: Story = {
  args: {
    compact: false,
    departure: mockScheduled,
  },
};

export const CardCompact: Story = {
  args: {
    compact: true,
    departure: mockScheduled,
  },
};

export const RealtimeOnTime: Story = {
  args: {
    compact: false,
    departure: mockRealtimeOnTime,
  },
};

export const RealtimeLate: Story = {
  args: {
    compact: false,
    departure: mockRealtimeLate,
  },
};

export const RealtimeEarly: Story = {
  args: {
    compact: false,
    departure: mockRealtimeEarly,
  },
};

export const ArrivingNow: Story = {
  args: {
    compact: false,
    departure: mockArrivingNow,
  },
};
