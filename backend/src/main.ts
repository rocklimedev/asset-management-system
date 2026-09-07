import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================
  // CORS
  // ============================
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : [
          "http://localhost:3000",
          "http://localhost:5173",
          "https://rocklime-asset-manager.vercel.app",
        ],

    credentials: true,

    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
  });

  // ============================
  // GLOBAL API PREFIX
  // ============================
  app.setGlobalPrefix("api");

  // ============================
  // VALIDATION
  // ============================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ============================
  // START SERVER
  // ============================
  const port = Number(process.env.PORT || 4000);

  await app.listen(port);

  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
