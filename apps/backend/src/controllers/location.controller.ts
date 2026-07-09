import type { Request, Response } from 'express';
import { LocationRepository } from '@repositories/location.repository.js';
import { OperatingHoursRepository } from '@repositories/services.repository.js';
import type { DayOfWeek, UpsertOperatingHourPayload } from '@medisdiana/shared-types';

interface IncomingDaySchedule {
  isOpen: boolean;
  blocks?: { openTime: string; closeTime: string }[];
}

/** Flatten the {[day]: {isOpen, blocks}} shape sent by FormularioSede into one row per open block. */
function flattenOperatingHours(operatingHours: Record<string, IncomingDaySchedule>): UpsertOperatingHourPayload[] {
  const result: UpsertOperatingHourPayload[] = [];
  for (const [day, schedule] of Object.entries(operatingHours)) {
    if (!schedule.isOpen) continue;
    for (const block of schedule.blocks ?? []) {
      if (!block.openTime || !block.closeTime) continue;
      result.push({ day: day as DayOfWeek, opensAt: block.openTime, closesAt: block.closeTime });
    }
  }
  return result;
}

export async function getLocations(_req: Request, res: Response): Promise<void> {
  try {
    const locations = await LocationRepository.findAll();
    res.json({ success: true, data: { locations } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  try {
    const { operatingHours, ...locationData } = req.body;
    const location = await LocationRepository.create(locationData);

    if (operatingHours) {
      await OperatingHoursRepository.upsertMany(location.id, flattenOperatingHours(operatingHours));
    }

    res.status(201).json({ success: true, data: { location } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { operatingHours, ...locationData } = req.body;
    const location = await LocationRepository.update(id, locationData);
    if (!location) { res.status(404).json({ success: false, error: 'Sede no encontrada' }); return; }

    if (operatingHours) {
      await OperatingHoursRepository.upsertMany(location.id, flattenOperatingHours(operatingHours));
    }

    res.json({ success: true, data: { location } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await LocationRepository.delete(id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Sede no encontrada' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
