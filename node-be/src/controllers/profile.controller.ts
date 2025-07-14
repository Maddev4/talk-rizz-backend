import { Request, Response } from "express";
import { Profile } from "../models/profile.model";
import { UserProfile } from "../types/profile";
import { AuthenticatedRequest } from "../middleware/auth";
import { uploadToS3 } from "../services/s3.service";
import { UploadedFile } from "express-fileupload";

export class ProfileController {
  async getUserProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      console.log("getUserProfile", userId);
      const profile = await Profile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUserProfileById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const profile = await Profile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async createProfile(req: AuthenticatedRequest, res: Response) {
    try {
      let userId;
      if (req.params?.userId?.length) {
        userId = req.params.userId;
      } else {
        userId = req.user?.id;
      }
      const { name } = req.body;
      const profileData: UserProfile = {
        userId,
        basicProfile: {
          name,
          displayName: name,
          location: "",
          languages: [],
          birthday: "",
          gender: "",
          profilePicture: "",
        },
        generalProfile: {
          friendship: "",
          professional: "",
          dating: "",
          general: "",
        },
      };

      const profile = await Profile.create(profileData);

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const profileData: UserProfile = req.body;

      // Validate required fields
      if (!profileData.basicProfile?.name?.trim()) {
        return res.status(400).json({ error: "Profile name is required" });
      }

      console.log("ProfileController - updateProfile for userId:", userId);
      console.log(
        "ProfileController - received profile data:",
        JSON.stringify(profileData, null, 2)
      );
      console.log("ProfileController - received files:", req.files);

      // Handle profile picture upload if provided
      let imageUrl = profileData.basicProfile.profilePicture || "";

      if (req.files?.profilePicture) {
        try {
          const file = req.files.profilePicture;
          // Check if it's an array and take the first file if it is
          const singleFile = Array.isArray(file) ? file[0] : file;

          // Validate file type
          const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
          ];
          if (!allowedTypes.includes(singleFile.mimetype)) {
            return res.status(400).json({
              error:
                "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
            });
          }

          // Validate file size (5MB limit)
          if (singleFile.size > 5 * 1024 * 1024) {
            return res.status(400).json({
              error: "File size too large. Maximum size is 5MB.",
            });
          }

          console.log("ProfileController - uploading image to S3:", {
            name: singleFile.name,
            size: singleFile.size,
            type: singleFile.mimetype,
          });

          imageUrl = await uploadToS3(singleFile, `profile-pictures/${userId}`);
          console.log(
            "ProfileController - image uploaded successfully:",
            imageUrl
          );
        } catch (uploadError) {
          console.error(
            "ProfileController - error uploading image:",
            uploadError
          );
          return res.status(500).json({
            error: "Failed to upload image. Please try again.",
          });
        }
      }

      // Prepare the updated profile data
      const updatedProfileData: UserProfile = {
        userId,
        basicProfile: {
          name: profileData.basicProfile.name.trim(),
          displayName:
            profileData.basicProfile.displayName?.trim() ||
            profileData.basicProfile.name.trim(),
          location: profileData.basicProfile.location?.trim() || "",
          languages: profileData.basicProfile.languages || [],
          birthday: profileData.basicProfile.birthday || "",
          gender: profileData.basicProfile.gender || "",
          profilePicture: imageUrl,
        },
        generalProfile: {
          friendship: profileData.generalProfile?.friendship?.trim() || "",
          professional: profileData.generalProfile?.professional?.trim() || "",
          dating: profileData.generalProfile?.dating?.trim() || "",
          general: profileData.generalProfile?.general?.trim() || "",
        },
        premiumFeatures: profileData.premiumFeatures || {
          maxMustHaves: 3,
          maxDealBreakers: 3,
        },
        rizzCode: profileData.rizzCode || "",
        rizzPoint: profileData.rizzPoint || 0,
      };

      console.log(
        "ProfileController - final profile data to save:",
        JSON.stringify(updatedProfileData, null, 2)
      );

      // Update or create profile
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        updatedProfileData,
        { new: true, upsert: true }
      );

      if (!updatedProfile) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      console.log("ProfileController - profile updated successfully");
      res.json(updatedProfile);
    } catch (error) {
      console.error("ProfileController - error in updateProfile:", error);
      res.status(500).json({
        error: "Internal server error. Please try again later.",
      });
    }
  }

  async getOtherProfiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const otherProfiles = await Profile.aggregate([
        {
          $match: { userId: { $ne: userId } },
        },
        {
          $lookup: {
            from: "chatrooms",
            let: { profileUserId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$profileUserId", "$participants"] },
                      { $in: [userId, "$participants"] },
                    ],
                  },
                },
              },
            ],
            as: "existingChatrooms",
          },
        },
        {
          $match: {
            existingChatrooms: { $size: 0 },
          },
        },
        {
          $project: {
            existingChatrooms: 0,
          },
        },
      ]);
      res.json(otherProfiles);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getMatchProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { type } = req.query;

      if (type !== "general" && type !== "dating") {
        return res.status(400).json({ error: "Invalid match type" });
      }

      const userProfile = await Profile.findOne({ userId });
      if (!userProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Build matching criteria
      const matchCriteria: any = {
        userId: { $ne: userId }, // Exclude current user
        "basicProfile.location": userProfile.basicProfile.location, // Same location
      };

      // Find potential matches
      const matches = await Profile.find(matchCriteria)
        .limit(10) // Limit results
        .sort({ createdAt: -1 }); // Most recent profiles first

      if (matches.length === 0) {
        return res.status(404).json({ error: "No matches found" });
      }

      // Return a random match
      const randomMatch = matches[Math.floor(Math.random() * matches.length)];
      res.json(randomMatch);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async upgradeToPremium(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Update premium features
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        {
          "premiumFeatures.maxMustHaves": 5,
          "premiumFeatures.maxDealBreakers": 5,
        },
        { new: true }
      );

      if (!updatedProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async registerDevice(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { pushToken, platform } = req.body;

      if (!pushToken) {
        return res.status(400).json({ error: "Push token is required" });
      }

      console.log(
        `Registering device token for user ${userId}: ${pushToken} (Platform: ${
          platform || "unknown"
        })`
      );

      // Update the user's profile with the new device token
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        {
          $set: {
            deviceToken: pushToken,
            devicePlatform: platform || "unknown",
          },
        },
        { new: true }
      );

      if (!updatedProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json({ success: true, message: "Device registered successfully" });
    } catch (error) {
      console.error("Error registering device:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
