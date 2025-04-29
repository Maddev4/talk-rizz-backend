import AWS from "aws-sdk";
import { UploadedFile } from "express-fileupload";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET || "rizz-user-avatar";

export const checkS3Connection = async (): Promise<boolean> => {
  try {
    await s3.listBuckets().promise();
    console.log("Successfully connected to S3");
    return true;
  } catch (error) {
    console.error("Failed to connect to S3:", error);
    return false;
  }
};

// Verify connection on startup
checkS3Connection().catch((error) => {
  console.error("Error checking S3 connection:", error);
  process.exit(1); // Exit if we can't connect to S3
});

export const uploadToS3 = async (
  file: UploadedFile,
  path: string
): Promise<string> => {
  const fileExtension = file.name.split(".").pop();
  const fileName = `${path}/${uuidv4()}.${fileExtension}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.data,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file");
  }
};
