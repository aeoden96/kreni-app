import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ApproachingVehicle } from '../../hooks/useApproachingVehicles';

import { ApproachingVehicleCard } from './ApproachingVehicleCard';

const baseVehicle: ApproachingVehicle = {
  arrivingInSeconds: 300,
  confidence: 'realtime',
  delaySeconds: 0,
  distanceMeters: 500,
  etaFromGpsSeconds: 280,
  etaMinutes: 9 * 60 + 20,
  lat: 45.8,
  lon: 15.97,
  passedStop: false,
  routeId: 'route-4',
  routeLongName: 'Dubec – Savski most – Mirogoj',
  routeShortName: '4',
  routeType: 0,
  stopsAway: 3,
  tripDestinationName: 'Mirogoj',
  tripId: '0_4_123_6_10001',
  vehicleId: 'vehicle-1',
};

/** At stop: distance < 15m, arriving now */
const mockAtStop: ApproachingVehicle = {
  ...baseVehicle,
  arrivingInSeconds: 0,
  distanceMeters: 8,
  etaFromGpsSeconds: 0,
  stopsAway: 1,
};

/** Nearby: distance < 100m */
const mockNearby: ApproachingVehicle = {
  ...baseVehicle,
  arrivingInSeconds: 90,
  distanceMeters: 65,
  etaFromGpsSeconds: 85,
  stopsAway: 1,
};

/** Far: distance > 100m */
const mockFar: ApproachingVehicle = {
  ...baseVehicle,
  arrivingInSeconds: 420,
  distanceMeters: 850,
  etaFromGpsSeconds: 400,
  stopsAway: 5,
};

/** Passed stop */
const mockPassedStop: ApproachingVehicle = {
  ...baseVehicle,
  arrivingInSeconds: -30,
  distanceMeters: 120,
  etaFromGpsSeconds: null,
  passedStop: true,
  stopsAway: 0,
};

/** Scheduled only: no GPS */
const mockScheduled: ApproachingVehicle = {
  ...baseVehicle,
  arrivingInSeconds: 600,
  confidence: 'scheduled',
  distanceMeters: null,
  etaFromGpsSeconds: null,
  lat: null,
  lon: null,
  stopsAway: null,
  vehicleId: null,
};

/** Bus variant */
const mockBus: ApproachingVehicle = {
  ...mockNearby,
  routeLongName: 'Savski most – Zapruđe',
  routeShortName: '106',
  routeType: 3,
  tripDestinationName: 'Zapruđe',
};

const meta = {
  component: ApproachingVehicleCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Common / ApproachingVehicleCard',
} satisfies Meta<typeof ApproachingVehicleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtStop: Story = {
  args: {
    vehicle: mockAtStop,
  },
};

export const Nearby: Story = {
  args: {
    vehicle: mockNearby,
  },
};

export const Far: Story = {
  args: {
    vehicle: mockFar,
  },
};

export const PassedStop: Story = {
  args: {
    vehicle: mockPassedStop,
  },
};

export const Scheduled: Story = {
  args: {
    vehicle: mockScheduled,
  },
};

export const Bus: Story = {
  args: {
    vehicle: mockBus,
  },
};
