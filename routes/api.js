const express = require("express");
const router = express.Router();
const mongo = require("../MongoDriver");
const {
  ObjectID
} = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
// const shell = require("shelljs");
const { spawn } = require("child_process");
const authenticate = require('../utils/auth_middleware')
const { createHash } = require('crypto');

const okCode = 200;
const clientReqHasProblem = 400;
const serverErrorCode = 500;

function costumeHash(string) {
  return createHash('sha256').update(string).digest('hex');
}

async function decriptUserFromToken(userToken) {
  let decodedUserData = await jwt.decode(userToken);
  delete decodedUserData.iat;
  delete decodedUserData.exp;
  return decodedUserData;
}

router.post("/test", async (req, res, next) => {
  //test insertOne
  // let result = await mongo.insertOne('users', {
  //   name: 'aa'
  // });

  //test insertArr
  // let result = await mongo.insertArr('users', [{
  //   name: 'aa'
  // }, {
  //   name: 'bb'
  // }]);

  //test deleteOne
  // let result = await mongo.deleteOne('users', {
  //   name: 'aa'
  // });

  //test deleteArr
  // let result = await mongo.deleteArr('users', [{
  //   name: 'aa'
  // },
  // {
  //   name: 'bb'
  // }]);


  //test findOne
  // let result = await mongo.findOne('users', {
  //   name: 'aa'
  // });

  //test findAll
  // let result = await mongo.findAll('users');

  //test findAll with object
  // let result = await mongo.findAll('users', {
  //   name: 'aa'
  // });

  //test UpdateOne
  let result = await mongo.updateOne('users', { username: 'aaa' }, { username: 'aa' });

  res.send(result);
});

router.get("/test2", async (req, res, next) => {
  let user = await mongo.findOne('users', { username: 'admin' }, includeId=true);
  // console.log(user.data.result);
  let userToken = await jwt.sign({ 'id': user.data.result._id, 'username': user.data.result.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_TOKEN_EXPIRATION })
  // console.log(userToken);
  let result = await decriptUserFromToken(userToken);
  // console.log(result);
  let findTest = await mongo.findOne('users', { _id: user.data.result._id }, includeId=true);
  console.log(findTest.data.result);
  res.send(result);
});






/***************** Authentication Test API *****************/
router.post("/au-test", authenticate, async (req, res, next) => {
  res.send('All Good!');
});

/***************** Access Control API *****************/

/* POST users listing. */
router.post("/login", async (req, res, next) => {
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    password: req.body.password,
    email: req.body.email
  };
  if (attemptingUser.email != null && attemptingUser.email != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1) {
    let result = await mongo.findOne('users', { email: attemptingUser.email }, includeId=true);
    if (result["success"] && result["data"] != null) {
      const user = result["data"];
      const match = await bcrypt.compare(attemptingUser.password, user.password);
      if (match) {
        const accessToken = await jwt.sign({ 'id': user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_TOKEN_EXPIRATION });
        resultsToSend["success"] = true;
        resultsToSend["data"] = "login success";
        resultsToSend["token"] = accessToken;
        res.send(resultsToSend);
      } else {
        resultsToSend["data"] = "Invalid email or password";
        res.send(resultsToSend);
      }
    }
   else {
    resultsToSend["data"] = "Invalid email or password";
    res.send(resultsToSend);
  }}
 
  // res.status((result["success"]) ? okCode : serverErrorCode).send(resultsToSend);
});

