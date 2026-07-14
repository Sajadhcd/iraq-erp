import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'يجب أن لا تقل كلمة المرور عن 6 أحرف.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم واحد على الأقل.',
  })
  password!: string;

  @IsString()
  @MinLength(2, { message: 'يجب أن لا يقل الاسم عن 2 أحرف.' })
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
