import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file'); // TinyMCE sends the file with the name 'file'

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Create a unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: `lab-images/${uniqueFileName}`, // Store images in a 'lab-images' folder
      Body: buffer,
      ContentType: file.type, // Set the content type
      ACL: ObjectCannedACL.public_read, // Use the correct enum value
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct the public URL (adjust if you are using a custom domain or different S3 configuration)
    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;

    // TinyMCE expects a JSON response with the location of the uploaded file
    return NextResponse.json({ location: publicUrl });

  } catch (error) {
    console.error('Error uploading image to S3:', error);
    return NextResponse.json(
      { error: 'Failed to upload image to S3' },
      { status: 500 }
    );
  }
} 