/* POST register new user. */
router.post("/register", async (req, res, next) => {
  let resultsToSend = {
    success: false,
    data: ""
  };
  let attemptingUser = {
    username: req.body.userName,
    password: req.body.password,
    email: req.body.email,
    is_admin: false,
    api_keys: req.body.apiKeys
  };

  if (attemptingUser.username != null && attemptingUser.username != '' &&
    attemptingUser.password != null && attemptingUser.password.length > 1 &&
    attemptingUser.email != null && attemptingUser.email.indexOf('@') != -1 &&
    attemptingUser.api_keys != null) {
    let usernameResult = await mongo.findOne('users', { username: attemptingUser.username });
    if (usernameResult["success"] && usernameResult["data"] != null) {
      resultsToSend["data"] = "Username is already taken";
    }
    if (resultsToSend["data"] === '') {
      let emailResult = await mongo.findOne('users', { email: attemptingUser.email });
      if (emailResult["success"] && emailResult["data"] != null) {
        resultsToSend["data"] = "User is already created for this Email";
      }
      if (resultsToSend["data"] === '') {
        const salt = await bcrypt.genSalt(10);
        const hashPass = await bcrypt.hash(attemptingUser.password, salt);
        attemptingUser.password = hashPass;
        let resultInsertUser = await mongo.insertOne('users', attemptingUser);
        if (resultInsertUser["success"] && resultInsertUser["data"] === "inserted successfully.") {
          // resultsToSend["success"] = true;
          // resultsToSend["data"] = 'User created successfully';
          let findCreatedUser = await mongo.findOne('users', attemptingUser, includeId=true);
          let userIndexes = {
            user_id: findCreatedUser.data.result._id,
            indexes: []
          };
          let resultInsertUserIndexes = await mongo.insertOne('users_indexes', userIndexes);
          if (resultInsertUserIndexes["success"] && resultInsertUserIndexes["data"] === "inserted successfully.") {
            resultsToSend["success"] = true;
            resultsToSend["data"] = 'User created successfully';
          } else {
            resultsToSend["data"] = resultInsertUserIndexes["data"];
          }
        } else {
          resultsToSend["data"] = resultInsertUser["data"];
        }
        res.send(resultsToSend);
      } else {
        res.send(resultsToSend);
      }
    } else {
      res.send(resultsToSend);
    }
  } else {
    resultsToSend["data"] = "Invalid username or password";
    res.send(resultsToSend);
  }
  // res.status((result["success"]) ? okCode : serverErrorCode).send(resultsToSend);
});

/* DELETE users from the database. */
router.post("/delete-users", (req, res, next) => {
  // let resultsToSend = {
  //   success: false,
  //   data: ""
  // };
  mongo.deleteArr(req.query.usersToDelete, "users").then((result) => {
    // if (result["success"]) {
    // resultsToSend["success"] = true;
    // resultsToSend["data"] = result.data;
    // res.send(resultsToSend);
    // }
    res.send(result);
  }).catch((err) => {
    res.send(err);
  });
});

/* GET all of the users from the database. */
router.get("/users-list", async (req, res, next) => {
  let result = await mongo.findAll('users');
  res.send(result);
});

/***************** Execute *****************/
//example to pas dict from js to python
router.post("/create-new-index", async (req, res, next) => {
  let data = JSON.parse(req.body.data);
  console.log(data);

  let index_hash = costumeHash(JSON.stringify(data.symbolToPrice));
  console.log(index_hash);
  let isIndexExist = await mongo.findAll('indexes', { index_hash: index_hash });

  //TODO: replace 231+232 with 234
  const userTokenTemp = new ObjectID('62a118fc71d51e9b0469eb00');
  let userFromToken = { 'id': userTokenTemp, 'username': 'admin' };
  
  // let userFromToken = await decriptUserFromToken(data.userToken);

  // wait for resiter and sing in operations
  // TODO: change later to find user by id from the userToken
  let userFromUsersIndexes = await mongo.findOne('users_indexes', { user_id: userFromToken.id }, includeId=true);
  let isUserIndexNameExist = await mongo.findOne('users_indexes', { user_id: userFromToken.id, indexes: {$elemMatch: {name: data.indexName}} }, includeId=true);
  let isUserIndexExist = await mongo.findOne('users_indexes', { user_id: userFromToken.id, indexes: {$elemMatch: {index_hash: index_hash}} }, includeId=true);
  if(isIndexExist.success) {
    /*
      index already exist
    */
    //create or update users_indexes by user_id
    if(userFromUsersIndexes.success) {
      if (!isUserIndexNameExist.success) {
        if (!isUserIndexExist.success) {
          //user found and index is not created and index name is not created by him
          userFromUsersIndexes.data.result.indexes.push({
            index_hash: index_hash,
            name: data.indexName,
            is_private: true
          });
          let updateUserIndexes = await mongo.updateOne('users_indexes', { user_id: userFromToken.id }, {indexes: userFromUsersIndexes.data.result.indexes}, includeId=true);
          if (updateUserIndexes["success"] && updateUserIndexes["data"]["modifiedCount"] === 1) {
            res.status(okCode).send();
          } else {
            res.status(serverErrorCode).send();
          }
        } else {
          //index is already created by him
          res.statusMessage = "You have already created this Index.";
          res.status(clientReqHasProblem).send();
        }
      } else {
        //index name already taken
        res.statusMessage = "This Index name is already taken.";
        res.status(clientReqHasProblem).send();
      }
    } else {
      //user not found
      res.statusMessage = "This user has a problem, try to contact us for support.";
      res.status(clientReqHasProblem).send();
    }
  } else {
    /*
      first time creating the index
    */
      let result = await mongo.insertOne('indexes', {
        index_hash: index_hash,
        creator_username: userFromToken.username,
        symbols_weight: data.symbolToPrice
      });  
      if(result.success) {
        //user found and index is not created
        userFromUsersIndexes.data.result.indexes.push({
          index_hash: index_hash,
          name: data.indexName,
          is_private: true
        });
        let updateUserIndexes = await mongo.updateOne('users_indexes', { user_id: userFromToken.id }, {indexes: userFromUsersIndexes.data.result.indexes}, includeId=true);
        if (updateUserIndexes["success"] && updateUserIndexes["data"]["modifiedCount"] === 1) {
          res.status(okCode).send();
        } else {
          res.status(serverErrorCode).send();
        }
      } else {
        res.status(serverErrorCode).send();
      }
  }
});

