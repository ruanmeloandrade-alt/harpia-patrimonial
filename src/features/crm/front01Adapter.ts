import type { AssigneeOption } from './CrmWorkspace';

export interface Front01InternalUserPort {
  id: string;
  full_name: string;
  account_type: 'client' | 'internal';
  is_active: boolean;
}

export type Front01InternalUserLoader = () => Promise<Front01InternalUserPort[]>;

export function mapFront01Assignees(users: Front01InternalUserPort[]): AssigneeOption[] {
  return users
    .filter((user) => user.account_type === 'internal' && user.is_active)
    .map((user) => ({ id: user.id, name: user.full_name.trim() }))
    .filter((user) => Boolean(user.name));
}

export async function loadFront01Assignees(
  listInternalUsers: Front01InternalUserLoader,
): Promise<AssigneeOption[]> {
  return mapFront01Assignees(await listInternalUsers());
}
