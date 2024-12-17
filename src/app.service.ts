import * as fs from 'node:fs';
import * as readline from 'node:readline';
import * as events from 'node:events';
import { createReadStream, existsSync } from 'fs';
import * as archiver from 'archiver';
import {
  HttpException,
  HttpStatus,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { UploadDto } from './dto/upload.dto';
import {
  BREAK_LINE,
  CHUNK_DIR,
  FEMALE,
  GENDER_COLUMN_NAME,
  MALE,
  MERGED_FILE_PATH,
  NUMBER_COLUMNS,
  SEPARATOR,
} from './constants';

@Injectable()
export class AppService {
  createChunk(
    chunk: Buffer<ArrayBufferLike>,
    chunkNumber: number,
    fileName: string,
  ) {
    const chunkDir = process.cwd() + '/chunks'; // Directory to save chunks
    const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`;

    return fs.promises.writeFile(chunkFilePath, chunk);
  }

  async upload(file: Express.Multer.File, body: UploadDto): Promise<boolean> {
    const chunk = file.buffer;
    const chunkNumber = Number(body.chunkNumber);
    const totalChunks = Number(body.totalChunks);
    const fileName = body.originalname.split('.')[0];

    if (existsSync(`${MERGED_FILE_PATH}/${fileName}.csv`)) {
      throw new HttpException('File exist', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      await this.createChunk(chunk, chunkNumber, fileName);
    } catch (error) {
      throw new HttpException(
        error.toString(),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // end of operations
    if (chunkNumber === totalChunks - 1) {
      try {
        await this.mergeChunks(fileName, totalChunks);
      } catch (error) {
        throw new HttpException(
          error.toString(),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      try {
        await this.splitByGender(fileName);
      } catch (error) {
        throw new HttpException(
          error.toString(),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      try {
        await this.createArchive(fileName);
      } catch (error) {
        throw new HttpException(
          error.toString(),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      //uploading finished
      return true;
    } else {
      // uploading not finished yet
      return false;
    }
  }

  download(filename: string) {
    const zipFilesPath = process.cwd() + '/zip_files';
    const zipFilePath = `${zipFilesPath}/${filename}.zip`;
    const file = createReadStream(zipFilePath);

    return new StreamableFile(file);
  }

  async mergeChunks(fileName: string, totalChunks: number) {
    if (!fs.existsSync(MERGED_FILE_PATH)) {
      fs.mkdirSync(MERGED_FILE_PATH);
    }

    const writeStream = fs.createWriteStream(
      `${MERGED_FILE_PATH}/${fileName}.csv`,
    );

    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = `${CHUNK_DIR}/${fileName}.part_${i}`;
      const chunkBuffer = await fs.promises.readFile(chunkFilePath);

      writeStream.write(chunkBuffer);
      fs.unlinkSync(chunkFilePath);
    }

    writeStream.end();
  }

  async createArchive(fileName: string) {
    return new Promise(async (resolve, reject) => {
      const zipFilesPath = process.cwd() + '/zip_files';
      const mergedFilePath = process.cwd() + '/merged_files';
      const maleCsvName = `${mergedFilePath}/male-${fileName}.csv`;
      const femaleCsvName = `${mergedFilePath}/female-${fileName}.csv`;
      const zipFilePath = `${zipFilesPath}/${fileName}.zip`;

      if (!fs.existsSync(zipFilesPath)) {
        fs.mkdirSync(zipFilesPath);
      }

      const output = fs.createWriteStream(zipFilePath);

      const archive = archiver('zip', {
        zlib: { level: 1 },
      });

      output.on('close', function () {
        resolve(1);
      });

      output.on('end', function () {
        resolve(1);
      });

      archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
          reject('ENOENT');
        } else {
          reject(err.toString());
        }
      });

      archive.on('error', function (err) {
        reject(err.toString());
      });

      archive.pipe(output);

      archive.append(fs.createReadStream(maleCsvName), {
        name: `male-${fileName}.csv`,
      });
      archive.append(fs.createReadStream(femaleCsvName), {
        name: `female-${fileName}.csv`,
      });

      return archive.finalize();
    }).catch((err) => new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR));
  }

  getSeparator(titleHead: string) {
    for (const separator of SEPARATOR) {
      const lineSplit = titleHead.split(separator);

      if (lineSplit.length === NUMBER_COLUMNS) {
        return separator;
      }
    }

    throw new HttpException(
      'No separator found',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private async splitByGender(fileName: string) {
    const mergedFilePath = process.cwd() + '/merged_files';
    let k = 0;
    let genderColonneId = null;

    const maleWriteStream = fs.createWriteStream(
      `${mergedFilePath}/male-${fileName}.csv`,
    );
    const femaleWriteStream = fs.createWriteStream(
      `${mergedFilePath}/female-${fileName}.csv`,
    );

    const readerStream = fs.createReadStream(
      `${mergedFilePath}/${fileName}.csv`,
      {
        encoding: 'utf-8',
      },
    );

    try {
      let separator: string;
      const rl = readline.createInterface({
        input: readerStream,
        crlfDelay: Infinity,
      });

      rl.on('line', async (line) => {
        try {
          if (k === 0) {
            separator = this.getSeparator(line);
            const lineSplit = line.split(separator);
            genderColonneId = lineSplit.indexOf(GENDER_COLUMN_NAME);
            maleWriteStream.write(line + BREAK_LINE);
            femaleWriteStream.write(line + BREAK_LINE);
          } else {
            const lineSplit = line.split(separator);
            const gender = lineSplit[genderColonneId];
            if (gender === MALE) {
              maleWriteStream.write(line + BREAK_LINE);
            } else if (gender === FEMALE) {
              femaleWriteStream.write(line + BREAK_LINE);
            } else {
              throw new HttpException(
                `unknown gender line ${k}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }
          }
          k++;
        } catch (err) {
          await events.once(rl, 'close');
          throw new HttpException(
            err.toString(),
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      });

      await events.once(rl, 'close');
    } catch (err) {
      throw new HttpException(err.toString(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
