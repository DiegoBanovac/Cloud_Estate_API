const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Load environment variables from .env file
require('dotenv').config(); // Add this line at the very top

// Import the auth middleware
const auth = require('./middleware/auth'); // Add this line

const app = express();

app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let mainCategoryFolder = 'default';
    const tipNekretnine = req.body.Tip_nekretnine;

    if (tipNekretnine === "Stan" || tipNekretnine === "Kuća") {
      mainCategoryFolder = "kupnja";
    } else if (tipNekretnine === "Najam stana" || tipNekretnine === "Najam kuće") {
      mainCategoryFolder = "najam";
    }

    const uploadPath = path.join(__dirname, 'uploads', mainCategoryFolder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "student.veleri.hr",
  user: "pmocibob",
  password: "11",
  database: "pmocibob",
});

const executeQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });

// Rute

app.get("/api/nekretnine", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina.");
  }
});

app.get("/api/nekretnine/kupnja", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_kupnja");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina za kupnju.");
  }
});

app.get("/api/nekretnine/najam", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_najam");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina za najam.");
  }
});

app.get("/api/nekretnine/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const results = await executeQuery("SELECT * FROM Nekretnina WHERE id = ?", [id]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnine po ID-u.");
  }
});

app.post("/api/Opis_nekretnine", async (req, res) => {
  try {
    const { Cijena_nekretnine, Kvadratura_nekretnine } = req.body;
    const query = "INSERT INTO Nekretnina (Cijena_nekretnine, Kvadratura_nekretnine) VALUES (?)";
    const values = [Cijena_nekretnine, Kvadratura_nekretnine];
    const results = await executeQuery(query, values);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dodavanja opisa nekretnine.");
  }
});

app.get("/api/agencije", async (req, res) => {
  try {
    const query = "SELECT Naziv_Agencije, Adresa_Agencije, Telefon_Agencije, Email_Agencije FROM Agencija";
    const results = await executeQuery(query);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja agencija.");
  }
});

// Login korisnika
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
      const korisnik = results[0];
      // Generate JWT
      const token = jwt.sign(
        { sifraKorisnika: korisnik.Sifra_korisnika, email: korisnik.Email_korisnika },
        process.env.JWT_SECRET_KEY, // Use the secret key from environment variables
        { expiresIn: '1h' } // Token expires in 1 hour
      );
      res.status(200).send({ message: "Uspješan login!", korisnik: korisnik, token: token }); // Send token in response
    } else {
      res.status(401).send("Neispravan email ili lozinka.");
    }
  } catch (error) {
    res.status(500).send("Greška u bazi podataka.");
  }
});

// Login agencije
app.post("/api/login_agencija", async (req, res) => {
  try {
    const { email, lozinka } = req.body;
    console.log("Primljeno:", email, lozinka);

    if (!email || !lozinka) {
      return res.status(400).send("Molimo unesite email i lozinku.");
    }

    const query =
      "SELECT Sifra_agencije, Naziv_agencije, Email_agencije, Lozinka_agencije FROM Agencija WHERE Email_agencije = ? AND Lozinka_agencije = ?";
    const results = await executeQuery(query, [email, lozinka]);

    console.log("Rezultati upita:", results);

    if (results.length > 0) {
      const agencija = results[0]; // Dohvati podatke agencije
      // Generiraj JWT za agenciju
      const token = jwt.sign(
        { sifraAgencije: agencija.Sifra_agencije, email: agencija.Email_agencije, tip: 'agencija' }, // Dodajte 'tip' ako želite razlikovati korisnike i agencije
        process.env.JWT_SECRET_KEY, // Koristi isti tajni ključ
        { expiresIn: '1h' } // Token ističe za 1 sat
      );
      res.status(200).send({ message: "Uspješan login!", korisnik: agencija, token: token }); // Pošalji token u odgovoru
    } else {
      res.status(401).send("Neispravan email ili lozinka.");
    }
  } catch (error) {
    console.error("Greška u login agencije:", error);
    res.status(500).send("Greška u bazi podataka.");
  }
});

