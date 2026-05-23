export interface RosterStudent {
  id: number;
  full_name: string;
  email: string;
  number: string;
  /// Status field is optional — the backend's StudentRegistration row carries
  /// it but components mostly ignore it. Keep optional so unwrap doesn't trip
  /// TypeScript when status is absent.
  status?: string;
}

/// Raw row shape returned by `GET /roster/:courseOfferingId` — a
/// StudentRegistration with the joined student. We flatten this in the
/// service layer so consumers can keep reading `s.full_name` directly.
export interface RosterRegistrationRow {
  id: number;
  studentId: number;
  batchSectionId: number;
  status?: string;
  student: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
}