router.post("/insert-one-example", (req, res, next) => {
  //test user
  let toInsert = {
    is_admin: true,
    username: "aa",
    password: "Aa123456",
    email: "aa@aa.com",
  };

  //test admin user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   name: "binance",
  //   api_url: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test user
  // let toInsert = {
  //   is_admin: true,
  //   username: "aa",
  //   password: "Aa123456",
  //   email: "aa@aa.com",
  // };

  //test wallet
  // let toInsert = {
  //   user_id: "626d7348d762cf58d0808261",
  //   broker_id: "",
  //   api_token: "",
  //   secret_key: "",
  // };
  let collectionToInsert = "users";
  // let collectionToInsert = "bugs";
  // let collectionToInsert = "todos";
  // let collectionToInsert = "supported_brokers";
  // let collectionToInsert = "wallets";
  // let collectionToInsert = "user_invested_index";
  // let collectionToInsert = "symbols";
  let isCommunity = false;
  // let isCommunity = true;
  mongo.insertOne(toInsert, collectionToInsert, isCommunity);
  res.send(
    "inserted " +
    JSON.stringify(toInsert) +
    " to collection " +
    collectionToInsert +
    " to Community? " +
    isCommunity
  );
});

router.get("/backtest-new-index", (req, res, next) => {
  let data = JSON.parse(req.query.data);
  let initialCash = req.query.initialCash;
  if(!!!initialCash) {
    initialCash = 1000;
  }
  if (data) {
    let python = spawn('python', ['../CryptoIndexer-Server/BacktestCustomIndex.py', JSON.stringify(data), initialCash]);
    let backtestResult = null;
    python.stdout.on("data", (data) => { 
     backtestResult = JSON.parse(data); 
    });
    python.on("close", (code) => {
      console.log('Python finished with code ' + code);
      res.send(backtestResult);
    });
  } else {
    res.send({ "success": False, "data": '' })
  }
});

router.get("/backtest-exist-index", (req, res, next) => {
  //TODO - get the symbols and weights from the mongo then backtest with the cash from the front
  let data = JSON.parse(req.query.data);
  let initialCash = req.query.initialCash;
  if(!!!initialCash) {
    initialCash = 1000;
  }
  if (data) {
    let python = spawn('python', ['../CryptoIndexer-Server/BacktestCustomIndex.py', JSON.stringify(data), initialCash]);
    let backtestResult = null;
    python.stdout.on("data", (data) => { 
     backtestResult = JSON.parse(data); 
    });
    python.on("close", (code) => {
      console.log('Python finished with code ' + code);
      res.send(backtestResult);
    });
  } else {
    res.send({ "success": False, "data": '' })
  }
});

/***************** DataBase Utills API *****************/
router.get("/supported-symbols-list", async (req, res, next) => {  
  let python = spawn('python', ['../CryptoIndexer-Server/GetAllSymbolsInfo.py']);
  let result = {"success": false, "data": 'Python Error'};
  
  python.stderr.setEncoding('utf-8');
  python.stderr.on("data", (data) =>
  {
    console.log(data.toString())
  });
  
  python.stdout.setEncoding('utf-8');
  python.stdout.on("data", (data) => { 
    result = JSON.parse(data); 
  });

  python.on("close", (code) => {
    console.log('Python finished with code ' + code);
    res.send(result);
  });
  // res.send(result)
});