app.post("/api/registracija_korisnika", async (req, res) => {
  try {
    const { ime, prezime, email, telefon, lozinka } = req.body;
    
    const query = "INSERT INTO Korisnik (Ime_korisnika, Prezime_korisnika, Email_korisnika, Telefon_korisnika, Lozinka_korisnika) VALUES (?, ?, ?, ?, ?)";
    const values = [ime, prezime, email, telefon, lozinka];

    const results = await executeQuery(query, values);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom registracije korisnika.");
  }
});

app.post("/api/kontaktiraj", async (req, res) => {
  try {
    const { ime, email, telefon, poruka, agencija } = req.body;
    const query =
      "INSERT INTO Kontakt (Ime_korisnika, Email_korisnika, Telefon_korisnika, Poruka, Email_agencije) VALUES (?, ?, ?, ?, ?)";
    const values = [ime, email, telefon, poruka, agencija];
    const results = await executeQuery(query, values);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom slanja poruke.");
  }
});

// Apply the authentication middleware to the dodaj_favorit route
app.post("/api/dodaj_favorit", auth, async (req, res) => { // Added 'auth' middleware here
  try {
    // req.user will contain the decoded token payload (sifraKorisnika, email)
    // You might want to use req.user.sifraKorisnika here instead of relying on client-provided Sifra_korisnika
    // to ensure the user adding the favorite is the one logged in.
    const Sifra_korisnika_from_token = req.user.sifraKorisnika; 

    const { Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije,Tip_nekretnine_2 } = req.body;
    
    // Use Sifra_korisnika_from_token instead of req.body.Sifra_korisnika for security
    const query =
      "INSERT INTO Favoriti (Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije, Tip_nekretnine_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [Sifra_korisnika_from_token, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije,Tip_nekretnine_2];
    
    const results = await executeQuery(query, values);
    res.json(results);
  } catch (error) {
    console.error("Greška prilikom dodavanja favorita:", error);
    res.status(500).send("Greška prilikom dodavanja favorita.");
  }
});

// Apply the authentication middleware to the provjeri_favorit route as well
app.post("/api/provjeri_favorit", auth, async (req, res) => { // Added 'auth' middleware here
  try {
    const Sifra_korisnika_from_token = req.user.sifraKorisnika;
    const { Adresa_nekretnine } = req.body;
    const query = "SELECT * FROM Favoriti WHERE Sifra_korisnika = ? AND Adresa_nekretnine = ?";
    const results = await executeQuery(query, [Sifra_korisnika_from_token, Adresa_nekretnine]);
    res.json({ exists: results.length > 0 });
  } catch (error) {
    console.error("Greška prilikom provjere favorita:", error); // Added logging
    res.status(500).send("Došlo je do greške prilikom provjere favorita.");
  }
});

// Apply the authentication middleware to the favoriti route
app.get("/api/favoriti", auth, async (req, res) => { // Added 'auth' middleware here
  try {
    // Use sifraKorisnika from the token, not from req.query
    const sifraKorisnika = req.user.sifraKorisnika; 
    
    const results = await executeQuery("SELECT * FROM Favoriti WHERE Sifra_korisnika = ?", [sifraKorisnika]);
    res.json(results);
  } catch (error) {
    console.error("Greška prilikom dohvaćanja favorita:", error); // Added logging
    res.status(500).send("Greška prilikom dohvaćanja favorita.");
  }
});

// Apply the authentication middleware to the izbrisi_favorit route
app.post("/api/izbrisi_favorit", auth, async (req, res) => { // Added 'auth' middleware here
  try {
    const Sifra_korisnika_from_token = req.user.sifraKorisnika;
    const { Adresa_nekretnine } = req.body;

    if (!Sifra_korisnika_from_token || !Adresa_nekretnine) {
      return res.status(400).send("Sifra korisnika i adresa nekretnine su obavezni.");
    }

    const result = await executeQuery(
      "DELETE FROM Favoriti WHERE Sifra_korisnika = ? AND Adresa_nekretnine = ?",
      [Sifra_korisnika_from_token, Adresa_nekretnine]
    );

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.status(404).send("Nekretnina nije pronađena u favoritima.");
    }
  } catch (error) {
    console.error("Greška prilikom brisanja iz favorita:", error); // Added logging
    res.status(500).send("Greška prilikom brisanja iz favorita.");
  }
});

