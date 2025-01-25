const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // ili '*' za sve domene
  methods: 'GET,POST,PUT,DELETE,SELECT,INSERT',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use a connection pool for better connection management
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "student.veleri.hr",
  user: "pmocibob",
  password: "11",
  database: "pmocibob",
});

// Helper function to execute queries
const executeQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) {
        console.error("Database error:", error);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

// Routes

// Fetch all properties
app.get("/api/nekretnine", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina");
    res.json(results);
  } catch (error) {
    res.status(500).send("Error fetching properties.");
  }
});

// Fetch properties for purchase
app.get("/api/nekretnine/kupnja", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_kupnja");
    res.json(results);
  } catch (error) {
    res.status(500).send("Error fetching purchase properties.");
  }
});

// Fetch properties for rent
app.get("/api/nekretnine/najam", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_najam");
    res.json(results);
  } catch (error) {
    res.status(500).send("Error fetching rental properties.");
  }
});

// Fetch property by ID
app.get("/api/nekretnine/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const results = await executeQuery("SELECT * FROM Nekretnina WHERE id = ?", [id]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error fetching property by ID.");
  }
});

// Add a new property
app.post("/api/Opis_nekretnine", async (req, res) => {
  try {
    const { Cijena_nekretnine, Kvadratura_nekretnine } = req.body;
    const query = "INSERT INTO Nekretnina (Cijena_nekretnine, Kvadratura_nekretnine) VALUES ?";
    const values = [[Cijena_nekretnine, Kvadratura_nekretnine]];
    const results = await executeQuery(query, [values]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error adding property.");
  }
});

// Fetch agency details
app.get("/api/agencije", async (req, res) => {
  try {
    const query = "SELECT Naziv_Agencije, Adresa_Agencije, Telefon_Agencije, Email_Agencije FROM Agencija";
    const results = await executeQuery(query);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error fetching agencies.");
  }
});

// User login
app.post("/api/login", async (req, res) => {
  try {
    const { email, lozinka } = req.body;
    if (!email || !lozinka) {
      return res.status(400).send("Molimo unesite email i lozinku.");
    }

    const query =
      "SELECT Sifra_korisnika, Ime_korisnika, Email_korisnika FROM Korisnik WHERE Email_korisnika = ? AND Lozinka_korisnika = ?";
    const results = await executeQuery(query, [email, lozinka]);

    if (results.length > 0) {
      res.status(200).send({ message: "Uspješan login!", korisnik: results[0] });
    } else {
      res.status(401).send("Neispravan email ili lozinka.");
    }
  } catch (error) {
    res.status(500).send("Greška u bazi podataka.");
  }
});

// User registration
app.post("/api/registracija_korisnika", async (req, res) => {
  try {
    const { ime, prezime, email, telefon, lozinka } = req.body;
    const query =
      "INSERT INTO Korisnik (Ime_korisnika, Prezime_korisnika, Email_korisnika, Telefon_korisnika, Lozinka_korisnika) VALUES ?";
    const values = [[ime, prezime, email, telefon, lozinka]];
    const results = await executeQuery(query, [values]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error registering user.");
  }
});
app.post("/api/kontaktiraj", async (req, res) => {
  try {
    const { ime, email, telefon, poruka, agencija } = req.body;
    const query =
      "INSERT INTO Kontakt (Ime_korisnika, Email_korisnika, Telefon_korisnika, Poruka, Email_agencije) VALUES ?";
    const values = [[ime, email, telefon, poruka, agencija]];
    const results = await executeQuery(query, [values]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error sending message.");
  }
});
app.post("/api/dodaj_favorit", async (req, res) => {
  try {
    const { Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine,Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije } = req.body;
    const query =
      "INSERT INTO Favoriti (Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine,Broj_soba,Broj_kupaonica,Cijena_nekretnine,Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije) VALUES ?";
    const values = [[Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine,Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije]];
    const results = await executeQuery(query, [values]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Error sending message.");
  }
});
app.post("/api/provjeri_favorit", async (req, res) => {
  try {
    const { Sifra_korisnika, Adresa_nekretnine } = req.body;
    const query =
      "SELECT * FROM Favoriti WHERE Sifra_korisnika = ? AND Adresa_nekretnine = ?";
    const results = await executeQuery(query, [Sifra_korisnika, Adresa_nekretnine]);
    res.json({ exists: results.length > 0 });
  } catch (error) {
    console.error("Greška prilikom provjere favorita:", error);
    res.status(500).send("Došlo je do greške.");
  }
});

app.get("/api/favoriti", async (req, res) => {
  try {
    const sifraKorisnika = req.query.sifraKorisnika;
    if (!sifraKorisnika) {
      return res.status(400).send("Sifra_korisnika is required");
    }

    const results = await executeQuery("SELECT * FROM Favoriti WHERE Sifra_korisnika = ?", [sifraKorisnika]);
    res.json(results);
  } catch (error) {
    console.error("Error fetching rental properties:", error);
    res.status(500).send("Error fetching rental properties.");
  }
});
app.post("/api/izbrisi_favorit", async (req, res) => {
  try {
    const { Sifra_korisnika, Adresa_nekretnine } = req.body;

    if (!Sifra_korisnika || !Adresa_nekretnine) {
      return res.status(400).send("Sifra korisnika i adresa nekretnine su obavezni.");
    }

    const result = await executeQuery(
      "DELETE FROM Favoriti WHERE Sifra_korisnika = ? AND Adresa_nekretnine = ?",
      [Sifra_korisnika, Adresa_nekretnine]
    );

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.status(404).send("Nekretnina nije pronađena u favoritima.");
    }
  } catch (error) {
    console.error("Greška prilikom brisanja iz favorita:", error);
    res.status(500).send("Greška prilikom brisanja iz favorita.");
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at port: ${port}`);
});
