import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ApproachingVehicle } from '../../hooks/useApproachingVehicles';
import { ApproachingVehicleCard } from './ApproachingVehicleCard';

const baseVehicle: ApproachingVehicle = {
  tripId: '0_4_123_6_10001',
  vehicleId: 'vehicle-1',
  routeId: 'route-4',
  routeShortName: '4',
  routeType: 0,
  routeLongName: 'Dubec – Savski most – Mirogoj',
  etaMinutes: 9 * 60 + 20,
  delaySeconds: 0,
  arrivingInSeconds: 300,
  stopsAway: 3,
  distanceMeters: 500,
  confidence: 'realtime',
  lat: 45.8,
  lon: 15.97,
  passedStop: false,
  etaFromGpsSeconds: 280,
};

/** At stop: distance < 15m, arriving now */
const mockAtStop: ApproachingVehicle = {
  ...baseVehicle,
  distanceMeters: 8,
  arrivingInSeconds: 0,
  stopsAway: 1,
  etaFromGpsSeconds: 0,
};

/** Nearby: distance < 100m */
const mockNearby: ApproachingVehicle = {
  ...baseVehicle,
  distanceMeters: 65,
  arrivingInSeconds: 90,
  stopsAway: 1,
  etaFromGpsSeconds: 85,
};

/** Far: distance > 100m */
const mockFar: ApproachingVehicle = {
  ...baseVehicle,
  distanceMeters: 850,
  arrivingInSeconds: 420,
  stopsAway: 5,
  etaFromGpsSeconds: 400,
};

/** Passed stop */
const mockPassedStop: ApproachingVehicle = {
  ...baseVehicle,
  distanceMeters: 120,
  arrivingInSeconds: -30,
  stopsAway: 0,
  passedStop: true,
  etaFromGpsSeconds: null,
};

/** Scheduled only: no GPS */
const mockScheduled: ApproachingVehicle = {
  ...baseVehicle,
  vehicleId: null,
  distanceMeters: null,
  stopsAway: null,
  confidence: 'scheduled',
  lat: null,
  lon: null,
  etaFromGpsSeconds: null,
  arrivingInSeconds: 600,
};

/** Bus variant */
const mockBus: ApproachingVehicle = {
  ...mockNearby,
  routeShortName: '106',
  routeType: 3,
  routeLongName: 'Savski most – Zapruđe',
};

const meta = {
  title: 'Common / ApproachingVehicleCard',
  component: ApproachingVehicleCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
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
