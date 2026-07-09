import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "البريد الإلكتروني المدخل غير صالح." })
  email!: string;

  @IsString()
  @MinLength(6, { message: "يجب أن لا تقل كلمة المرور عن 6 أحرف." })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: "الاسم الأول مطلوب." })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: "اسم العائلة مطلوب." })
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "رقم الجوال مطلوب." })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "المسمى الوظيفي مطلوب." })
  roleName!: string;
}
