import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configure Multer to save files in the "uploads" folder with unique names
const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Return the relative URL. 
    // The frontend will prepend the backend URL (e.g. http://localhost:4000) if needed.
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      mimetype: file.mimetype,
    };
  }
}