const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const multer = require("multer"); // Importirajte multer
const path = require("path"); // Importirajte path modul
const fs = require('fs'); // Importirajte fs modul za brisanje datoteka

const app = express();

// Omogućite CORS za sve domene
app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE',
  credentials: true
}));

// Parsiranje JSON i URL-kodiranih podataka (za obične POST zahtjeve bez datoteka)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Postavite statični direktorij za slike.
// Ovo pretpostavlja da će slike biti spremljene u 'uploads' folderu unutar vašeg Node.js projekta.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Konfiguracija Multer za pohranu datoteka
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let mainCategoryFolder = 'default'; // Ovo će biti 'kupnja' ili 'najam'
    // Odredite glavni folder na temelju Tip_nekretnine
    const tipNekretnine = req.body.Tip_nekretnine;

    if (tipNekretnine === "Stan" || tipNekretnine === "Kuća") {
      mainCategoryFolder = "kupnja";
    } else if (tipNekretnine === "Najam stana" || tipNekretnine === "Najam kuće") {
      mainCategoryFolder = "najam";
    }

    const uploadPath = path.join(__dirname, 'uploads', mainCategoryFolder);

    // Kreirajte direktorij ako ne postoji
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Koristi originalni naziv datoteke
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Konfiguracija MySQL Poola
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "student.veleri.hr",
  user: "pmocibob",
  password: "11",
  database: "pmocibob",
});

// Pomoćna funkcija za izvršavanje SQL upita
const executeQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });

// Rute

// Dohvaćanje svih nekretnina (općenito)
app.get("/api/nekretnine", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina.");
  }
});

// Dohvaćanje nekretnina za kupnju
app.get("/api/nekretnine/kupnja", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_kupnja");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina za kupnju.");
  }
});

// Dohvaćanje nekretnina za najam
app.get("/api/nekretnine/najam", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM Nekretnina_najam");
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnina za najam.");
  }
});

// Dohvaćanje nekretnine po ID-u
app.get("/api/nekretnine/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const results = await executeQuery("SELECT * FROM Nekretnina WHERE id = ?", [id]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja nekretnine po ID-u.");
  }
});

// Dodavanje opisa nekretnine (ova ruta se čini redundantnom ili je zastarjela, preporučam je ukloniti)
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

// Dohvaćanje agencija
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
      res.status(200).send({ message: "Uspješan login!", korisnik: results[0] });
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
      res.status(200).send({ message: "Uspješan login!", korisnik: results[0] });
    } else {
      res.status(401).send("Neispravan email ili lozinka.");
    }
  } catch (error) {
    console.error("Greška u login agencije:", error);
    res.status(500).send("Greška u bazi podataka.");
  }
});

// Registracija korisnika
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

// Kontakt poruka
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

// Dodavanje favorita
app.post("/api/dodaj_favorit", async (req, res) => {
  try {
    const { Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije,Tip_nekretnine_2 } = req.body;
    const query =
      "INSERT INTO Favoriti (Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije, Tip_nekretnine_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [Sifra_korisnika, Adresa_nekretnine, Kvadratura_nekretnine, Broj_soba, Broj_kupaonica, Cijena_nekretnine, Opis_nekretnine, Tip_nekretnine, Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije,Tip_nekretnine_2];
    const results = await executeQuery(query, values);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dodavanja favorita.");
  }
});

// Provjera favorita
app.post("/api/provjeri_favorit", async (req, res) => {
  try {
    const { Sifra_korisnika, Adresa_nekretnine } = req.body;
    const query = "SELECT * FROM Favoriti WHERE Sifra_korisnika = ? AND Adresa_nekretnine = ?";
    const results = await executeQuery(query, [Sifra_korisnika, Adresa_nekretnine]);
    res.json({ exists: results.length > 0 });
  } catch (error) {
    res.status(500).send("Došlo je do greške prilikom provjere favorita.");
  }
});

// Dohvaćanje favorita
app.get("/api/favoriti", async (req, res) => {
  try {
    const sifraKorisnika = req.query.sifraKorisnika;
    if (!sifraKorisnika) {
      return res.status(400).send("Sifra_korisnika je obavezna.");
    }

    const results = await executeQuery("SELECT * FROM Favoriti WHERE Sifra_korisnika = ?", [sifraKorisnika]);
    res.json(results);
  } catch (error) {
    res.status(500).send("Greška prilikom dohvaćanja favorita.");
  }
});

// Brisanje favorita
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
    res.status(500).send("Greška prilikom brisanja iz favorita.");
  }
});

// Dohvaćanje nekretnina za agenciju (uključuje i kupnju i najam)
app.get("/api/nekretnine_agencija", async (req, res) => {
  try {
    const Email_agencije = req.query.Email_agencije;

    if (!Email_agencije) {
      return res.status(400).send("Email_agencije je obavezan.");
    }

    const query = `
      SELECT *, 'kupnja' AS Tip_nekretnine_2 FROM Nekretnina_kupnja WHERE Email_agencije = ?
      UNION ALL
      SELECT *, 'najam' AS Tip_nekretnine_2 FROM Nekretnina_najam WHERE Email_agencije = ?
    `;

    const results = await executeQuery(query, [Email_agencije, Email_agencije]);
    res.json(results);
  } catch (error) {
    console.error("Greška pri dohvaćanju nekretnina:", error);
    res.status(500).send("Došlo je do pogreške prilikom dohvaćanja nekretnina.");
  }
});

