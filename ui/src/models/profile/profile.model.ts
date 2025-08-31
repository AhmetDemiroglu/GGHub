export interface Profile {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  dateOfBirth: Date | null;
  createdAt: string;
  status: string | null;
  phoneNumber: string | null;
  profileVisibility: number;
  messageSetting: number;
  isEmailPublic: boolean;
  isPhoneNumberPublic: boolean;
  isDateOfBirthPublic: boolean;
  
}

export interface ProfileForUpdate {
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  isEmailPublic: boolean; 
  isPhoneNumberPublic: boolean;
  isDateOfBirthPublic: boolean;
  profileImageUrl: string | null;
}

export enum ProfileVisibilitySetting {
  Public = 0,
  Followers = 1,
  Private = 2,
}

export enum MessagePrivacySetting {
  Everyone = 0,
  Following = 1,
  None = 2,
}

export interface UpdateProfileVisibilityDto {
  newVisibility: ProfileVisibilitySetting;
}

export interface UpdateMessageSettingDto {
  newSetting: MessagePrivacySetting;
}