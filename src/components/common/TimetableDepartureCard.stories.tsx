import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TimetableDeparture } from '../../hooks/useTimetableDepartures';
import { TimetableDepartureCard } from './TimetableDepartureCard';

/** Mock: tram, scheduled, za 5 min */
const mockScheduled: TimetableDeparture = {
  tripId: 'trip-1',
  routeId: 'route-1',
  routeShortName: '4',
  routeType: 0,
  routeLongName: 'Dubec – Savski most – Mirogoj',
  scheduledMinutes: 9 * 60 + 20,
  delaySeconds: null,
  adjustedMinutes: 9 * 60 + 20,
  realtimeSource: null,
  minutesUntil: 5,
};

/** Mock: bus, realtime on time */
const mockRealtimeOnTime: TimetableDeparture = {
  ...mockScheduled,
  routeShortName: '106',
  routeType: 3,
  routeLongName: 'Savski most – Zapruđe',
  delaySeconds: 0,
  realtimeSource: 'stop',
  minutesUntil: 2,
};

/** Mock: tram, realtime late (+3 min) */
const mockRealtimeLate: TimetableDeparture = {
  ...mockScheduled,
  routeShortName: '6',
  routeLongName: 'Črnomerec – Sopot',
  delaySeconds: 180,
  adjustedMinutes: 9 * 60 + 23,
  realtimeSource: 'stop',
  minutesUntil: 8,
};

/** Mock: bus, realtime early (-2 min) */
const mockRealtimeEarly: TimetableDeparture = {
  ...mockScheduled,
  routeShortName: '268',
  routeType: 3,
  routeLongName: 'Knežija – Kvaternikov trg',
  delaySeconds: -120,
  adjustedMinutes: 9 * 60 + 16,
  realtimeSource: 'trip',
  minutesUntil: 1,
};

/** Mock: arriving now */
const mockArrivingNow: TimetableDeparture = {
  ...mockScheduled,
  routeShortName: '14',
  routeLongName: 'Mihaljevac – Zapruđe',
  minutesUntil: 0,
  realtimeSource: 'stop',
  delaySeconds: 30,
  adjustedMinutes: 9 * 60 + 15,
};

const meta = {
  title: 'Common / TimetableDepartureCard',
  component: TimetableDepartureCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    compact: { control: 'boolean' },
  },
} satisfies Meta<typeof TimetableDepartureCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Card: Story = {
  args: {
    departure: mockScheduled,
    compact: false,
  },
};

export const CardCompact: Story = {
  args: {
    departure: mockScheduled,
    compact: true,
  },
};

export const RealtimeOnTime: Story = {
  args: {
    departure: mockRealtimeOnTime,
    compact: false,
  },
};

export const RealtimeLate: Story = {
  args: {
    departure: mockRealtimeLate,
    compact: false,
  },
};

export const RealtimeEarly: Story = {
  args: {
    departure: mockRealtimeEarly,
    compact: false,
  },
};

export const ArrivingNow: Story = {
  args: {
    departure: mockArrivingNow,
    compact: false,
  },
};
