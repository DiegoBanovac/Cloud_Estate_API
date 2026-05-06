# Cloud Estate API

REST API backend for the Cloud Estate real estate platform — a web application for renting and selling properties.

## About

Cloud Estate API provides a secure backend with JWT-based authentication, property listing management, image upload support, and a test suite written with Jest and Supertest.

## Tech Stack

- Node.js
- Express.js
- MySQL
- JSON Web Tokens (JWT)
- Multer (file uploads)
- Jest + Supertest (unit and integration tests)

## Features

- User registration and login with JWT authentication
- Property listing CRUD operations
- Image upload for property photos
- Middleware-based route protection
- Unit and integration tests

## Project Structure

```
Cloud_Estate_API/
  middleware/   # Auth and error middleware
  uploads/      # Uploaded property images
  __tests__/    # Jest test suites
  app.js        # Express app setup
  server.js     # Entry point
```

## Getting Started

```bash
npm install
```

Create a `.env` file with your MySQL credentials and JWT secret, then run:

```bash
node server.js
```

## Running Tests

```bash
npm test
```

## Related

- Frontend: [Cloud Estate Mobile](https://github.com/DiegoBanovac/Cloud_Estate_Mobile)
