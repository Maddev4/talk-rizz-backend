import AWS from "aws-sdk";
import { UploadedFile } from "express-fileupload";
import { v4 as uuidv4 } from "uuid";

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET || "talk-rizz-uploads";

console.log("BUCKET_NAME", BUCKET_NAME);
console.log("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY);
console.log("AWS_REGION", process.env.AWS_REGION);

console.log("s3", s3);

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
