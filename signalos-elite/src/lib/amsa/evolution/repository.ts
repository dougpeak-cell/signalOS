import type {
  AMSAPulseEntityType,
  AMSAPulseMover,
  AMSAPulseSnapshot,
  AMSASnapshotFrequency,
} from "../types";

/* =========================================================
   PULSE SNAPSHOT REPOSITORY INTERFACE

   Keeps database code separate from AMSA calculations.
========================================================= */

export type SnapshotQuery = {
  entityType: AMSAPulseEntityType;
  entityKey: string;

  limit?: number;

  dateFrom?: string;
  dateTo?: string;

  frequency?: AMSASnapshotFrequency;
};

export type MoverQuery = {
  entityType?: AMSAPulseEntityType;
  entityKeys?: string[];

  limit?: number;
  minimumChange?: number;

  frequency?: AMSASnapshotFrequency;
};

export interface AMSAPulseRepository {
  saveSnapshot(
    snapshot: AMSAPulseSnapshot,
  ): Promise<AMSAPulseSnapshot>;

  getSnapshots(
    query: SnapshotQuery,
  ): Promise<AMSAPulseSnapshot[]>;

  getLatestSnapshot(
    entityType: AMSAPulseEntityType,
    entityKey: string,
  ): Promise<AMSAPulseSnapshot | null>;

  getPreviousSnapshot(
    entityType: AMSAPulseEntityType,
    entityKey: string,
    beforeDate: string,
  ): Promise<AMSAPulseSnapshot | null>;

  getMovers(
    query: MoverQuery,
  ): Promise<AMSAPulseMover[]>;
}