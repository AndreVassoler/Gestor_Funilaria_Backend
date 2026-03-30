import '../src/bootstrap-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('OrdensServico (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'e2e-jwt-secret-minimo-32-chars!!';
    process.env.AUTH_USERNAME = 'e2e_user';
    process.env.AUTH_PASSWORD = 'e2e_pass';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /ordens-servico retorna lista com JWT', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'e2e_user', password: 'e2e_pass' })
      .expect(200);

    const token = login.body.access_token as string;
    expect(token).toBeDefined();

    return request(app.getHttpServer())
      .get('/ordens-servico')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
