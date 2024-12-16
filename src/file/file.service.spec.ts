import { Test, TestingModule } from '@nestjs/testing';
import { FileuploadService } from './file.service';

describe('FileuploadService', () => {
  let service: FileuploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileuploadService],
    }).compile();

    service = module.get<FileuploadService>(FileuploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
