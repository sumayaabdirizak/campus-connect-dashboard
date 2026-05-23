export interface CourseGroup {
  id: number;
  name: string;
  courseOfferingId: number;
  created_by_id: number;
  created_at: string;
  /// Optional — backend GET doesn't include the creator relation today.
  creator?: {
    id: number;
    full_name: string;
  };
  members: GroupMember[];
}

export interface GroupMember {
  id: number;
  groupId: number;
  memberId: number;
  joined_at: string;
  member: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
}
