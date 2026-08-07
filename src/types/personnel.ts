export type PersonnelCredentialType = "SEP" | "SEP_FI" | "CLASS_1";

export interface PersonnelCredential {
  id: string;
  type: PersonnelCredentialType;
  expiryDate: string | null;
}

export interface Personnel {
  id: string;
  sourceSequence: number | null;
  nationalId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  tshirtSize: string | null;
  licenseNo: string | null;
  notes: string | null;
  company: string | null;
  team: string | null;
  vehiclePlate: string | null;
  credentials: PersonnelCredential[];
  createdAt: string;
  updatedAt: string;
}