app.get("/api/nekretnine_agencija", auth, async (req, res) => { // Dodan 'auth' middleware
  try {
    // PREPORUKA: NE KORISTITI req.query.Email_agencije jer se može manipulirati.
    // const Email_agencije = req.query.Email_agencije; // Ovu liniju sada IGNORIRATE

    // EMAIL AGENCIJE SE DOHVAĆA IZ JWT PAYLOAD-a
    // 'req.user' je objekt koji je 'auth' middleware dodao, a sadrži dekodirani payload tokena.
    const Email_agencije = req.user.email; // Sigurno dohvatiti email iz tokena

    if (!Email_agencije) {
      // Ova provjera je sigurnosna mjera, iako ako je token validan i dobro generiran,
      // email bi uvijek trebao biti prisutan.
      return res.status(400).send("Email agencije nije pronađen u autorizacijskom tokenu.");
    }

    const query = `
      SELECT *, 'kupnja' AS Tip_nekretnine_2 FROM Nekretnina_kupnja WHERE Email_agencije = ?
      UNION ALL
      SELECT *, 'najam' AS Tip_nekretnine_2 FROM Nekretnina_najam WHERE Email_agencije = ?
    `;

    const results = await executeQuery(query, [Email_agencije, Email_agencije]);
    res.json(results);
  } catch (error) {
    console.error("Greška pri dohvaćanju nekretnina agencije:", error);
    res.status(500).send("Došlo je do pogreške prilikom dohvaćanja nekretnina agencije.");
  }
});

// AŽURIRANJE NEKRETNINE - SADA ZAŠTIĆENO TOKENOM
app.put("/api/nekretnine/:sifra_nekretnine", auth, async (req, res) => { // DODANO: auth middleware
  try {
    // Dohvaća email agencije iz tokena za autorizaciju
    const Email_agencije_from_token = req.user.email;
    if (!Email_agencije_from_token) {
        return res.status(403).send("Niste ovlašteni za ažuriranje nekretnina.");
    }

    const sifra_nekretnine = Number(req.params.sifra_nekretnine);
    const {
      Tip_nekretnine,
      Adresa_nekretnine,
      Opis_nekretnine,
      Broj_soba,
      Broj_kupaonica,
      Kvadratura_nekretnine,
      Cijena_nekretnine,
      // Nema potrebe za Email_agencije u req.body, koristimo iz tokena
    } = req.body;

    let tableName;
    if (Tip_nekretnine === "Stan" || Tip_nekretnine === "Kuća") {
      tableName = "Nekretnina_kupnja";
    } else if (Tip_nekretnine === "Najam stana" || Tip_nekretnine === "Najam kuće") {
      tableName = "Nekretnina_najam";
    } else {
      return res.status(400).send("Nevažeći Tip_nekretnine je pružen. Nije moguće odrediti ciljnu tablicu.");
    }

    // Dodatna provjera: Provjeri pripada li nekretnina agenciji koja je prijavljena
    const checkOwnershipQuery = `SELECT Email_agencije FROM ${tableName} WHERE Sifra_nekretnine = ?`;
    const ownershipResults = await executeQuery(checkOwnershipQuery, [sifra_nekretnine]);

    if (ownershipResults.length === 0 || ownershipResults[0].Email_agencije !== Email_agencije_from_token) {
        return res.status(403).send("Niste ovlašteni ažurirati ovu nekretninu.");
    }

    const query = `
      UPDATE ${tableName}
      SET
        Tip_nekretnine = ?,
        Adresa_nekretnine = ?,
        Opis_nekretnine = ?,
        Broj_soba = ?,
        Broj_kupaonica = ?,
        Kvadratura_nekretnine = ?,
        Cijena_nekretnine = ?
      WHERE Sifra_nekretnine = ? AND Email_agencije = ? -- Dodana provjera Email_agencije za sigurnost
    `;

    const params = [
      Tip_nekretnine,
      Adresa_nekretnine,
      Opis_nekretnine,
      Broj_soba,
      Broj_kupaonica,
      Kvadratura_nekretnine,
      Cijena_nekretnine,
      sifra_nekretnine,
      Email_agencije_from_token // Koristimo email iz tokena
    ];

    const results = await executeQuery(query, params);

    if (results.affectedRows > 0) {
      res.json({ success: true, message: "Nekretnina uspješno ažurirana." });
    } else {
      res.status(404).send("Nekretnina nije pronađena ili podaci nisu promijenjeni.");
    }
  } catch (error) {
    console.error("Greška prilikom ažuriranja nekretnine:", error);
    res.status(500).send("Došlo je do pogreške prilikom ažuriranja nekretnine.");
  }
});

