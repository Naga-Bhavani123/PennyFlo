const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { compare, hash } = require("bcrypt");
const { sign, verify } = require("jsonwebtoken");
const { join } = require("path");
const destinationPath = join(__dirname, "noBroker.db");
let db = null;

const initialize = async () => {
  try {
    db = await open({
      filename: destinationPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => console.log("server is started"));
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

initialize();

const Authentication = async (request, response, next) => {
  const { headers } = request;
  const Authorization = headers.authorization;
  if (Authorization === undefined) {
    response.status(401);
    response.send("Login To Access");
  } else {
    const token = Authorization.split(" ")[1];
    verify(token, "SECRETE_KEY", (error, payloads) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.email = payloads.email;

        next();
      }
    });
  }
};

const checkSellerOrNot = async (request, response, next) => {
  const { email } = request;
  console.log(email);
  const queryForCheckingUser = `SELECT * FROM USER WHERE email = '${email}'`;
  const data = await db.get(queryForCheckingUser);
  const { id, role } = data;
  console.log(role);
  if (role !== "seller") {
    response.status(400);
    response.send("Only seller can update");
  } else {
    request.id = id;
    next();
  }
};

app.post("/register/", async (request, response) => {
  try {
    const { name, mobile, email, password, role } = request.body;
    let queryForCheckingUser = `SELECT * 
        from User 
        WHERE email = '${email}'`;

    const data = await db.get(queryForCheckingUser);

    if (data === undefined) {
      if (password.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await hash(password, 10);
        const queryForInsertingData = `INSERT INTO USER 
          (name, mobile, email, password, role)
          VALUES('${name}', '${mobile}', '${email}', '${encryptedPassword}', '${role}')`;
        await db.run(queryForInsertingData);
        response.send("User created successfully");
      }
    } else {
      response.status(400);
      response.send("User already exists");
    }
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/login/", async (request, response) => {
  try {
    const { email, password } = request.body;
    let queryForCheckingUser = `SELECT * 
        from User 
        WHERE email = '${email}'`;

    const data = await db.get(queryForCheckingUser);

    if (data === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const encryptedPassword = data.password;
      console.log(encryptedPassword);
      const isValidPassword = await compare(password, encryptedPassword);
      console.log(isValidPassword);
      if (isValidPassword) {
        const payloads = { email: email };
        const token = sign(payloads, "SECRETE_KEY");
        response.send({ token });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
});

app.post(
  "/property/",
  Authentication,
  checkSellerOrNot,
  async (request, response) => {
    try {
      const { id, body } = request;
      const { location, cost, noOfRooms, status } = body;

      const queryForInsertingProperty = `INSERT INTO PROPERTY (location, cost, no_of_rooms, status, owner)
      VALUES('${location}', ${cost}, ${noOfRooms}, '${status}', ${id})`;

      await db.run(queryForInsertingProperty);

      response.send("Property Successfully Added");
    } catch (error) {
      console.log(error.message);
    }
  }
);

app.get("/property/", Authentication, async (request, response) => {
  try {
    const queryGettingMaxAndMinValues = `SELECT max(no_of_rooms) as maxRooms, min(no_of_rooms) as minRooms, max(cost) as maxCost, min(cost) as minCost FROM property`;
    const data = await db.get(queryGettingMaxAndMinValues);

    const {
      location = "",
      order_by = "ASC",
      order = "cost",
      max_rooms = data.maxRooms,
      min_rooms = data.minRooms,
      max_cost = data.maxCost,
      min_cost = data.minCost,
      status = "available",
    } = request.query;
    console.log(min_rooms);
    const queryGettingProperties = `SELECT * FROM PROPERTY 
    WHERE location LIKE '%${location}%' and no_of_rooms BETWEEN ${
      min_rooms - 1
    } AND ${max_rooms} and cost BETWEEN ${
      min_cost - 1
    } AND ${max_cost} and status = '${status}' 
    ORDER BY ${order} ${order_by};
    `;
    const propertiesData = await db.all(queryGettingProperties);
    response.send(propertiesData);
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/property/:id", Authentication, async (request, response) => {
  try {
    const { id } = request.params;
    const queryToGetEntity = `SELECT * FROM PROPERTY WHERE id = ${id}`;
    const data = await db.get(queryToGetEntity);
    response.send(data);
  } catch (error) {
    console.log(error.message);
  }
});

app.put(
  "/property/:id",
  Authentication,
  checkSellerOrNot,
  async (request, response) => {
    try {
      const userId = request.id;
      const { id } = request.params;

      const queryToIdInfo = `SELECT * FROM PROPERTY WHERE id = ${id}`;

      const data = await db.get(queryToIdInfo);
      console.log(typeof data.owner);
      // const {location, cost, no_of_rooms, status, owner} = data

      if (parseInt(data.owner) !== userId) {
        response.status(400);
        response.send("Only owner can change");
      } else {
        const {
          location = data.location,
          cost = data.cost,
          noOfRooms = data.no_of_rooms,
          status = data.status,
          owner = data.owner,
        } = request.body;

        const queryToUpdateProperty = `UPDATE PROPERTY SET location = '${location}', cost = ${cost}, no_of_rooms = ${noOfRooms}, status = '${status}'
            WHERE id = ${id}`;

        await db.run(queryToUpdateProperty);

        response.send("Property is updated");
      }
    } catch (error) {
      console.log(error.message);
    }
  }
);

app.delete(
  "/property/:id",
  Authentication,
  checkSellerOrNot,
  async (request, response) => {
    try {
      const userId = request.id;
      const { id } = request.params;

      const queryToIdInfo = `SELECT * FROM PROPERTY WHERE id = ${id}`;

      const data = await db.get(queryToIdInfo);
      console.log(typeof data.owner);
      // const {location, cost, no_of_rooms, status, owner} = data

      if (parseInt(data.owner) !== userId) {
        response.status(400);
        response.send("Only owner can delete");
      } else {
        const queryDeleteProperty = `DELETE FROM PROPERTY 
          WHERE id = ${id}`;

        await db.run(queryDeleteProperty);
        response.send("Property has Deleted");
      }
    } catch (error) {
      console.log(error.message);
    }
  }
);
