import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // --- Mulai Tambahan CORS ---
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://accountingapp.stepanusriodefa.my.id"
    ], // Izinkan request dari origin Next.js Anda
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Metode HTTP yang diizinkan
    credentials: true, // Izinkan pengiriman cookies atau authorization headers
  });
  // --- Akhir Tambahan CORS ---

  // Opsional, tapi sangat direkomendasikan: Mengakxstifkan Global Validation Pipe
  // Ini akan otomatis memvalidasi DTO di semua controller Anda
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Hapus properti yang tidak ada di DTO
    transform: true,  // Otomatis mengubah tipe data (misal string "1" menjadi number 1)
  }));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server has running at port ${process.env.PORT ?? 3000}`)
}
bootstrap();
