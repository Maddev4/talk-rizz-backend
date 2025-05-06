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
      const profileData: UserProfile = req.body;

      // Handle profile picture upload if provided
      if (req.files?.profilePicture) {
        const file = req.files.profilePicture;
        // Check if it's an array and take the first file if it is
        const singleFile = Array.isArray(file) ? file[0] : file;
        const imageUrl = await uploadToS3(
          singleFile,
          `profile-pictures/${userId}`
        );
        profileData.basicProfile.profilePicture = imageUrl;
      }

      // Update or create profile
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        { ...profileData, userId },
        { new: true, upsert: true }
      );

      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getOtherProfiles(req: AuthenticatedRequest, res: Response) {
    try {
      console.log("getOtherProfiles");
      const userId = req.user?.id;
      console.log("Searching for other profiles for userId", userId);
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
}
