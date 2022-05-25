const exportMongo = new Object();
const {
  MongoClient,
  ObjectID
} = require("mongodb");

// const systemCollectionsList = {
//   users: "users",
//   bugs: "bugs",
//   todo: "todos",
//   supportedBrokers: "supported_brokers",
//   wallets: "wallets",
//   userInvestedIndexes: "user_invested_index",
//   symbols: "symbols",
// };

const client = new MongoClient(process.env.DATABASE_URL);
const mainDB = 'CryptoIndexer-SystemDB';
const communityDB = 'CryptoIndexer-CommunityDB';

//insert one document to the db
exportMongo.insertOne = async (collection, document, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };

  try {
    await client.connect();
    await client.db(isCommunity ? communityDB : mainDB).collection(collection).insertOne(document);
    resultsToSend["success"] = true;
    resultsToSend["data"] = 'inserted successfully.';
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//insert arr of documents to the db
exportMongo.insertArr = async (collection, documents, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };

  // this option prevents additional documents from being inserted if one fails
  const options = {
    ordered: true
  };
  try {
    await client.connect();
    await client.db(isCommunity ? communityDB : mainDB).collection(collection).insertMany(documents, options);
    resultsToSend["success"] = true;
    resultsToSend["data"] = 'inserted successfully.';
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//delete one document feom the db
exportMongo.deleteOne = async (collection, document, isCommunity = false, isConnected = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };

  try {
    if (!isConnected) {
      await client.connect();
    }
    const result = await client.db(isCommunity ? communityDB : mainDB).collection(collection).deleteOne(document);
    if (result.deletedCount === 1) {
      resultsToSend["success"] = true;
      resultsToSend["data"] = 'deleted successfully.';
    } else {
      resultsToSend["data"] = 'Could not found this object.';
    }
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//delete arr of documents from the db
exportMongo.deleteArr = async (collection, documentsArr, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };

  try {
    await client.connect();
    const result = await documentsArr.map(async (document) => {
      await exportMongo.deleteOne(collection, document, isCommunity, true);
    })
    // await client.db(isCommunity ? communityDB : mainDB).collection(collection).deleteMany(documentIDArr);
    // resultsToSend["success"] = true;
    resultsToSend["data"] = 'deleted successfully.';
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//find one document from one of the collections in the db
exportMongo.findOne = async (collection, objectToFind, options = {}, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };
  let optionsWithProjection = options
  optionsWithProjection['projection'] = {
    _id: 0
  };

  try {
    await client.connect();
    const result = await client.db(isCommunity ? communityDB : mainDB).collection(collection).findOne(objectToFind, optionsWithProjection);
    resultsToSend["success"] = true;
    resultsToSend["data"] = result;
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//find all the docs from a specified collection from the db
exportMongo.findAll = async (collection, objectToFind = {}, options = {}, sort = {}, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };
  let optionsWithProjection = options
  optionsWithProjection['projection'] = {
    _id: 0
  };

  try {
    await client.connect();
    const result = await client.db(isCommunity ? communityDB : mainDB).collection(collection).find(objectToFind, optionsWithProjection).sort(sort).toArray();
    if ((await result.length) === 0) {
      resultsToSend["data"] = { result: 'No documents found!', count: 0 };
    } else {
      resultsToSend["success"] = true;
      resultsToSend["data"] = { result: result, count: result.length };
    }
  } catch (e) {
    resultsToSend["data"] = { result: e.toString() };
  } finally {
    await client.close();
    return resultsToSend;
  }
};

//find one document from one of the collections in the db
exportMongo.updateOne = async (collection, objectToFind, options = {}, isCommunity = false) => {
  let resultsToSend = {
    success: false,
    data: ''
  };
  let optionsWithProjection = options
  optionsWithProjection['projection'] = {
    _id: 0
  };

  try {
    await client.connect();
    const result = await client.db(isCommunity ? communityDB : mainDB).collection(collection).updateOne(objectToFind, optionsWithProjection);
    resultsToSend["success"] = true;
    resultsToSend["data"] = result;
  } catch (e) {
    resultsToSend["data"] = e.toString();
  } finally {
    await client.close();
    return resultsToSend;
  }
};






//drop collection
exportMongo.dropCollection = function dropCollection(collection, isCommunity) {
  var url = isCommunity ? communityUrl : mainUrl;
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, function (err, db) {
      if (err != null) reject(err);
      else {
        db.collection(collection).drop(function (err) {
          db.close();
          if (err != null) reject(err);
          console.log("Collection dropped");
          resolve();
        });
      }
    });
  });
};

//check DB status
exportMongo.adminHomeStatus = function adminHomeStatus() {
  var bugsNum = -1,
    TodoNum = -1,
    scanReportNum = -1;
  return new Promise(function (resolve, reject) {
    MongoClient.connect(mainUrl, function (err, db) {
      if (err != null)
        reject({
          msg: "Couldn't connect to the Database.",
          color: "2",
          bugsNum: bugsNum,
          TodoNum: "-1",
          scanReport: scanReportNum,
        });
      else {
        new Promise(function (resolve, reject) {
            db.collection("bugs").count({}, function (err, result) {
              if (err != null) reject();
              else {
                bugsNum = result;
                resolve();
              }
            });
          }).then(function () {
            new Promise(function (resolve, reject) {
                db.collection("ToDo").count({}, function (err, result) {
                  if (err != null) reject();
                  else {
                    TodoNum = result;
                    resolve();
                  }
                });
              })
              .then(function () {
                db.collection("ScanReports").count({}, function (err, result) {
                  if (err != null) reject();
                  else {
                    scanReportNum = result;
                    resolve({
                      msg: "פעיל",
                      color: "3",
                      bugsNum: bugsNum,
                      TodoNum: TodoNum,
                      scanReport: scanReportNum,
                    });
                  }
                });
              })
              .catch(function () {
                reject();
              });
          })
          .catch(function () {
            reject({
              msg: "כבוי",
              color: "2",
              bugsNum: bugsNum,
              TodoNum: TodoNum,
              scanReport: scanReportNum,
            });
          });
      }
    });
  });
};

//find all the collections from the system db
exportMongo.findCollectionsNameList = function findCollectionsNameList(isCommunity) {
  var arr = [],
    i;
  var url = isCommunity ? communityUrl : mainUrl;
  return new Promise(function (resolve, reject) {
    var count = 0;
    MongoClient.connect(url, function (err, db) {
      if (err != null) reject(err);
      else {
        db.collections().then(function (collections) {
          for (i = 0; i < collections.length; i++) {
            if (
              !(
                collections[i].s.name == "Admins" ||
                collections[i].s.name == "Bugs" ||
                collections[i].s.name == "ToDo" ||
                collections[i].s.name == "ScanReports"
              )
            ) {
              arr[count] = {
                name: collections[i].s.name
              };
              count++;
            }
          }
          db.close();
          if (err != null) reject(err);
          resolve(arr);
        });
      }
    });
  });
};

//find only the Admin collection from the db if exist
exportMongo.findAdminCollection = function findAdminCollection() {
  var collection = "",
    i;
  return new Promise(function (resolve, reject) {
    MongoClient.connect(mainUrl, function (err, db) {
      if (err != null) reject(err);
      else {
        db.collections().then(function (collections) {
          for (i = 0; i < collections.length; i++) {
            if (collections[i].s.name == "Admins")
              collection = {
                name: collections[i].s.name
              };
          }
          db.close();
          if (err != null) reject(err);
          resolve(collection);
        });
      }
    });
  });
};


module.exports = exportMongo;