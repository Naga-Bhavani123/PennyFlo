// All packages are importing for common js import method
const express = require("express"); // importing the express
const app = express(); // getting instance of the express server
app.use(express.json()); // middleware this will identify the json in request and convert into js object
const { open } = require("sqlite"); // package to provides method to open connection to database
const sqlite3 = require("sqlite3");
const { compare, hash } = require("bcrypt"); // bcrypt package provides functions to perform operations like encryption, comparison, etc
const { sign, verify } = require("jsonwebtoken"); // package used to create and verify the access Token
const { join } = require("path"); // this is core module to join the paths and forms new path
const destinationPath = join(__dirname, "noBroker.db"); // __dirname is variable refers the location of folder where current js file present
let db = null;

// initialize method open connection with database server and starts the server
const initialize = async () => {
  try {
    db = await open({
      filename: destinationPath,
      driver: sqlite3.Database,
    }); // return the promise object after it resolves returns the connection object

    app.listen(3000, () => console.log("server is started")); // starting server and providing port all the request come to 3000 port will be listen by server
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

initialize();

// this method checks weather user is authorized or not
const Authentication = async (request, response, next) => {
  const { headers } = request;
  const Authorization = headers.authorization; // User need to pass token for every subsequent request by that server knowns weather user login or not
  if (Authorization === undefined) {
    response.status(401);
    response.send("Login To Access");
  } else {
    const token = Authorization.split(" ")[1];

    // verify method verifies the jwtToken and if it’s valid, returns payload. Else, it throws an error

    verify(token, "SECRETE_KEY", (error, payloads) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.email = payloads.email; // passing the email through the request because it is unique identity od login user

        next();
      }
    });
  }
};

// checking the seller or not
const checkSellerOrNot = async (request, response, next) => {
  const { email } = request;

  const queryForCheckingUser = `SELECT * FROM USER WHERE email = '${email}'`;
  const data = await db.get(queryForCheckingUser);
  const { id, role } = data;

  if (role !== "seller") {
    // checking user seller or not
    response.status(400);
    response.send("Only seller can update");
  } else {
    request.id = id; // if user is seller passes id through request
    next();
  }
};

// API for registering
app.post("/register/", async (request, response) => {
  try {
    const { name, mobile, email, password, role } = request.body;
    let queryForCheckingUser = `SELECT * 
        from User 
        WHERE email = '${email}'`; // query for getting user data which match's email.

    const data = await db.get(queryForCheckingUser);

    // used get method because this will return only specific row
    // checking user exist or not if true the data will contains object else undefined

    if (data === undefined) {
      if (password.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        // if password greater than 5 and user not exist then new user will be registered
        const encryptedPassword = await hash(password, 10); // In order to avoid misusage of password hash method will convert password to encrypted password
        const queryForInsertingData = `INSERT INTO USER 
          (name, mobile, email, password, role)
          VALUES('${name}', '${mobile}', '${email}', '${encryptedPassword}', '${role}')`; // query for inserting data
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

// API for Login
app.post("/login/", async (request, response) => {
  try {
    const { email, password } = request.body; // destructing email and password
    let queryForCheckingUser = `SELECT * 
        from User 
        WHERE email = '${email}'`;

    const data = await db.get(queryForCheckingUser);

    // if email match's it will return object else undefined
    // only registered user can login. if user registered then email exist in User table

    if (data === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const encryptedPassword = data.password;
      console.log(encryptedPassword);
      const isValidPassword = await compare(password, encryptedPassword); // comparing user written password with encrypted password this will return true or false.

      if (isValidPassword) {
        const payloads = { email: email };
        const token = sign(payloads, "SECRETE_KEY"); //sign method takes 2 arguments payloads and secrete_key
        // payloads contains unique identity
        response.send({ token }); // passing access token for every subsequent request is enough because token as payloads object which contains users information
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
});

// Posting new property
app.post(
  "/property/",
  Authentication,
  checkSellerOrNot,
  async (request, response) => {
    try {
      const { id, body } = request; // accessing id of property owner to give for owner field
      const { location, cost, noOfRooms, status } = body;

      const queryForInsertingProperty = `INSERT INTO PROPERTY (location, cost, no_of_rooms, status, owner)
      VALUES('${location}', ${cost}, ${noOfRooms}, '${status}', ${id})`; // query for inserting the new property

      await db.run(queryForInsertingProperty);

      response.send("Property Successfully Added");
    } catch (error) {
      console.log(error.message);
    }
  }
);

// API for getting properties from properties table
app.get("/property/", Authentication, async (request, response) => {
  try {
    const queryGettingMaxAndMinValues = `SELECT max(no_of_rooms) as maxRooms, min(no_of_rooms) as minRooms, max(cost) as maxCost, min(cost) as minCost FROM property`;
    const data = await db.get(queryGettingMaxAndMinValues);

    //getting maxRooms, minRooms, maxCost, minCost to provide as values for default properties
    //Using default properties because if query parameters didn't pass than its value will be undefined
    //if minCost and maxCost is not passed then default values will be referred

    const {
      location = "",
      order_by = "ASC",
      order = "cost",
      max_rooms = parseInt(data.maxRooms),
      min_rooms = parseInt(data.minRooms),
      max_cost = parseInt(data.maxCost),
      min_cost = parseInt(data.minCost),
      status = "available",
    } = request.query; // query parameters are used for sorting and filtering

    const queryGettingProperties = `SELECT * FROM PROPERTY 
    WHERE location LIKE '%${location}%' and no_of_rooms BETWEEN ${min_rooms} AND ${max_rooms} and cost BETWEEN ${min_cost} AND ${max_cost} and status = '${status}' 
    ORDER BY ${order} ${order_by};
    `; // query for getting the properties
    const propertiesData = await db.all(queryGettingProperties);
    response.send(propertiesData);
  } catch (error) {
    console.log(error.message);
  }
});

// API for getting the specific
app.get("/property/:id", Authentication, async (request, response) => {
  try {
    const { id } = request.params;

    // using path parameters because according to REST API'S principles
    // when want to identify the specific resources we need to id through path parameters

    const queryToGetEntity = `SELECT * FROM PROPERTY WHERE id = ${id}`;
    const data = await db.get(queryToGetEntity);
    response.send(data);
  } catch (error) {
    console.log(error.message);
  }
});

// API for updating
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
      // getting property because to check user is property owner or not because property owner can only update
      // And for to provide values to default properties because we don't what owner want to update

      if (data.owner !== userId) {
        response.status(400);
        response.send("Only owner can change");
      } else {
        const {
          location = data.location,
          cost = data.cost,
          noOfRooms = data.no_of_rooms,
          status = data.status,
          owner = data.owner,
        } = request.body; // destructuring the body

        const queryToUpdateProperty = `UPDATE PROPERTY SET location = '${location}', cost = ${cost}, no_of_rooms = ${noOfRooms}, status = '${status}'
            WHERE id = ${id}`; // query for updating

        await db.run(queryToUpdateProperty);

        response.send("Property is updated");
      }
    } catch (error) {
      console.log(error.message);
    }
  }
);

// API for deleting
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

      if (parseInt(data.owner) !== userId) {
        // only owner can delete the property
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
