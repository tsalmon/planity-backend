import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async mergeChunks(fileName, totalChunks) {
    const chunkDir = __dirname + '/../chunks';
    const mergedFilePath = __dirname + '/../merged_files';

    if (!fs.existsSync(mergedFilePath)) {
      fs.mkdirSync(mergedFilePath);
    }

    const writeStream = fs.createWriteStream(`${mergedFilePath}/${fileName}`);
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = `${chunkDir}/${fileName}.part_${i}`;
      const chunkBuffer = await fs.promises.readFile(chunkFilePath);
      writeStream.write(chunkBuffer);
      fs.unlinkSync(chunkFilePath); // Delete the individual chunk file after merging
    }

    writeStream.end();
    console.log('Chunks merged successfully');
  }
}
