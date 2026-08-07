export type PersonnelCredentialType = "SEP" | "SEP_FI" | "CLASS_1";

export interface PersonnelCredential {
  id: string;
  type: PersonnelCredentialType;
  expiryDate: string | null;
}

export interface Personnel {
  id: string;
  sourceSequence: number | null;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  tshirtSize: string | null;
  licenseNo: string | null;
  notes: string | null;
  isActiveFlying: boolean;
  company: string | null;
  team: string | null;
  vehiclePlate: string | null;
  credentials: PersonnelCredential[];
  createdAt: string;
  updatedAt: string;
}
