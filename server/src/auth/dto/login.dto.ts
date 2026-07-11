import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'البريد الإلكتروني أو اسم المستخدم المدخل غير صالح.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'يجب أن لا تقل كلمة المرور عن 6 أحرف.' })
  password!: string;
}
