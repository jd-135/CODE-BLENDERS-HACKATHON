import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "nni3lrmz",
  api_key: process.env.CLOUDINARY_API_KEY || "414562875935667",
  api_secret: process.env.CLOUDINARY_API_SECRET || "quVc0Q9AB5FrKUwrN_NWkcFB-h4",
  secure: true,
});

export default cloudinary;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes: number;
  original_filename: string;
  resource_type: string;
}

/**
 * Upload buffer to Cloudinary in dedicated folder
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    filename?: string;
    mimeType?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const { folder = "scholarship_portal_docs", filename = "document", mimeType = "" } = options;

  // Detect appropriate resource type
  const isImage = mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename);
  const resourceType = isImage ? "image" : "raw";

  const publicId = isImage
    ? filename.replace(/\.[^/.]+$/, "")
    : filename.endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          original_filename: result.original_filename || filename,
          resource_type: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}