app.put("/api/nekretnine/:sifra_nekretnine", async (req, res) => {
  try {
    const sifra_nekretnine = Number(req.params.sifra_nekretnine); // Convert to Number
    const {
      Tip_nekretnine,
      Adresa_nekretnine,
      Opis_nekretnine,
      Broj_soba,
      Broj_kupaonica,
      Kvadratura_nekretnine,
      Cijena_nekretnine,
    } = req.body;

    let tableName;
    if (Tip_nekretnine === "Stan" || Tip_nekretnine === "Kuća") {
      tableName = "Nekretnina_kupnja";
    } else if (Tip_nekretnine === "Najam stana" || Tip_nekretnine === "Najam kuće") {
      tableName = "Nekretnina_najam";
    } else {
      return res.status(400).send("Nevažeći Tip_nekretnine je pružen. Nije moguće odrediti ciljnu tablicu.");
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
      WHERE Sifra_nekretnine = ?
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

app.post("/api/dodaj_nekretninu", upload.fields([
  { name: 'Slika_nekretnine', maxCount: 1 },
  { name: 'Slika_nekretnine_2', maxCount: 1 },
  { name: 'Slika_nekretnine_3', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      Tip_nekretnine,
      Adresa_nekretnine,
      Opis_nekretnine,
      Broj_soba,
      Broj_kupaonica,
      Kvadratura_nekretnine,
      Cijena_nekretnine,
      Email_agencije
    } = req.body;

    let Tip_nekretnine_2 = ''; // This will store 'stanovi', 'kuce', 'najam_stanovi', 'najam_kuce' for DB
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

    // Generirajte jedinstvenu Sifra_nekretnine kao BIGINT
    // Koristite cijeli timestamp kao string, jer MySQL će ga automatski konvertirati u BIGINT.
    const Sifra_nekretnine = Date.now().toString() + Math.floor(Math.random() * 1000).toString(); 

    // Multer je već spremio datoteke s originalnim imenom, samo dohvaćamo ta imena
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
      Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3, Email_agencije, Tip_nekretnine_2
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


app.delete("/api/nekretnine/:sifra_nekretnine", async (req, res) => {
  try {
    // Konvertirajte sifra_nekretnine u Number, jer se iz URL-a dobiva kao string
    const sifra_nekretnine = Number(req.params.sifra_nekretnine); 
    const { Tip_nekretnine } = req.body; // Dohvaćamo Tip_nekretnine iz tijela zahtjeva

    // LOGIRANJE: Provjerite što je primljeno
    console.log("--- DELETE request received ---");
    console.log("Sifra_nekretnine (iz URL-a):", sifra_nekretnine, typeof sifra_nekretnine);
    console.log("Tip_nekretnine (iz tijela zahtjeva):", Tip_nekretnine, typeof Tip_nekretnine);

    let tableName;
    let typeFolder = ''; // Za brisanje slika s diska, koristimo main category folder
    if (Tip_nekretnine === "Stan" || Tip_nekretnine === "Kuća") {
        tableName = "Nekretnina_kupnja";
        typeFolder = "kupnja"; // Changed to main category folder
    } else if (Tip_nekretnine === "Najam stana" || Tip_nekretnine === "Najam kuće") {
        tableName = "Nekretnina_najam";
        typeFolder = "najam"; // Changed to main category folder
    } else {
        // LOGIRANJE: Prijavite ako Tip_nekretnine nije validan
        console.error("Greška: Nevažeći Tip_nekretnine je primljen. Nije moguće odrediti ciljnu tablicu za brisanje:", Tip_nekretnine);
        return res.status(400).send("Nevažeći Tip_nekretnine je pružen. Nije moguće odrediti ciljnu tablicu za brisanje.");
    }

    // LOGIRANJE: Potvrdite određenu tablicu
    console.log("Određena tablica za brisanje:", tableName);
    console.log("Određena mapa za brisanje slika:", typeFolder);

    // Prvo, dohvatite imena datoteka slika iz baze prije brisanja zapisa
    const selectQuery = `SELECT Slika_nekretnine, Slika_nekretnine_2, Slika_nekretnine_3 FROM ${tableName} WHERE Sifra_nekretnine = ?`;
    const imageResults = await executeQuery(selectQuery, [sifra_nekretnine]);
    
    // LOGIRANJE: Provjerite rezultate dohvaćanja slika
    console.log("Rezultati dohvaćanja slika iz baze:", imageResults);

    // Izbrišite zapis iz baze podataka
    const deleteQuery = `DELETE FROM ${tableName} WHERE Sifra_nekretnine = ?`;
    const results = await executeQuery(deleteQuery, [sifra_nekretnine]);
    
    // LOGIRANJE: Provjerite rezultat brisanja iz baze
    console.log("Rezultati brisanja iz baze (affectedRows):", results.affectedRows);

    if (results.affectedRows > 0) {
      // Ako je zapis uspješno obrisan iz baze, obrišite i fizičke datoteke slika
      if (imageResults.length > 0) {
        const imagesToDelete = [
          imageResults[0].Slika_nekretnine,
          imageResults[0].Slika_nekretnine_2,
          imageResults[0].Slika_nekretnine_3
        ].filter(Boolean); // Filtriraj null vrijednosti

        // LOGIRANJE: Popis slika za brisanje
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
      // LOGIRANJE: Ako nekretnina nije pronađena
      console.log("Nekretnina nije pronađena u tablici:", tableName, "sa Sifra_nekretnine:", sifra_nekretnine);
      res.status(404).send("Nekretnina nije pronađena.");
    }
  } catch (error) {
    console.error("Greška prilikom brisanja nekretnine:", error);
    res.status(500).send("Došlo je do pogreške prilikom brisanja nekretnine.");
  }
});


module.exports = app;