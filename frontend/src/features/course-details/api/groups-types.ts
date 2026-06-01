export type GroupMemberRole = 'LEADER' | 'MEMBER';

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
  role: GroupMemberRole;
  joined_at: string;
  member: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
}

/// Returned by the my-submission endpoint for GROUP-mode assignments.
/// Gives the student visibility into their group's composition + role.
export interface GroupInfo {
  groupId: number;
  groupName: string;
  isLeader: boolean;
  members: {
    id: number;
    name: string;
    role: GroupMemberRole;
  }[];
}