// DODAVANJE NEKRETNINE - SADA ZAŠTIĆENO TOKENOM
app.post("/api/dodaj_nekretninu", auth, upload.fields([ // DODANO: auth middleware
  { name: 'Slika_nekretnine', maxCount: 1 },
  { name: 'Slika_nekretnine_2', maxCount: 1 },
  { name: 'Slika_nekretnine_3', maxCount: 1 }
]), async (req, res) => {
  try {
    // Email_agencije se dohvaća iz JWT tokena (req.user.email)
    const Email_agencije_from_token = req.user.email; // Dohvaća email agencije iz dekodiranog tokena
    if (!Email_agencije_from_token) {
        return res.status(403).send("Niste ovlašteni za dodavanje nekretnina.");
    }

    const {
      Tip_nekretnine,
      Adresa_nekretnine,
      Opis_nekretnine,
      Broj_soba,
      Broj_kupaonica,
      Kvadratura_nekretnine,
      Cijena_nekretnine,
      // Nema potrebe za Email_agencije u req.body, koristimo iz tokena
    } = req.body;

    let Tip_nekretnine_2 = '';
    let tableName = '';

    if (Tip_nekretnine === "Stan") {
        Tip_nekretnine_2 = "stanovi";
        tableName = "Nekretnina_kupnja";
    } else if (Tip_nekretnine === "Kuća") {
        Tip_nekretnine_2 = "kuce";
        tableName = "Nekretnina_kupnja";
    } else if (Tip_nekretnine === "Najam stana") {
        Tip_nekretnine_2 = "najam_stanovi";
        tableName = "Nekretnina_najam";
    } else if (Tip_nekretnine === "Najam kuće") {
        Tip_nekretnine_2 = "najam_kuce";
        tableName = "Nekretnina_najam";
    } else {
        return res.status(400).send("Nevažeći Tip_nekretnine je pružen. Nije moguće dodati nekretninu.");
    }

    const Sifra_nekretnine = Date.now().toString() + Math.floor(Math.random() * 1000).toString(); 

    const Slika_nekretnine = req.files['Slika_nekretnine'] ? req.files['Slika_nekretnine'][0].originalname : null;
    const Slika_nekretnine_2 = req.files['Slika_nekretnine_2'] ? req.files['Slika_nekretnine_2'][0].originalname : null;
    const Slika_nekretnine_3 = req.files['Slika_nekretnine_3'] ? req.files['Slika_nekretnine_3'][0].originalname : null;

    const query = `
      INSERT INTO ${tableName} (
        Sifra_nekretnine, Tip_nekretnine, Adresa_nekretnine, Opis_nekretnine,
        Broj_soba, Broj_kupaonica, Kvadratura_nekretnine, Cijena_nekretnine,
        Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije, Tip_nekretnine_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Sifra_nekretnine, Tip_nekretnine, Adresa_nekretnine, Opis_nekretnine,
      Broj_soba, Broj_kupaonica, Kvadratura_nekretnine, Cijena_nekretnine,
      Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije_from_token, Tip_nekretnine_2 // Koristimo email iz tokena
    ];

    const results = await executeQuery(query, values);

    if (results.affectedRows > 0) {
      res.json({ success: true, message: "Nekretnina uspješno dodana!", Sifra_nekretnine: Sifra_nekretnine });
    } else {
      res.status(500).send("Nekretnina nije dodana.");
    }
  } catch (error) {
    console.error("Greška prilikom dodavanja nekretnine:", error);
    res.status(500).send("Došlo je do pogreške prilikom dodavanja nekretnine.");
  }
});


// BRISANJE NEKRETNINE - SADA ZAŠTIĆENO TOKENOM
app.delete("/api/nekretnine/:sifra_nekretnine", auth, async (req, res) => { // DODANO: auth middleware
  try {
    // Dohvaća email agencije iz tokena za autorizaciju
    const Email_agencije_from_token = req.user.email;
    if (!Email_agencije_from_token) {
        return res.status(403).send("Niste ovlašteni za brisanje nekretnina.");
    }

    const sifra_nekretnine = Number(req.params.sifra_nekretnine);
    const { Tip_nekretnine } = req.body; // Tip_nekretnine je još uvijek potreban za određivanje tablice/foldera

    console.log("--- DELETE request received ---");
    console.log("Sifra_nekretnine (iz URL-a):", sifra_nekretnine, typeof sifra_nekretnine);
    console.log("Tip_nekretnine (iz tijela zahtjeva):", Tip_nekretnine, typeof Tip_nekretnine);

    let tableName;
    let typeFolder = '';
    if (Tip_nekretnine === "Stan" || Tip_nekretnine === "Kuća") {
        tableName = "Nekretnina_kupnja";
        typeFolder = "kupnja";
    } else if (Tip_nekretnine === "Najam stana" || Tip_nekretnine === "Najam kuće") {
        tableName = "Nekretnina_najam";
        typeFolder = "najam";
    } else {
        console.error("Greška: Nevažeći Tip_nekretnine je primljen. Nije moguće odrediti ciljnu tablicu za brisanje:", Tip_nekretnine);
        return res.status(400).send("Nevažeći Tip_nekretnine je pružen. Nije moguće odrediti ciljnu tablicu za brisanje.");
    }

    console.log("Određena tablica za brisanje:", tableName);
    console.log("Određena mapa za brisanje slika:", typeFolder);

    // Provjera vlasništva prije brisanja
    const checkOwnershipQuery = `SELECT Email_agencije, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3 FROM ${tableName} WHERE Sifra_nekretnine = ?`;
    const imageResults = await executeQuery(checkOwnershipQuery, [sifra_nekretnine]);
    
    if (imageResults.length === 0 || imageResults[0].Email_agencije !== Email_agencije_from_token) {
        return res.status(403).send("Niste ovlašteni obrisati ovu nekretninu.");
    }
    
    console.log("Rezultati dohvaćanja slika iz baze (i vlasništva):", imageResults);

    const deleteQuery = `DELETE FROM ${tableName} WHERE Sifra_nekretnine = ? AND Email_agencije = ?`; // Dodana provjera Email_agencije za sigurnost
    const results = await executeQuery(deleteQuery, [sifra_nekretnine, Email_agencije_from_token]); // Koristimo email iz tokena
    
    console.log("Rezultati brisanja iz baze (affectedRows):", results.affectedRows);

    if (results.affectedRows > 0) {
      if (imageResults.length > 0) {
        const imagesToDelete = [
          imageResults[0].Slika_nekretnine,
          imageResults[0].Slika_nekretnine_2,
          imageResults[0].Slika_nekretnine_3
        ].filter(Boolean);

        console.log("Slike za brisanje s diska:", imagesToDelete);

        imagesToDelete.forEach(imageName => {
          const imagePath = path.join(__dirname, 'uploads', typeFolder, imageName);
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error(`Greška pri brisanju datoteke ${imageName}:`, err);
            } else {
              console.log(`Datoteka ${imageName} uspješno obrisana.`);
            }
          });
        });
      }

      res.json({ success: true, message: "Nekretnina uspješno obrisana." });
    } else {
      console.log("Nekretnina nije pronađena u tablici:", tableName, "sa Sifra_nekretnine:", sifra_nekretnine);
      res.status(404).send("Nekretnina nije pronađena.");
    }
  } catch (error) {
    console.error("Greška prilikom brisanja nekretnine:", error);
    res.status(500).send("Došlo je do pogreške prilikom brisanja nekretnine.");
  }
});


module.exports = app;