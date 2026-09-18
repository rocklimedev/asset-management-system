import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================
  // CORS
  // ============================
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://rocklime-asset-manager.vercel.app",
    "https://itos.spsyndicate.net",
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (Postman, curl, server-to-server, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"), false);
    },

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

  console.log(`API running on port ${port}`);
}

bootstrap();
