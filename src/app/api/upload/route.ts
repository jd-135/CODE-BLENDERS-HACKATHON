import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || "DOCUMENT";
    const studentId = (formData.get("studentId") as string) || "std-2026-9012";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique sanitized filename
    const sanitizedOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFilename = `${studentId}_${Date.now()}_${sanitizedOriginal}`;

    // Upload to dedicated folder so it never collides with user's other website
    const result = await uploadBufferToCloudinary(buffer, {
      folder: "scholarship_portal_docs",
      filename: uniqueFilename,
      mimeType: file.type,
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    });
  } catch (error: any) {
    console.error("Cloudinary upload API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to upload document to Cloudinary",
      },
      { status: 500 }
    );
  }
}
