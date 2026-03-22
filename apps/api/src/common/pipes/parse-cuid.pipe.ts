import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const CUID_REGEX = /^c[a-z0-9]{24}$/;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!CUID_REGEX.test(value)) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