router.get("/home-page-supported-symbols-list", async (req, res, next) => {  
  let python = spawn('python', ['../CryptoIndexer-Server/GetAllSymbolsPrices.py']);
  let result = {"success": false, "data": 'Python Error'};
  
  python.stderr.setEncoding('utf-8');
  python.stderr.on("data", (data) =>
  {
    console.log(data.toString())
  });
  
  python.stdout.setEncoding('utf-8');
  python.stdout.on("data", (data) => { 
    result = JSON.parse(data); 
  });

  python.on("close", (code) => {
    console.log('Python finished with code ' + code);
    res.send(result);
  });
});

router.get("/content", async (req, res, next) => {
  //let result = await mongo.findAll('symbols');
  // res.send(result)

  const tiers = [
    {
      title: 'yotam',
      price: '0',
      description: [
        'This is an example of a description written by the author of the index',
      ],
    },
    {
      title: '1 st',
      subheader: 'Most popular',
      price: '15+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
  
    },
    {
      title: '3 rd',
      price: '10+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
  
    },
    {
      title: 'Nasdaq Crypto Index',
      price: '23+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'Crypto10',
      price: '12+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'Bitwise 10',
      price: '30',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'CRYPTO20',
      price: '22+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'SPBTC',
      price: '2.5+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'DeFi Pulse Index',
      price: '11+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'SPCMC',
      price: '7+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'All Crypto Index',
      price: '8+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
    {
      title: 'Major Crypto Index',
      price: '30+',
      description: [
        'This is an example of a description written by the author of the index',
      ],
      buttonText: 'See more details',
      buttonVariant: 'contained',
    },
  ];
  res.send(tiers)
});





/***************** Home Page API *****************/

router.get("/popular-indexes-list", async (req, res, next) => {
  //test findAll
  // let result = await mongo.findAll('users');

  //test findAll with object
  // let result = await mongo.findAll('users', {
  //   name: 'aa'
  // });

  res.send(result);
})

router.get("/most-successful-users-list", async (req, res, next) => {
  //todo: find the most successful users
  let allIndexes = await mongo.findAll('indexes');
  let top10IndexesByUsersCount = [];
  if(allIndexes.data.count > 0) {
    allIndexes.data.result.map(async (indexObject) => {
      let usersCount = await mongo.findAll('users_indexes', {'indexes.index_hash': indexObject.index_hash});
      top10IndexesByUsersCount.push({indexName: indexObject.name, creator_username: indexObject.creatorUsername, countOfUsers: usersCount["data"].count});
    });
    top10IndexesByUsersCount.sort((a, b) => (a.countOfUsers > b.countOfUsers) ? 1 : -1)
    console.log(top10IndexesByUsersCount.slice(0,10));
    // console.log(result.data[0].api_keys['binance']);
    res.send(top10IndexesByUsersCount.slice(0,10))
  } else {
    res.send(allIndexes);
  }
});

router.get("/own-indexes", async (req, res, next) => {
  let data = JSON.parse(req.query.data);
  //TODO: replace 603+604 with 607
  const userTokenTemp = new ObjectID('62a118fc71d51e9b0469eb00');
  let userFromToken = { 'id': userTokenTemp, 'username': 'admin' };

  // let userFromToken = await decriptUserFromToken(data);

  let indexesToPass = [];
  let userIndexes = await mongo.findOne('users_indexes', { user_id: userFromToken.id });
  if(userIndexes.success) {
    userIndexes = userIndexes.data.result.indexes;
    for (let indexNumber = 0; indexNumber < userIndexes.length; indexNumber++) {
      let indexData = await mongo.findOne('indexes', { index_hash: userIndexes[indexNumber].index_hash });
      if(indexData.success) {
        indexesToPass.push({symbolToPrice: indexData.data.result.symbols_weight, indexName: userIndexes[indexNumber].name});
      } else {
        res.send({success: false, data: indexData.data});
      }
    }
    res.send({success: true, data: indexesToPass})
  } else {
    res.send({success: false, data: userIndexes.data});
  }
});

router.post("/buy-or-sell-index", async function (req, res, next) {
  let resultsToSend = {
    success: false,
    data: ""
  };
  let isExistResult = await mongo.findOne('transactions', 
    {
      userToken: req.body.userToken,
      index_hash: req.body.index_hash,
    });
  if (isExistResult.success && isExistResult.count > 0) {
    let tempFunding = isExistResult.result.funding;
    tempFunding.push(req.body.transactionData);
    let updateResult = await mongo.updateOne('transactions', {
      userToken: req.body.userToken,
      indexName: req.body.indexName,
      fundigs: tempFunding,
    });

    let sumOfFunding = updateResult.fundigs.map(f => sumOfFunding +=f);
    if(sumOfFunding == 0)
    {
      let userIndexes = await mongo.findOne('users_indexes', {name: data});
      userIndexes.indexes = userIndexes.indexes.filter(i => i.hash == req.body.index_hash)
        let result = await mongo.updateOne('users_indexes', {
          userName: req.body.userName,
          indexes: userIndexes.indexes,
        });
    }

    /*************** need to fix after testing returned data object from update one function ***************/
    if (insertResult["success"] && insertResult["data"] === "inserted successfully.") {
      resultsToSend["success"] = true;
      resultsToSend["data"] = 'transaction updated successfully';
    } else {
      resultsToSend["data"] = insertResult["data"];
    }
    res.send(updateResult);


  } else {
    let insertResult = await mongo.insertOne('transactions', {
      userToken: req.body.userToken,
      indexName: req.body.indexName,
      funding: [req.body.transactionData],
    });
    if (insertResult["success"] && insertResult["data"] === "inserted successfully.") {
      resultsToSend["success"] = true;
      resultsToSend["data"] = 'transaction created successfully';
    } else {
      resultsToSend["data"] = insertResult["data"];
    }


    let isUserExistInIserIndexes = await mongo.findOne('users_indexes', 
    {
      username: req.body.username
    });
  if (isUserExistInIserIndexes.success && isUserExistInIserIndexes.count > 0) {
    let tempIndexes = isUserExistInIserIndexes.result.indexes;
    tempIndexes.push(req.body.transactionData);
    let updateResult = await mongo.updateOne('users_indexes', {
      userName: req.query.userName,
      indexes: tempIndexes,
    });
  }
  else{
    let insertUser_index = await mongo.insertOne('users_indexes', {
      userName: req.body.userName,
      indexes: [req.body.transactionData],
    });
  }

  }

  
});


/***************** Admin Page API *****************/

/* GET admins name and password listing. */
router.get("/admins", function (req, res, next) {
  mongo
    .findAdmin(req.query.userName, req.query.password)
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* GET Bugs listing. */
router.get("/reported-bugs", function (req, res, next) {
  mongo
    .findAll("bugs")
    .then(function (result) {
      res.send(result);
    })
    .catch(function (err) {
      res.send(err);
    });
});

/* INSERT bug to the database. */
router.post("/insert-bug", function (req, res, next) {
  mongo.insertOne({
      name: req.query.name,
      subject: req.query.subject,
      description: req.query.description,
      insertDate: req.query.insertDate,
    },
    "bugs"
  ).then(function (result) {
    res.send(result);
  }).catch(function (err) {
    res.send(err);
  });
});

/* DELETE bug from the database. */
router.post("/delete-bugs", function (req, res, next) {
  mongo.deleteArr(req.query._id, "bugs").then(function () {
    mongo.findAll("bugs").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

/* GET To-DOs listing. */
router.get("/todo-list", function (req, res, next) {
  mongo.findAll("ToDo").then(function (result) {
    res.send(result);
  }).catch(function (err) {
    res.send(err);
  });
});

/* INSERT To-Do Item to the database. */
router.post("/insert-todo", function (req, res, next) {
  mongo.insertOne({
      description: req.query.description,
      insertDate: req.query.insertDate,
    },
    "ToDo"
  ).then(function (result) {
    mongo.findAll("ToDo").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

/* DELETE To-Do Item from the database. */
router.post("/delete-todos", function (req, res, next) {
  mongo.deleteArr(req.query._id, "ToDo").then(function () {
    mongo.findAll("ToDo").then(function (result) {
      res.send(result);
    }).catch(function (err) {
      res.send(err);
    });
  }).catch(function (err) {
    res.send(err);
  });
});

module.exports = router;
