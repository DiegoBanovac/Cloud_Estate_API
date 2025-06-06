const request = require('supertest');
const app = require('../app');

describe('API test', () => {

  it('GET /api/nekretnine should return all properties', async () => {
    const res = await request(app).get('/api/nekretnine');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/login with invalid data should return 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: '', lozinka: '' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/login_agencija with invalid data should return 400', async () => {
    const res = await request(app)
      .post('/api/login_agencija')
      .send({ email: '', lozinka: '' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/agencije should return list of agencies', async () => {
    const res = await request(app).get('/api/agencije');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/nekretnine/kupnja returns properties for purchase', async () => {
    const res = await request(app).get('/api/nekretnine/kupnja');
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/nekretnine/najam returns rental properties', async () => {
    const res = await request(app).get('/api/nekretnine/najam');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/registracija_korisnika returns 200 with valid data', async () => {
    const random = Math.floor(Math.random() * 1000000); // svaki put novi email
    const res = await request(app).post('/api/registracija_korisnika').send({
    ime: 'Test',
    prezime: 'User',
    email: `test${random}@mail.com`,
    telefon: '123456789',
    lozinka: 'lozinka'
    });
    expect(res.statusCode).toBe(200);
  });

});
