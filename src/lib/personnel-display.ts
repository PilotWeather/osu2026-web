export interface PersonnelNameFields {
  canonicalFullName?: string | null;
  firstName: string;
  lastName: string;
}

export function personnelDisplayName(person: PersonnelNameFields | null | undefined): string {
  if (!person) return "-";
  return person.canonicalFullName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}
