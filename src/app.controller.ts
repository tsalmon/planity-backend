import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'node:fs';
import { Response } from 'express';
import { UploadDto } from './dto/upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDto,
    @Res() res: Response,
  ) {
    const chunk = file.buffer;
    const chunkNumber = Number(body.chunkNumber); // Sent from the client
    const totalChunks = Number(body.totalChunks); // Sent from the client
    const fileName = body.originalname;

    const chunkDir = __dirname + '/../chunks'; // Directory to save chunks

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir);
    }

    const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`;

    try {
      await fs.promises.writeFile(chunkFilePath, chunk);

      if (chunkNumber === totalChunks - 1) {
        // If this is the last chunk, merge all chunks into a single file
        await this.appService.mergeChunks(fileName, totalChunks);
        res.status(200).json({ message: 'File merged successfully' });
      }

      res.status(200).json({ message: 'Chunk uploaded successfully' });
    } catch (error) {
      console.error('Error saving chunk:', error);
      res.status(500).json({ error: 'Error saving chunk' });
    }
  }
}
