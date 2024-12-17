import {
  Body,
  Controller,
  Get, Header,
  Param,
  Post, Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { AppService } from './app.service';
import { UploadDto } from './dto/upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from "fs";
import { join } from "path";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('download/:filename')
  @Header('content-type', 'application/CSV')
  download(@Param('filename') filename: string) {
    return this.appService.download(filename);
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDto,
  ) {
    return this.appService.upload(file, uploadDto).then((finish) => {
      return { finish };
    });
  }
}
