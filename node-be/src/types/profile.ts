export interface BasicProfile {
  name: string;
  displayName: string;
  location: string;
  languages: string[];
  birthday: string;
  gender: string;
  profilePicture?: string;
}

export interface GeneralProfile {
  friendship: string;
  professional: string;
  dating: string;
  general: string;
}

export interface PremiumFeatures {
  maxMustHaves: number;
  maxDealBreakers: number;
}

export interface UserProfile {
  userId?: string;
  basicProfile: BasicProfile;
  generalProfile: GeneralProfile;
  premiumFeatures?: PremiumFeatures;
  deviceToken?: string;
  devicePlatform?: string;
  rizzCode?: string;
  rizzPoint?: number;
}
