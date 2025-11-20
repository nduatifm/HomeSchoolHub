import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(file: Express.Multer.File, folder: string = 'uploads') {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
      public_id: `${Date.now()}_${file.originalname}`,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function uploadBufferToCloudinary(buffer: Buffer, filename: string, folder: string = 'uploads') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        public_id: `${Date.now()}_${filename}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            url: result?.secure_url,
            publicId: result?.public_id,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === 'ok' };
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return { success: false, error: error.message };
  }
}

export default cloudinary;
